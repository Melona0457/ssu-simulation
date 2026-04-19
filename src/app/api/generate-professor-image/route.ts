import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  buildIllustrationPrompt,
  resolveProfessorForGeneration,
  type ProfessorFormState,
} from "@/lib/game-data";
import {
  createGeminiClient,
  extractFirstInlineData,
  getGeminiImageModel,
} from "@/lib/gemini/server";
import { recordMonitoringEvent } from "@/lib/monitoring/server";
import { removeBackgroundSingle } from "@/lib/bg-remove/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GenerateProfessorImagePayload = {
  professor?: ProfessorFormState;
};

function toImageDataUrl(data: string, mimeType: string) {
  return `data:${mimeType};base64,${data}`;
}

const PROFESSOR_IMAGE_BUCKET = process.env.SUPABASE_PROFESSOR_IMAGE_BUCKET?.trim() || "professor-images";

function resolveProfessorStorageGenderSegment(gender: ProfessorFormState["gender"]) {
  if (gender === "남자" || gender === "남성") {
    return "male";
  }

  if (gender === "여자" || gender === "여성") {
    return "female";
  }

  return "other";
}

async function trimProfessorImageBuffer(imageBuffer: Buffer) {
  return sharp(imageBuffer)
    .trim()
    .png()
    .toBuffer();
}

