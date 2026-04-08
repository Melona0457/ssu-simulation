import { NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openai/server";

type ImageRequestPayload = {
  professorName: string;
  professorSummary: string;
  illustrationPrompt: string;
};

export async function POST(request: Request) {
  const openai = createOpenAIClient();

  if (!openai) {
    return NextResponse.json(
      {
        message: "OPENAI_API_KEY가 설정되지 않았습니다.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ImageRequestPayload;

  const prompt = [
    "Create a single full-body 2D game character sprite of a Korean university professor.",
    "Visual novel style, polished illustration, standing pose, full body visible from head to shoes.",
    "Transparent background, no background objects, no desk, no classroom, no text, no speech bubble.",
    "Show only one professor character and keep the silhouette clean for easy in-game visual novel use.",
    "The entire head, hair, shoulders, hands, legs, and shoes must be fully inside the frame.",
    "Leave generous empty space around the character, especially above the head and below the shoes.",
    "Do not crop the top of the head. Do not crop the feet. Do not zoom in.",
    "Compose the character smaller within the canvas so the full-body sprite fits comfortably.",
    "The expression should feel memorable and slightly dramatic, suitable for an exam-period simulation game.",
    `Character name: ${body.professorName}.`,
    `Persona summary: ${body.professorSummary}`,
    `Visual guidance: ${body.illustrationPrompt}`,
  ].join(" ");

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt,
      size: "1024x1536",
      quality: "medium",
      background: "transparent",
      output_format: "png",
    });

    const imageBase64 = response.data?.[0]?.b64_json;

    if (!imageBase64) {
      return NextResponse.json(
        {
          message: "이미지 데이터가 비어 있습니다.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      promptUsed: prompt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "이미지 생성 중 알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
