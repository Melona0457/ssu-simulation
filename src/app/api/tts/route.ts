import { NextResponse } from "next/server";
import {
  createGoogleTtsClient,
  getEmotionTtsConfig,
  getSelectedGoogleVoice,
} from "@/lib/google-tts/server";
import type { DialogueEmotion, ProfessorGender } from "@/lib/game-data";

type TtsRequestPayload = {
  text: string;
  gender?: ProfessorGender;
  voiceName?: string;
  emotion?: DialogueEmotion;
};

export async function POST(request: Request) {
  const client = createGoogleTtsClient();

  if (!client) {
    return NextResponse.json(
      {
        message:
          "Google Cloud TTS 설정이 완료되지 않았습니다. GOOGLE_CLOUD_PROJECT_ID와 서비스 계정 키 경로를 확인해주세요.",
      },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as TtsRequestPayload;
  const text = payload.text?.trim();

  if (!text) {
    return NextResponse.json(
      {
        message: "TTS로 변환할 텍스트가 비어 있습니다.",
      },
      { status: 400 },
    );
  }

  const voice = getSelectedGoogleVoice(
    payload.voiceName,
    payload.gender ?? "미정(중성 표현)",
  );
  const emotionConfig = getEmotionTtsConfig(payload.emotion ?? "neutral");

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice,
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: emotionConfig.speakingRate,
        pitch: emotionConfig.pitch,
      },
    });

    if (!response.audioContent) {
      return NextResponse.json(
        {
          message: "Google TTS 응답에 오디오 데이터가 없습니다.",
        },
        { status: 500 },
      );
    }

    const audioBase64 = Buffer.isBuffer(response.audioContent)
      ? response.audioContent.toString("base64")
      : Buffer.from(response.audioContent as Uint8Array).toString("base64");

    return NextResponse.json({
      audioDataUrl: `data:audio/mpeg;base64,${audioBase64}`,
      voiceName: voice.name,
      emotion: payload.emotion ?? "neutral",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Google TTS 생성 실패: ${error.message}`
            : "Google TTS 생성 실패",
      },
      { status: 500 },
    );
  }
}
