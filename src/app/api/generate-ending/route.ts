import { NextResponse } from "next/server";
import {
  endingMeta,
  finalRealityLine,
  getEndingRank,
  type EndingRank,
} from "@/lib/game-data";
import { createOpenAIClient } from "@/lib/openai/server";

type EndingRequestPayload = {
  professorName: string;
  totalScore: number;
  affinityScore: number;
  intellectScore: number;
};

function fallbackEnding(rank: EndingRank, professorName: string) {
  const meta = endingMeta[rank];
  return {
    rank,
    endingKey: meta.key,
    endingTitle: meta.title,
    endingStory: meta.description.replaceAll("민상군", professorName || "민상군"),
    realityLine: finalRealityLine,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as EndingRequestPayload;
  const rank = getEndingRank(payload.totalScore);
  const fallback = fallbackEnding(rank, payload.professorName);
  const openai = createOpenAIClient();

  if (!openai) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message: "OPENAI_API_KEY가 없어 기본 엔딩을 사용했습니다.",
    });
  }

  const prompt = [
    "너는 한국어 게임 시나리오 작가다.",
    "캠퍼스 미연시 패러디 게임의 엔딩을 작성하라.",
    `교수 이름: ${payload.professorName}`,
    `누적 점수: ${payload.totalScore}`,
    `친밀도 점수: ${payload.affinityScore}`,
    `지성 점수: ${payload.intellectScore}`,
    `확정 랭크: ${rank}`,
    "JSON만 출력하고 다른 텍스트는 금지.",
    "JSON 스키마:",
    "{",
    '  "endingTitle": "엔딩 제목",',
    '  "endingStory": "2~4문장 엔딩 서사"',
    "}",
    "제약:",
    "- 교수는 츤데레 톤을 유지.",
    "- 학생은 맑눈광 느낌을 살짝 남길 것.",
    "- endingStory 마지막 문장은 반드시 다음 문구로 끝낼 것:",
    `  ${finalRealityLine}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "당신은 게임 엔딩 라이터다. JSON 스키마를 엄격히 준수하고 한국어만 사용하라.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json({
        ...fallback,
        fallback: true,
        message: "LLM 응답이 비어 있어 기본 엔딩을 사용했습니다.",
      });
    }

    const parsed = JSON.parse(raw) as {
      endingTitle?: unknown;
      endingStory?: unknown;
    };

    const endingTitle =
      typeof parsed.endingTitle === "string" && parsed.endingTitle.trim().length > 0
        ? parsed.endingTitle
        : fallback.endingTitle;

    let endingStory =
      typeof parsed.endingStory === "string" && parsed.endingStory.trim().length > 0
        ? parsed.endingStory
        : fallback.endingStory;

    if (!endingStory.endsWith(finalRealityLine)) {
      endingStory = `${endingStory} ${finalRealityLine}`.trim();
    }

    return NextResponse.json({
      rank,
      endingKey: fallback.endingKey,
      endingTitle,
      endingStory,
      realityLine: finalRealityLine,
      fallback: false,
    });
  } catch (error) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message:
        error instanceof Error
          ? `엔딩 생성 실패로 기본 엔딩을 사용했습니다: ${error.message}`
          : "엔딩 생성 실패로 기본 엔딩을 사용했습니다.",
    });
  }
}
