import { GoogleGenAI } from "@google/genai";

type GeminiInlineDataPart = {
  inlineData?: {
    data?: unknown;
    mimeType?: unknown;
  };
  text?: unknown;
};

type GeminiCandidate = {
  finishReason?: unknown;
  safetyRatings?: unknown;
  content?: {
    parts?: GeminiInlineDataPart[];
  };
};

type GeminiResponseLike = {
  text?: unknown;
  promptFeedback?: {
    blockReason?: unknown;
    blockReasonMessage?: unknown;
    safetyRatings?: unknown;
  };
  candidates?: GeminiCandidate[];
};

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

export function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export function getGeminiImageModel() {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

function collectResponseParts(response: unknown) {
  const typed = response as GeminiResponseLike;
  return typed.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
}

export function extractFirstInlineData(response: unknown) {
  const parts = collectResponseParts(response);

  for (const part of parts) {
    const rawData = part.inlineData?.data;
    if (typeof rawData !== "string" || rawData.length === 0) {
      continue;
    }

    const mimeType =
      typeof part.inlineData?.mimeType === "string" && part.inlineData.mimeType.length > 0
        ? part.inlineData.mimeType
        : "application/octet-stream";

    return {
      data: rawData,
      mimeType,
    };
  }

  return null;
}

export function extractGeminiSafetyBlockMessage(response: unknown) {
  const typed = response as GeminiResponseLike;
  const blockReason = typed.promptFeedback?.blockReason;

  if (blockReason === "SAFETY") {
    return "입력한 교수 설정이 Gemini 안전 정책에 의해 차단되었습니다. 성적이거나 민감한 표현을 줄여서 다시 시도해주세요.";
  }

  if (blockReason === "PROHIBITED_CONTENT") {
    return "입력한 교수 설정에 허용되지 않는 민감한 내용이 포함되어 이미지 생성을 진행할 수 없습니다.";
  }

  if (blockReason === "BLOCKLIST") {
    return "입력한 교수 설정에 허용되지 않는 표현이 포함되어 있습니다. 내용을 수정한 뒤 다시 시도해주세요.";
  }

  const candidateBlockedBySafety = typed.candidates?.some(
    (candidate) => candidate.finishReason === "SAFETY",
  );

  if (candidateBlockedBySafety) {
    return "Gemini 안전 정책으로 인해 이미지 생성이 차단되었습니다. 표현 수위를 낮춘 뒤 다시 시도해주세요.";
  }

  return null;
}
