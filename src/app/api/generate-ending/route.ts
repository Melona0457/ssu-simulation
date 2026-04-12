import { NextResponse } from "next/server";
import {
  endingMeta,
  finalRealityLine,
  getEndingRank,
  type EndingRank,
} from "@/lib/game-data";
import {
  createGeminiClient,
  extractTextFromGeminiResponse,
  getGeminiTextModel,
} from "@/lib/gemini/server";

type EndingRequestPayload = {
  professorName: string;
  professorSummary?: string;
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
  const gemini = createGeminiClient();

  if (!gemini) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message: "GEMINI_API_KEY가 없어 기본 엔딩을 사용했습니다.",
    });
  }

  const prompt = [
    "너는 한국어 게임 시나리오 작가다.",
    "캠퍼스 미연시 패러디 게임의 엔딩을 작성하라.",
    `교수 이름: ${payload.professorName}`,
    payload.professorSummary
      ? `교수 페르소나 요약: ${payload.professorSummary}`
      : "교수 페르소나 요약: 없음",
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
    "- 교수의 성격/말투는 교수 페르소나 요약을 우선 반영.",
    "- 학생 화자는 자연스러운 대학생 톤으로 작성.",
    "- endingStory 마지막 문장은 반드시 다음 문구로 끝낼 것:",
    `  ${finalRealityLine}`,
  ].join("\n");

  try {
    const response = await gemini.models.generateContent({
      model: getGeminiTextModel(),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "당신은 게임 엔딩 라이터다.",
                "JSON 스키마를 엄격히 준수하고 한국어만 사용하라.",
                prompt,
              ].join("\n"),
            },
          ],
        },
      ],
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
      },
    });

    const raw = extractTextFromGeminiResponse(response);

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
