import { GoogleGenAI } from "@google/genai";

type GeminiInlineDataPart = {
  inlineData?: {
    data?: unknown;
    mimeType?: unknown;
  };
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiInlineDataPart[];
  };
};

type GeminiResponseLike = {
  text?: unknown;
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
