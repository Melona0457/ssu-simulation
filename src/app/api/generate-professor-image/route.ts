import { createPartFromBase64, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import {
  createGeminiClient,
  extractFirstInlineData,
  extractTextFromGeminiResponse,
  getGeminiImageModel,
} from "@/lib/gemini/server";
import {
  removeBackgroundBatch,
  removeBackgroundSingle,
} from "@/lib/bg-remove/server";
import {
  professorReferenceFusionGuide,
  professorSpriteStylePreset,
} from "@/lib/game-data";

type ImageExpressionInput = {
  key?: string;
  label?: string;
  direction?: string;
  reason?: string;
};

type ImageRequestPayload = {
  professorName: string;
  professorSummary: string;
  illustrationPrompt: string;
  expressionSet?: ImageExpressionInput[];
};

type ExpressionSpec = {
  key: string;
  label: string;
  direction: string;
  reason: string;
};

type GeneratedImageResult = {
  imageBase64: string;
  mimeType: string;
  promptUsed: string;
};

const DEFAULT_EXPRESSION_SPECS: ExpressionSpec[] = [
  {
    key: "EXP_1",
    label: "차분한 기본",
    direction: "calm neutral expression, gentle eye contact, composed professor vibe",
    reason: "전체 에피소드의 기본 대사와 안정 구간을 담당",
  },
  {
    key: "EXP_2",
    label: "미소/호감",
    direction: "warm subtle smile, softened eyes, approachable and affectionate tone",
    reason: "호감 상승, 장난기, 친밀한 반응 구간에 사용",
  },
  {
    key: "EXP_3",
    label: "단호/긴장",
    direction: "stern focused expression, tighter brows, disciplined professor authority",
    reason: "긴장, 압박, 당황 반응 구간을 담당",
  },
];

function toSafeString(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function toExpressionKey(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,24}$/.test(normalized)) {
    return "";
  }

  return normalized;
}

function normalizeExpressionSet(raw: ImageExpressionInput[] | undefined) {
  const byKey = new Map<string, ImageExpressionInput>();

  for (const item of raw ?? []) {
    const key = toExpressionKey(item?.key);
    if (!key || byKey.has(key)) {
      continue;
    }

    byKey.set(key, item);
  }

  return DEFAULT_EXPRESSION_SPECS.map((fallback, index) => {
    const source = byKey.get(fallback.key) ?? raw?.[index];

    return {
      key: fallback.key,
      label: toSafeString(source?.label, fallback.label),
      direction: toSafeString(source?.direction, fallback.direction),
      reason: toSafeString(source?.reason, fallback.reason),
    } satisfies ExpressionSpec;
  });
}

function buildBasePrompt(body: ImageRequestPayload, styleGuideLine: string) {
  return [
    "Create a single full-body 2D game character sprite of a Korean university professor.",
    "Visual novel style, polished illustration, standing pose, full body visible from head to shoes.",
    styleGuideLine,
    "Use a pure white studio background (#FFFFFF) that is flat and uniform.",
    "Character only. No panel, no backdrop card, no shape behind the character.",
    "The background must be pure white only. No texture, no gradient, no shadow, and no floor.",
    "No background objects, no text, no caption, no subtitle, no logo, no watermark.",
    "Show only one professor character and keep the silhouette clean for easy visual novel use.",
    "The entire head, hair, shoulders, hands, legs, and shoes must be fully inside the frame.",
    "Do not crop the top of the head. Do not crop the feet. Do not zoom in.",
    `Professor identity reference: ${body.professorName}. Do not write this name as text in image.`,
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
  ].join(" ");
}

function buildBaseFallbackPrompt(body: ImageRequestPayload, styleGuideLine: string) {
  return [
    "Create one full-body 2D visual novel professor character sprite.",
    "Standing pose, single character only, clean silhouette.",
    styleGuideLine,
    "Background must be plain pure white (#FFFFFF) only.",
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
    "No panel, no backdrop card, no text/caption/logo/watermark.",
  ].join(" ");
}

function buildExpressionPrompt(
  body: ImageRequestPayload,
  styleGuideLine: string,
  expression: ExpressionSpec,
) {
  return [
    "You are given a reference PNG of the exact same professor character.",
    "Generate a new full-body 2D visual novel sprite of the same person.",
    "Keep identity consistent: same face structure, hair design, age vibe, outfit category, and proportions.",
    "Do not change character identity.",
    styleGuideLine,
    `Target expression direction: ${expression.direction}.`,
    `Why this expression is needed in story: ${expression.reason}.`,
    "Pose should remain natural standing pose suitable for dialogue scenes.",
    "Use plain white background (#FFFFFF), character only, no text, no watermark.",
    `Professor identity reference: ${body.professorName}.`,
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
  ].join(" ");
}

function buildExpressionFallbackPrompt(
  body: ImageRequestPayload,
  styleGuideLine: string,
  expression: ExpressionSpec,
) {
  return [
    "Generate one full-body visual novel professor sprite using the provided reference image.",
    "Preserve the same character identity and outfit style.",
    `Expression: ${expression.direction}`,
    `Story reason: ${expression.reason}`,
    styleGuideLine,
    "Simple white background only, no text or logo.",
    `Persona summary: ${body.professorSummary}`,
  ].join(" ");
}

