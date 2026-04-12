import { NextResponse } from "next/server";
import {
  createGeminiClient,
  extractFirstInlineData,
  getGeminiTtsModel,
} from "@/lib/gemini/server";
import {
  buildGeminiTtsPrompt,
  getSelectedGeminiVoice,
} from "@/lib/gemini-tts/server";
import type { DialogueEmotion, ProfessorGender } from "@/lib/game-data";

type TtsRequestPayload = {
  text: string;
  gender?: ProfessorGender;
  voiceName?: string;
  emotion?: DialogueEmotion;
};

function parseSampleRate(mimeType: string) {
  const matched = mimeType.match(/rate=(\d+)/i);
  if (!matched) {
    return 24000;
  }

  const parsed = Number(matched[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 24000;
  }

  return parsed;
}

function buildWavFromPcm(pcm: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function toPlayableAudioDataUrl(data: string, mimeType: string) {
  if (mimeType.includes("wav") || mimeType.includes("wave")) {
    return `data:${mimeType};base64,${data}`;
  }

  const pcmBuffer = Buffer.from(data, "base64");
  const wavBuffer = buildWavFromPcm(pcmBuffer, parseSampleRate(mimeType));
  return `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
}

export async function POST(request: Request) {
  const client = createGeminiClient();

  if (!client) {
    return NextResponse.json(
      {
        message: "Gemini TTS 설정이 완료되지 않았습니다. GEMINI_API_KEY를 확인해주세요.",
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

  const voiceName = getSelectedGeminiVoice(
    payload.voiceName,
    payload.gender ?? "미정(중성 표현)",
  );
  const emotion = payload.emotion ?? "neutral";
  const prompt = buildGeminiTtsPrompt(text, emotion);

  try {
    const response = await client.models.generateContent({
      model: getGeminiTtsModel(),
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    });

    const audioPart = extractFirstInlineData(response);

    if (!audioPart) {
      return NextResponse.json(
        {
          message: "Gemini TTS 응답에 오디오 데이터가 없습니다.",
        },
        { status: 500 },
      );
    }

    const audioDataUrl = toPlayableAudioDataUrl(audioPart.data, audioPart.mimeType);

    return NextResponse.json({
      audioDataUrl,
      voiceName,
      emotion,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Gemini TTS 생성 실패: ${error.message}`
            : "Gemini TTS 생성 실패",
      },
      { status: 500 },
    );
  }
}
