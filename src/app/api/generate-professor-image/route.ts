import { NextResponse } from "next/server";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import sharp from "sharp";
import {
  buildIllustrationPrompt,
  buildProfessorSummary,
  resolveProfessorForGeneration,
  type ProfessorFormState,
} from "@/lib/game-data";
import {
  createGeminiClient,
  extractFirstInlineData,
  extractGeminiSafetyBlockMessage,
  getGeminiImageModel,
} from "@/lib/gemini/server";
import { recordMonitoringEvent } from "@/lib/monitoring/server";
import { removeBackgroundSingle } from "@/lib/bg-remove/server";
import { checkProfessorInputSafety } from "@/lib/professor-input-safety";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import {
  type ProfessorGenerationInsert,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

type GenerateProfessorImagePayload = {
  professor?: ProfessorFormState;
};

function toImageDataUrl(data: string, mimeType: string) {
  return `data:${mimeType};base64,${data}`;
}

const PROFESSOR_IMAGE_BUCKET = process.env.SUPABASE_PROFESSOR_IMAGE_BUCKET?.trim() || "professor-images";
const DEFAULT_PROFESSOR_INPUT: ProfessorFormState = {
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
};
const PROFESSOR_GENDER_VALUES: ProfessorFormState["gender"][] = [
  "남자",
  "여자",
  "남성",
  "여성",
  "논바이너리",
  "미정(중성 표현)",
];
const ILLUSTRATION_STYLE_VALUES: ProfessorFormState["illustrationStyle"][] = [
  "DESIGN_1_ROMANCE_FANTASY",
  "DESIGN_2_CLEAN_CHARACTER_CARD",
  "DESIGN_3_CAMPUS_VISUAL_NOVEL",
];

function coerceProfessorInput(value: unknown): ProfessorFormState {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<keyof ProfessorFormState, unknown>>)
      : {};

  const readString = <T extends keyof ProfessorFormState>(key: T) =>
    typeof raw[key] === "string" ? raw[key] : DEFAULT_PROFESSOR_INPUT[key];
  const unsafeGender = readString("gender");
  const unsafeIllustrationStyle = readString("illustrationStyle");
  const gender = PROFESSOR_GENDER_VALUES.includes(unsafeGender as ProfessorFormState["gender"])
    ? (unsafeGender as ProfessorFormState["gender"])
    : DEFAULT_PROFESSOR_INPUT.gender;
  const illustrationStyle = ILLUSTRATION_STYLE_VALUES.includes(
    unsafeIllustrationStyle as ProfessorFormState["illustrationStyle"],
  )
    ? (unsafeIllustrationStyle as ProfessorFormState["illustrationStyle"])
    : DEFAULT_PROFESSOR_INPUT.illustrationStyle;

  return {
    name: readString("name"),
    gender,
    age: readString("age"),
    speakingStyle: readString("speakingStyle"),
    illustrationStyle,
    feature1: readString("feature1"),
    feature2: readString("feature2"),
    feature3: readString("feature3"),
    feature4: readString("feature4"),
    feature5: readString("feature5"),
    feature6: readString("feature6"),
    feature7: readString("feature7"),
    feature8: readString("feature8"),
    customPrompt: readString("customPrompt"),
  };
}

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

  const inputProfessor = coerceProfessorInput(payload.professor);
  const inputSafety = checkProfessorInputSafety(inputProfessor);

  if (!inputSafety.ok) {
    await recordMonitoringEvent({
      eventType: "professor_image_generation",
      status: "warning",
      source: "input_guard",
      durationMs: Date.now() - startedAt,
      errorMessage: inputSafety.userMessage,
      metadata: {
        model: imageModel,
        bgApiConfigured,
        blockedCategory: inputSafety.category,
        blockedField: inputSafety.field,
      },
    });

    return NextResponse.json(
      {
        message: inputSafety.userMessage,
      },
      { status: 400 },
    );
  }

  const resolvedProfessor = resolveProfessorForGeneration(inputProfessor);
  const professorSummary = buildProfessorSummary(resolvedProfessor);

  const prompt = [
    buildIllustrationPrompt(resolvedProfessor),
    "transparent or plain light background",
    "single character only",
    "front-facing full body professor sprite",
    "adult character proportions, at least six-head-tall figure",
    "entire figure fully visible from head to toes",
    "show full legs, ankles, and shoes",
    "camera zoomed out enough to keep full body inside frame",
    "leave safe empty margin above head and below feet",
    "no cropped limbs, no cut-off head, no knee-up composition",
    "no chibi or super-deformed proportions",
    "clean silhouette for visual novel cut-in usage",
    "no props in hands unless naturally subtle",
    "no text, no watermark, no frame",
  ].join(", ");

  try {
    const response = await client.models.generateContent({
      model: imageModel,
      contents: prompt,
      config: {
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
          },
        ],
      },
    });

    const imagePart = extractFirstInlineData(response);
    if (!imagePart) {
      const blockedMessage = extractGeminiSafetyBlockMessage(response);

      if (blockedMessage) {
        await recordMonitoringEvent({
          eventType: "professor_image_generation",
          status: "warning",
          source: "gemini",
          durationMs: Date.now() - startedAt,
          errorMessage: blockedMessage,
          metadata: {
            model: imageModel,
            bgApiConfigured,
            blockedBySafety: true,
          },
        });
      }

      return NextResponse.json(
        {
          message: blockedMessage || "Gemini 응답에 이미지 데이터가 없습니다.",
        },
        { status: blockedMessage ? 400 : 500 },
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
    let generationRecordWarning: string | null = null;
    let storageObjectPath: string | null = null;
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
        storageObjectPath = `generated/${genderSegment}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
        const { error: uploadError } = await supabase.storage
          .from(PROFESSOR_IMAGE_BUCKET)
          .upload(storageObjectPath, image1Buffer, {
            contentType: image1MimeType || "image/png",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from(PROFESSOR_IMAGE_BUCKET)
          .getPublicUrl(storageObjectPath);
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

    if (supabase) {
      try {
        const generationRecord: ProfessorGenerationInsert = {
          source: "generate-professor-image",
          input_professor: inputProfessor as unknown as Record<string, unknown>,
          resolved_professor: resolvedProfessor as unknown as Record<string, unknown>,
          professor_summary: professorSummary,
          illustration_prompt: prompt,
          storage_bucket: PROFESSOR_IMAGE_BUCKET,
          storage_object_path: storageObjectPath,
          stored_full_image_url: storedFullImageUrl,
          background_removal_applied: backgroundRemovalApplied,
          background_removal_warning: backgroundRemovalWarning,
          storage_upload_warning: storageUploadWarning,
        };
        const { error: generationInsertError } = await supabase
          .from("professor_generations")
          .insert(generationRecord);

        if (generationInsertError) {
          throw generationInsertError;
        }
      } catch (error) {
        generationRecordWarning =
          error instanceof Error
            ? `교수 생성 메타데이터 DB 저장 실패: ${error.message}`
            : "교수 생성 메타데이터 DB 저장에 실패했습니다.";
      }
    } else {
      generationRecordWarning =
        "Supabase 환경 변수가 없어 교수 생성 메타데이터를 DB에 저장하지 못했습니다.";
    }

    const monitoringMessage = [
      backgroundRemovalWarning,
      storageUploadWarning,
      generationRecordWarning,
    ]
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
        generationRecordWarning,
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
      professorSummary,
      backgroundRemovalApplied,
      backgroundRemovalWarning,
      storageUploadWarning,
      generationRecordWarning,
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