async function generateImageWithRetry({
  gemini,
  promptCandidates,
  referenceParts,
}: {
  gemini: NonNullable<ReturnType<typeof createGeminiClient>>;
  promptCandidates: string[];
  referenceParts?: Part[];
}): Promise<GeneratedImageResult> {
  const failedAttempts: string[] = [];

  for (const [attemptIndex, candidatePrompt] of promptCandidates.entries()) {
    const parts: Part[] = [{ text: candidatePrompt }, ...(referenceParts ?? [])];

    const response = await gemini.models.generateContent({
      model: getGeminiImageModel(),
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "3:4",
        },
      },
    });

    const imagePart = extractFirstInlineData(response);
    if (imagePart) {
      return {
        imageBase64: imagePart.data,
        mimeType: imagePart.mimeType,
        promptUsed: candidatePrompt,
      };
    }

    const finishReason =
      typeof (response as { candidates?: Array<{ finishReason?: unknown }> }).candidates?.[0]
        ?.finishReason === "string"
        ? ((response as { candidates?: Array<{ finishReason?: string }> }).candidates?.[0]
            ?.finishReason ?? "UNKNOWN")
        : "UNKNOWN";

    const responseText = extractTextFromGeminiResponse(response);
    failedAttempts.push(
      `${attemptIndex + 1}:${finishReason}${responseText ? `:${responseText.slice(0, 90)}` : ""}`,
    );
  }

  throw new Error(`이미지 생성 재시도 실패: ${failedAttempts.join(" | ") || "no detail"}`);
}

export async function POST(request: Request) {
  const gemini = createGeminiClient();

  if (!gemini) {
    return NextResponse.json(
      {
        message: "GEMINI_API_KEY가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ImageRequestPayload;
  const normalizedBody: ImageRequestPayload = {
    professorName: toSafeString(body.professorName, "이름 미정 교수"),
    professorSummary: toSafeString(body.professorSummary, "차분하지만 학생 성장을 챙기는 교수"),
    illustrationPrompt: toSafeString(body.illustrationPrompt, "full-body 2D campus visual novel professor sprite"),
    expressionSet: body.expressionSet,
  };

  const normalizedExpressionSet = normalizeExpressionSet(normalizedBody.expressionSet);

  const styleGuideLine = `Style lock for every output: ${professorSpriteStylePreset.join(", ")}. Reference fusion lock: ${professorReferenceFusionGuide}.`;

  try {
    const basePromptCandidates = [
      buildBasePrompt(normalizedBody, styleGuideLine),
      buildBaseFallbackPrompt(normalizedBody, styleGuideLine),
    ];

    const baseGenerated = await generateImageWithRetry({
      gemini,
      promptCandidates: basePromptCandidates,
    });

    const baseRemoved = await removeBackgroundSingle({
      imageBuffer: Buffer.from(baseGenerated.imageBase64, "base64"),
      filename: "professor-base.png",
      mimeType: baseGenerated.mimeType,
    });

    const referencePart = createPartFromBase64(baseRemoved.pngBase64, "image/png");

    const generatedExpressionRaw: Array<{
      spec: ExpressionSpec;
      imageBase64: string;
      mimeType: string;
      promptUsed: string;
    }> = [];
    const expressionPromptUsed: Record<string, string> = {};
    const expressionWarnings: string[] = [];

    for (const spec of normalizedExpressionSet) {
      try {
        const generated = await generateImageWithRetry({
          gemini,
          promptCandidates: [
            buildExpressionPrompt(normalizedBody, styleGuideLine, spec),
            buildExpressionFallbackPrompt(normalizedBody, styleGuideLine, spec),
          ],
          referenceParts: [referencePart],
        });

        generatedExpressionRaw.push({
          spec,
          imageBase64: generated.imageBase64,
          mimeType: generated.mimeType,
          promptUsed: generated.promptUsed,
        });
        expressionPromptUsed[spec.key] = generated.promptUsed;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        expressionWarnings.push(`${spec.key}:${reason}`);
      }
    }

    const expressionImageDataUrls: Record<string, string> = {};

    if (generatedExpressionRaw.length > 0) {
      try {
        const removedBatch = await removeBackgroundBatch({
          images: generatedExpressionRaw.map((item, index) => ({
            imageBuffer: Buffer.from(item.imageBase64, "base64"),
            filename: `${item.spec.key.toLowerCase()}-${index + 1}.png`,
            mimeType: item.mimeType,
          })),
        });

        generatedExpressionRaw.forEach((item, index) => {
          const removed = removedBatch[index];
          if (removed?.dataUrl) {
            expressionImageDataUrls[item.spec.key] = removed.dataUrl;
          }
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        expressionWarnings.push(`BATCH_REMOVE:${reason}`);
      }
    }

    const generatedExpressionLabels = normalizedExpressionSet
      .filter((spec) => typeof expressionImageDataUrls[spec.key] === "string")
      .map((spec) => `${spec.label}(${spec.key})`);

    return NextResponse.json({
      imageDataUrl: baseRemoved.dataUrl,
      promptUsed: baseGenerated.promptUsed,
      expressionSet: normalizedExpressionSet,
      expressionImageDataUrls,
      expressionPromptUsed,
      message:
        expressionWarnings.length > 0
          ? `기본 이미지는 생성 완료. 표정 이미지 일부 실패: ${expressionWarnings.slice(0, 3).join(" | ")}`
          : `기본 이미지 + 표정 ${generatedExpressionLabels.length}종 생성 완료`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이미지 생성/누끼 처리 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
