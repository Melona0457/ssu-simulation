import "server-only";

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_BATCH_FILES = 4;
const timeoutFromEnv = Number(process.env.BG_API_TIMEOUT_MS);
const EFFECTIVE_DEFAULT_TIMEOUT_MS =
  Number.isFinite(timeoutFromEnv) && timeoutFromEnv > 0
    ? Math.round(timeoutFromEnv)
    : DEFAULT_TIMEOUT_MS;

type BgApiErrorPayload = {
  message?: unknown;
  error?: {
    message?: unknown;
  };
};

type BgBatchItemPayload = {
  index?: unknown;
  filename?: unknown;
  outputFilename?: unknown;
  mimeType?: unknown;
  mode?: unknown;
  resized?: unknown;
  pngBase64?: unknown;
};

type BgBatchResponsePayload = {
  ok?: unknown;
  count?: unknown;
  items?: unknown;
};

export type BgRemovedImage = {
  dataUrl: string;
  pngBase64: string;
  mimeType: "image/png";
};

export type BgRemovedBatchItem = {
  index: number;
  filename: string;
  outputFilename: string;
  mimeType: string;
  mode?: string;
  resized?: boolean;
  dataUrl: string;
  pngBase64: string;
};

export type RemoveBackgroundSingleInput = {
  imageBuffer: Buffer;
  filename?: string;
  mimeType?: string;
  timeoutMs?: number;
};

export type RemoveBackgroundBatchInput = {
  images: Array<{
    imageBuffer: Buffer;
    filename?: string;
    mimeType?: string;
  }>;
  timeoutMs?: number;
};

function getBgApiBaseUrl() {
  const raw = process.env.BG_API_URL?.trim();

  if (!raw) {
    throw new Error(
      "BG_API_URL이 설정되지 않았습니다. .env.local 또는 배포 환경변수를 확인해주세요.",
    );
  }

  return raw.replace(/\/+$/, "");
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = EFFECTIVE_DEFAULT_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`누끼 API 요청이 ${timeoutMs}ms 내에 완료되지 않아 타임아웃되었습니다.`);
    }

    throw new Error(
      error instanceof Error
        ? `누끼 API 네트워크 오류: ${error.message}`
        : "누끼 API 네트워크 오류가 발생했습니다.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function extractBgApiErrorMessage(response: Response) {
  const fallback = `누끼 API 요청 실패 (${response.status})`;
  const rawText = await response.text();

  if (!rawText) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawText) as BgApiErrorPayload;
    const jsonMessage =
      typeof parsed.error?.message === "string"
        ? parsed.error.message
        : typeof parsed.message === "string"
          ? parsed.message
          : "";

    if (jsonMessage.trim().length > 0) {
      return `${fallback}: ${jsonMessage.trim()}`;
    }
  } catch {
    // noop
  }

  return `${fallback}: ${rawText.slice(0, 180)}`;
}

function normalizeFilename(filename: string | undefined, fallback: string) {
  const trimmed = filename?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function bufferToBlobPart(buffer: Buffer) {
  // Buffer(ArrayBufferLike) 타입을 DOM BlobPart에 안전하게 맞추기 위해 복사본 Uint8Array를 사용한다.
  return Uint8Array.from(buffer);
}

export async function removeBackgroundSingle({
  imageBuffer,
  filename,
  mimeType,
  timeoutMs,
}: RemoveBackgroundSingleInput): Promise<BgRemovedImage> {
  const baseUrl = getBgApiBaseUrl();
  const formData = new FormData();
  const safeMimeType = mimeType && mimeType.trim().length > 0 ? mimeType.trim() : "image/png";

  formData.append(
    "file",
    new Blob([bufferToBlobPart(imageBuffer)], { type: safeMimeType }),
    normalizeFilename(filename, "image.png"),
  );

  const response = await fetchWithTimeout(
    `${baseUrl}/remove`,
    {
      method: "POST",
      body: formData,
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(await extractBgApiErrorMessage(response));
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("image/png")) {
    throw new Error(`누끼 API 응답 형식이 image/png가 아닙니다. (content-type: ${contentType || "unknown"})`);
  }

  const outputBuffer = Buffer.from(await response.arrayBuffer());
  if (outputBuffer.length === 0) {
    throw new Error("누끼 API에서 빈 PNG 응답을 받았습니다.");
  }

  const pngBase64 = outputBuffer.toString("base64");
  return {
    mimeType: "image/png",
    pngBase64,
    dataUrl: `data:image/png;base64,${pngBase64}`,
  };
}

export async function removeBackgroundBatch({
  images,
  timeoutMs,
}: RemoveBackgroundBatchInput): Promise<BgRemovedBatchItem[]> {
  if (images.length === 0) {
    throw new Error("배치 누끼 요청에는 최소 1장의 이미지가 필요합니다.");
  }

  if (images.length > MAX_BATCH_FILES) {
    throw new Error(`배치 누끼는 최대 ${MAX_BATCH_FILES}장까지 요청할 수 있습니다.`);
  }

  const baseUrl = getBgApiBaseUrl();
  const formData = new FormData();

  images.forEach((image, index) => {
    const safeMimeType =
      image.mimeType && image.mimeType.trim().length > 0 ? image.mimeType.trim() : "image/png";
    const safeFilename = normalizeFilename(image.filename, `image-${index + 1}.png`);

    formData.append(
      "files",
      new Blob([bufferToBlobPart(image.imageBuffer)], { type: safeMimeType }),
      safeFilename,
    );
  });

  const response = await fetchWithTimeout(
    `${baseUrl}/remove-batch?response_type=json`,
    {
      method: "POST",
      body: formData,
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(await extractBgApiErrorMessage(response));
  }

  let parsed: BgBatchResponsePayload;
  try {
    parsed = (await response.json()) as BgBatchResponsePayload;
  } catch {
    throw new Error("누끼 배치 API JSON 파싱에 실패했습니다.");
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("누끼 배치 API 응답에 items 배열이 없습니다.");
  }

  const normalized = parsed.items.map((item, fallbackIndex) => {
    const raw = item as BgBatchItemPayload;
    const indexValue = Number(raw.index);
    const index = Number.isInteger(indexValue) ? indexValue : fallbackIndex;

    if (typeof raw.pngBase64 !== "string" || raw.pngBase64.trim().length === 0) {
      throw new Error(`누끼 배치 응답 항목(${index})에 pngBase64가 없습니다.`);
    }

    const mimeType =
      typeof raw.mimeType === "string" && raw.mimeType.trim().length > 0
        ? raw.mimeType
        : "image/png";
    const filename =
      typeof raw.filename === "string" && raw.filename.trim().length > 0
        ? raw.filename
        : `image-${index + 1}.png`;
    const outputFilename =
      typeof raw.outputFilename === "string" && raw.outputFilename.trim().length > 0
        ? raw.outputFilename
        : `image-${index + 1}-nobg.png`;
    const mode = typeof raw.mode === "string" ? raw.mode : undefined;
    const resized = typeof raw.resized === "boolean" ? raw.resized : undefined;

    const pngBase64 = raw.pngBase64.trim();

    return {
      index,
      filename,
      outputFilename,
      mimeType,
      mode,
      resized,
      pngBase64,
      dataUrl: `data:${mimeType};base64,${pngBase64}`,
    } satisfies BgRemovedBatchItem;
  });

  return normalized.sort((a, b) => a.index - b.index);
}