async function buildTopCropImageBuffer(trimmedBuffer: Buffer, cropRatio: number) {
  const metadata = await sharp(trimmedBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    throw new Error("스토리용 교수 이미지 크기를 분석할 수 없습니다.");
  }

  const safeRatio = Math.max(0.05, Math.min(1, cropRatio));
  const croppedHeight = Math.max(1, Math.round(height * safeRatio));

  return sharp(trimmedBuffer)
    .extract({
      left: 0,
      top: 0,
      width,
      height: croppedHeight,
    })
    .png()
    .toBuffer();
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rateLimit = checkRateLimit({
    key: `generate-professor-image:${getRequestIp(request)}`,
    max: 6,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        message: "이미지 생성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const client = createGeminiClient();
  const supabase = createSupabaseServerClient();
  const imageModel = getGeminiImageModel();
  const bgApiConfigured = Boolean(process.env.BG_API_URL?.trim());

  if (!client) {
    await recordMonitoringEvent({
      eventType: "professor_image_generation",
      status: "error",
      source: "gemini",
      durationMs: Date.now() - startedAt,
      errorMessage: "GEMINI_API_KEY가 없어 교수 이미지를 생성할 수 없습니다.",
      metadata: {
        model: imageModel,
        bgApiConfigured,
      },
    });

    return NextResponse.json(
      {
        message: "GEMINI_API_KEY가 없어 교수 이미지를 생성할 수 없습니다.",
      },
      { status: 500 },
    );
  }

  let payload: GenerateProfessorImagePayload;
  try {
    payload = (await request.json()) as GenerateProfessorImagePayload;
  } catch {
    return NextResponse.json(
      {
        message: "교수 이미지 생성 요청 형식이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const resolvedProfessor = resolveProfessorForGeneration(
    payload.professor ?? {
      name: "",
      gender: "남자",
      age: "30",
      speakingStyle: "TONE_30S",
      illustrationStyle: "DESIGN_3_CAMPUS_VISUAL_NOVEL",
      feature1: "",
      feature2: "",
      feature3: "",
      feature4: "",
      feature5: "",
      feature6: "",
      feature7: "",
      feature8: "",
      customPrompt: "",
    },
  );

  const prompt = [
    buildIllustrationPrompt(resolvedProfessor),
    "transparent or plain light background",
    "single character only",
    "front-facing full body professor sprite",
    "entire figure fully visible from head to toes",
    "show full legs, ankles, and shoes",
    "camera zoomed out enough to keep full body inside frame",
    "leave safe empty margin above head and below feet",
    "no cropped limbs, no cut-off head, no knee-up composition",
    "clean silhouette for visual novel cut-in usage",
    "no props in hands unless naturally subtle",
    "no text, no watermark, no frame",
  ].join(", ");

  try {
    const response = await client.models.generateContent({
      model: imageModel,
      contents: prompt,
    });

    const imagePart = extractFirstInlineData(response);
    if (!imagePart) {
      return NextResponse.json(
        {
          message: "Gemini 응답에 이미지 데이터가 없습니다.",
        },
        { status: 500 },
      );
    }

    const imageDataUrl = toImageDataUrl(imagePart.data, imagePart.mimeType);
    let transparentDataUrl: string | null = null;
    let storySpriteDataUrl: string | null = null;
    let dialoguePortraitDataUrl: string | null = null;
    let storedFullImageUrl: string | null = null;
    let backgroundRemovalApplied = false;
    let backgroundRemovalWarning: string | null = null;
    let storageUploadWarning: string | null = null;
    let image1Buffer = Buffer.from(imagePart.data, "base64");
    let image1MimeType = imagePart.mimeType;

    if (process.env.BG_API_URL?.trim()) {
      try {
        const removed = await removeBackgroundSingle({
          imageBuffer: Buffer.from(imagePart.data, "base64"),
          filename: "professor-generated.png",
          mimeType: imagePart.mimeType,
        });
        transparentDataUrl = removed.dataUrl;
        image1Buffer = Buffer.from(removed.pngBase64, "base64");
        image1MimeType = removed.mimeType;
        backgroundRemovalApplied = true;
      } catch (error) {
        backgroundRemovalWarning =
          error instanceof Error ? error.message : "배경 제거에 실패했습니다.";
      }
    }

    try {
      const trimmedProfessorBuffer = await trimProfessorImageBuffer(image1Buffer);
      const storySpriteBuffer = await buildTopCropImageBuffer(trimmedProfessorBuffer, 0.5);
      const dialoguePortraitBuffer = await buildTopCropImageBuffer(trimmedProfessorBuffer, 0.25);
      storySpriteDataUrl = `data:image/png;base64,${storySpriteBuffer.toString("base64")}`;
      dialoguePortraitDataUrl = `data:image/png;base64,${dialoguePortraitBuffer.toString("base64")}`;
    } catch (error) {
      backgroundRemovalWarning =
        error instanceof Error
          ? error.message
          : "스토리용 교수 이미지 가공에 실패했습니다.";
    }

    if (supabase) {
      try {
        const genderSegment = resolveProfessorStorageGenderSegment(resolvedProfessor.gender);
        const objectPath = `generated/${genderSegment}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabase.storage
          .from(PROFESSOR_IMAGE_BUCKET)
          .upload(objectPath, image1Buffer, {
            contentType: image1MimeType || "image/png",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(PROFESSOR_IMAGE_BUCKET)
          .getPublicUrl(objectPath);
        storedFullImageUrl = publicUrlData.publicUrl;
      } catch (error) {
        storageUploadWarning =
          error instanceof Error
            ? `원본 교수 이미지 Storage 저장 실패: ${error.message}`
            : "원본 교수 이미지 Storage 저장에 실패했습니다.";
      }
    } else {
      storageUploadWarning =
        "Supabase 환경 변수가 없어 원본 교수 이미지를 Storage에 저장하지 못했습니다.";
    }

    const monitoringMessage = [backgroundRemovalWarning, storageUploadWarning]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" | ");
    await recordMonitoringEvent({
      eventType: "professor_image_generation",
      status: monitoringMessage ? "warning" : "success",
      source: "gemini",
      durationMs: Date.now() - startedAt,
      errorMessage: monitoringMessage || null,
      metadata: {
        model: imageModel,
        bgApiConfigured,
        backgroundRemovalApplied,
        backgroundRemovalWarning,
        storageUploadWarning,
        storedFullImage: Boolean(storedFullImageUrl),
      },
    });

    return NextResponse.json({
      imageDataUrl,
      transparentDataUrl,
      storySpriteDataUrl,
      dialoguePortraitDataUrl,
      storedFullImageUrl,
      prompt,
      backgroundRemovalApplied,
      backgroundRemovalWarning,
      storageUploadWarning,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? `교수 이미지 생성 실패: ${error.message}` : "교수 이미지 생성 실패";
    await recordMonitoringEvent({
      eventType: "professor_image_generation",
      status: "error",
      source: "gemini",
      durationMs: Date.now() - startedAt,
      errorMessage,
      metadata: {
        model: imageModel,
        bgApiConfigured,
      },
    });

    return NextResponse.json(
      {
        message: errorMessage,
      },
      { status: 500 },
    );
  }
}
