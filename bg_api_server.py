"""
배경 제거 전용 API 서버 (FastAPI + rembg)

요구사항 반영:
- Windows PC에서 실행 가능한 서비스 연동용 API
- rembg 세션 재사용 (요청마다 세션 생성 금지)
- GPU 우선, 실패 시 CPU fallback
- 단일/배치(최대 4장) 처리
- CORS 허용 (Vercel 프론트 연동)
- 모든 에러를 JSON으로 반환

실행 예시(Windows PowerShell):
  uvicorn bg_api_server:app --host 127.0.0.1 --port 8000 --workers 1

Cloudflare Tunnel로 외부 공개 예정이라면,
서버는 로컬 127.0.0.1:8000에 띄운 뒤 cloudflared를 별도 실행하세요.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import zipfile
from dataclasses import dataclass
from typing import Any, Literal

import onnxruntime as ort
from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from rembg import new_session, remove

# -----------------------------------------------------------------------------
# 환경설정
# -----------------------------------------------------------------------------

APP_NAME = "bg-remove-api"
APP_VERSION = "1.0.0"

# rembg 모델. 인물 + 일반 객체 분리에 폭넓게 쓰이는 기본값.
RMBG_MODEL_NAME = os.getenv("RMBG_MODEL_NAME", "isnet-general-use")

# 업로드 1개당 최대 용량 제한(바이트). 과도한 메모리 점유 방지.
MAX_UPLOAD_BYTES = int(os.getenv("RMBG_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))

# 배치 업로드 최대 개수 (요구사항: 최대 4장)
MAX_BATCH_FILES = int(os.getenv("RMBG_MAX_BATCH_FILES", "4"))

# 긴 변 리사이즈 기본값.
# 1536 선택 이유:
# - 3060 Ti(8GB)에서 배치 최대 4장 처리 시 메모리 안전성이 좋음
# - 품질 저하를 크게 만들지 않으면서 추론 시간 단축 효과가 큼
MAX_LONG_EDGE = int(os.getenv("RMBG_MAX_LONG_EDGE", "1536"))

# CORS
# Vercel preview/prod 대응을 위해 allow_origin_regex를 같이 사용.
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("RMBG_CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS)).split(",")
    if origin.strip()
]
CORS_ORIGIN_REGEX = os.getenv("RMBG_CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")

# 로깅
logging.basicConfig(
    level=os.getenv("RMBG_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(APP_NAME)


# -----------------------------------------------------------------------------
# 세션/추론 관리
# -----------------------------------------------------------------------------


@dataclass
class SessionInfo:
    model_name: str
    providers: list[str]


class RembgSessionManager:
    """rembg 세션을 재사용하고, GPU 실패 시 CPU로 안전하게 폴백한다."""

    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self.available_providers = ort.get_available_providers()
        self.ort_device = ort.get_device()

        self.primary_session: Any | None = None
        self.primary_providers: list[str] = []

        self.cpu_session: Any | None = None

    def _build_primary_provider_chain(self) -> list[str]:
        """사용 가능한 provider 목록을 보고 우선순위 체인을 만든다.

        우선순위:
        1) TensorRT
        2) CUDA
        3) CPU
        """

        chain: list[str] = []
        if "TensorrtExecutionProvider" in self.available_providers:
            chain.append("TensorrtExecutionProvider")
        if "CUDAExecutionProvider" in self.available_providers:
            chain.append("CUDAExecutionProvider")
        chain.append("CPUExecutionProvider")
        return chain

    def initialize(self) -> None:
        """서버 시작 시 세션을 미리 만들어 warm-up 비용을 줄인다."""

        self.primary_providers = self._build_primary_provider_chain()

        logger.info("[startup] onnxruntime.get_device(): %s", self.ort_device)
        logger.info("[startup] onnxruntime available providers: %s", self.available_providers)
        logger.info("[startup] primary provider chain: %s", self.primary_providers)
        logger.info("[startup] rembg model: %s", self.model_name)

        # 1) GPU 포함 primary 세션 시도
        try:
            self.primary_session = new_session(
                model_name=self.model_name,
                providers=self.primary_providers,
            )
            logger.info("[startup] primary rembg session initialized")
        except Exception as exc:
            self.primary_session = None
            logger.exception("[startup] primary session init failed: %s", exc)

        # 2) CPU fallback 세션은 항상 별도로 만들어 둔다.
        #    (GPU provider 장애 시 즉시 fallback 가능)
        try:
            self.cpu_session = new_session(
                model_name=self.model_name,
                providers=["CPUExecutionProvider"],
            )
            logger.info("[startup] cpu fallback rembg session initialized")
        except Exception as exc:
            self.cpu_session = None
            logger.exception("[startup] cpu session init failed: %s", exc)

        if self.primary_session is None and self.cpu_session is None:
            raise RuntimeError("rembg session initialization failed for both GPU and CPU")

    @staticmethod
    def _ensure_png_bytes(result: Any) -> bytes:
        """rembg 결과를 PNG bytes로 정규화한다."""

        # rembg에 bytes를 넣으면 보통 bytes가 오지만,
        # 버전/옵션에 따라 PIL.Image 등이 올 수 있어 안전하게 처리한다.
        if isinstance(result, bytes):
            return result

        if isinstance(result, Image.Image):
            out = io.BytesIO()
            result.save(out, format="PNG")
            return out.getvalue()

        # numpy 배열 등 예외 타입 대응
        try:
            img = Image.fromarray(result)
            out = io.BytesIO()
            img.save(out, format="PNG")
            return out.getvalue()
        except Exception as exc:
            raise RuntimeError(f"Unexpected rembg result type: {type(result)}") from exc

    @staticmethod
    def _remove_with_session(image_bytes: bytes, session: Any) -> bytes:
        """세션 1개로 제거 실행. rembg 버전 차이를 흡수한다."""

        try:
            # 최신 rembg에서는 force_return_bytes를 받을 수 있다.
            result = remove(image_bytes, session=session, force_return_bytes=True)
        except TypeError:
            # 일부 버전 호환용 fallback
            result = remove(image_bytes, session=session)

        return RembgSessionManager._ensure_png_bytes(result)

    def remove_background(self, image_bytes: bytes) -> tuple[bytes, str]:
        """primary -> cpu 순으로 시도하여 제거한다."""

        primary_is_cpu_only = self.primary_providers == ["CPUExecutionProvider"]

        if self.primary_session is not None:
            try:
                png = self._remove_with_session(image_bytes, self.primary_session)
                mode = "primary"
                if primary_is_cpu_only:
                    mode = "cpu-primary"
                return png, mode
            except Exception as exc:
                logger.exception("primary session remove failed, will fallback to CPU: %s", exc)

        if self.cpu_session is not None:
            try:
                png = self._remove_with_session(image_bytes, self.cpu_session)
                return png, "cpu-fallback"
            except Exception as exc:
                logger.exception("cpu fallback remove failed: %s", exc)

        raise RuntimeError("Background removal failed on both primary and CPU sessions")


session_manager = RembgSessionManager(model_name=RMBG_MODEL_NAME)


# -----------------------------------------------------------------------------
# 유틸리티
# -----------------------------------------------------------------------------


def _is_allowed_content_type(upload: UploadFile) -> bool:
    ctype = (upload.content_type or "").lower().strip()
    return ctype.startswith("image/")


async def _read_upload_bytes(upload: UploadFile) -> bytes:
    raw = await upload.read()

    if not raw:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"파일 용량이 너무 큽니다. 최대 {MAX_UPLOAD_BYTES // (1024 * 1024)}MB 허용",
        )

    return raw


def _load_and_normalize_image(raw: bytes, filename: str | None = None) -> Image.Image:
    """이미지 유효성 검증 + EXIF 보정 + RGBA 변환.

    - 이미지가 아니면 400
    - EXIF 회전값 반영
    - 알파 채널 보존을 위해 최종 RGBA 사용
    """

    try:
        img = Image.open(io.BytesIO(raw))
        img = ImageOps.exif_transpose(img)
        img.load()  # 디코딩 강제(오류 조기 감지)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="이미지 파일이 아닙니다.") from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail="손상되었거나 읽을 수 없는 이미지입니다.") from exc

    return img.convert("RGBA")


def _resize_by_long_edge(img: Image.Image, max_long_edge: int = MAX_LONG_EDGE) -> tuple[Image.Image, bool]:
    """긴 변 기준 리사이즈. 메모리/속도 안정화를 위한 핵심 안전장치."""

    w, h = img.size
    long_edge = max(w, h)

    if long_edge <= max_long_edge:
        return img, False

    scale = max_long_edge / float(long_edge)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return resized, True


def _to_png_bytes(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


async def _prepare_image_for_rmbg(upload: UploadFile) -> dict[str, Any]:
    """업로드 파일 하나를 rembg 입력용 PNG bytes로 정규화한다."""

    if not _is_allowed_content_type(upload):
        raise HTTPException(status_code=400, detail="업로드 파일의 content-type이 이미지가 아닙니다.")

    raw = await _read_upload_bytes(upload)
    img = _load_and_normalize_image(raw, filename=upload.filename)
    original_size = img.size

    img, resized = _resize_by_long_edge(img, MAX_LONG_EDGE)
    prepared_png = _to_png_bytes(img)

    return {
        "filename": upload.filename or "image",
        "original_width": original_size[0],
        "original_height": original_size[1],
        "prepared_width": img.size[0],
        "prepared_height": img.size[1],
        "resized": resized,
        "input_png": prepared_png,
    }


def _safe_output_name(filename: str, index: int) -> str:
    base = os.path.basename(filename)
    stem, _ext = os.path.splitext(base)
    if not stem:
        stem = f"image_{index + 1}"
    return f"{stem}_nobg.png"


# -----------------------------------------------------------------------------
# FastAPI 앱
# -----------------------------------------------------------------------------

app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # 서버 시작 시 세션 초기화 + provider 로그 출력
    session_manager.initialize()


@app.exception_handler(HTTPException)
async def _http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    # 모든 HTTPException을 일관된 JSON 스키마로 반환
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "ok": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
            },
        },
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "서버 내부 오류가 발생했습니다.",
            },
        },
    )


@app.get("/health")
def health() -> dict[str, Any]:
    """헬스체크 + provider 상태 확인용 엔드포인트."""

    return {
        "ok": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "model": RMBG_MODEL_NAME,
        "maxBatchFiles": MAX_BATCH_FILES,
        "maxLongEdge": MAX_LONG_EDGE,
        "onnxruntime": {
            "device": ort.get_device(),
            "availableProviders": ort.get_available_providers(),
            "primaryProviderChain": session_manager.primary_providers,
        },
        "session": {
            "primaryReady": session_manager.primary_session is not None,
            "cpuFallbackReady": session_manager.cpu_session is not None,
        },
    }


@app.post("/remove")
async def remove_single(file: UploadFile = File(...)) -> Response:
    """이미지 1장 배경 제거 후 PNG로 반환."""

    prepared = await _prepare_image_for_rmbg(file)
    output_png, mode = session_manager.remove_background(prepared["input_png"])

    headers = {
        "X-RMBG-Mode": mode,
        "X-Prepared-Size": f"{prepared['prepared_width']}x{prepared['prepared_height']}",
        "X-Resized": "1" if prepared["resized"] else "0",
    }

    return Response(content=output_png, media_type="image/png", headers=headers)


@app.post("/remove-batch")
async def remove_batch(
    files: list[UploadFile] = File(...),
    response_type: Literal["json", "zip"] = Query(
        default="json",
        description="json: base64 JSON 응답, zip: PNG 묶음 다운로드",
    ),
) -> Response:
    """이미지 배치 배경 제거. 최대 4장 제한."""

    if not files:
        raise HTTPException(status_code=400, detail="최소 1개 파일이 필요합니다.")

    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"배치 최대 {MAX_BATCH_FILES}장까지 업로드할 수 있습니다.",
        )

    processed_items: list[dict[str, Any]] = []
    zip_entries: list[tuple[str, bytes]] = []

    for index, upload in enumerate(files):
        prepared = await _prepare_image_for_rmbg(upload)
        output_png, mode = session_manager.remove_background(prepared["input_png"])

        out_name = _safe_output_name(prepared["filename"], index)

        processed_items.append(
            {
                "index": index,
                "filename": prepared["filename"],
                "outputFilename": out_name,
                "mimeType": "image/png",
                "mode": mode,
                "originalWidth": prepared["original_width"],
                "originalHeight": prepared["original_height"],
                "preparedWidth": prepared["prepared_width"],
                "preparedHeight": prepared["prepared_height"],
                "resized": prepared["resized"],
                "outputPngBytes": output_png,
            }
        )
        zip_entries.append((out_name, output_png))

    if response_type == "zip":
        mem_zip = io.BytesIO()
        with zipfile.ZipFile(mem_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for name, png_bytes in zip_entries:
                zf.writestr(name, png_bytes)
        mem_zip.seek(0)

        headers = {"Content-Disposition": 'attachment; filename="removed_backgrounds.zip"'}
        return StreamingResponse(mem_zip, media_type="application/zip", headers=headers)

    # 기본값(json): Next.js에서 바로 다루기 쉽도록 base64 포함
    items_for_json: list[dict[str, Any]] = []
    for item in processed_items:
        png_b64 = base64.b64encode(item["outputPngBytes"]).decode("utf-8")
        items_for_json.append(
            {
                "index": item["index"],
                "filename": item["filename"],
                "outputFilename": item["outputFilename"],
                "mimeType": item["mimeType"],
                "mode": item["mode"],
                "originalWidth": item["originalWidth"],
                "originalHeight": item["originalHeight"],
                "preparedWidth": item["preparedWidth"],
                "preparedHeight": item["preparedHeight"],
                "resized": item["resized"],
                "pngBase64": png_b64,
            }
        )

    return JSONResponse(
        {
            "ok": True,
            "count": len(items_for_json),
            "maxBatchFiles": MAX_BATCH_FILES,
            "items": items_for_json,
        }
    )


if __name__ == "__main__":
    # 개발 편의용 직접 실행.
    # 운영 시에는 권장 명령: uvicorn bg_api_server:app --host 127.0.0.1 --port 8000 --workers 1
    import uvicorn

    uvicorn.run("bg_api_server:app", host="127.0.0.1", port=8000, reload=False)
