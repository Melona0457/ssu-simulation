import { NextResponse } from "next/server";
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
import { removeBackgroundSingle } from "@/lib/bg-remove/server";

type GenerateProfessorImagePayload = {
  professor?: ProfessorFormState;
};

function toImageDataUrl(data: string, mimeType: string) {
  return `data:${mimeType};base64,${data}`;
}

export async function POST(request: Request) {
  const client = createGeminiClient();

  if (!client) {
    return NextResponse.json(
      {
        message: "GEMINI_API_KEY가 없어 교수 이미지를 생성할 수 없습니다.",
      },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as GenerateProfessorImagePayload;
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
      customPrompt: "",
    },
  );

  const prompt = [
    buildIllustrationPrompt(resolvedProfessor),
    "transparent or plain light background",
    "single character only",
    "front-facing full body professor sprite",
    "clean silhouette for visual novel cut-in usage",
    "no props in hands unless naturally subtle",
    "no text, no watermark, no frame",
  ].join(", ");

  try {
    const response = await client.models.generateContent({
      model: getGeminiImageModel(),
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
    let backgroundRemovalApplied = false;
    let backgroundRemovalWarning: string | null = null;

    if (process.env.BG_API_URL?.trim()) {
      try {
        const removed = await removeBackgroundSingle({
          imageBuffer: Buffer.from(imagePart.data, "base64"),
          filename: "professor-generated.png",
          mimeType: imagePart.mimeType,
        });
        transparentDataUrl = removed.dataUrl;
        backgroundRemovalApplied = true;
      } catch (error) {
        backgroundRemovalWarning =
          error instanceof Error ? error.message : "배경 제거에 실패했습니다.";
      }
    }

    return NextResponse.json({
      imageDataUrl,
      transparentDataUrl,
      prompt,
      backgroundRemovalApplied,
      backgroundRemovalWarning,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `교수 이미지 생성 실패: ${error.message}`
            : "교수 이미지 생성 실패",
      },
      { status: 500 },
    );
  }
}
