import { NextResponse } from "next/server";
import {
  chapterFallbackDialogues,
  chapterInfoMap,
  type ChapterChoice,
  type ChapterId,
} from "@/lib/game-data";
import { createOpenAIClient } from "@/lib/openai/server";

type DialogueRequestPayload = {
  chapterId: ChapterId;
  professorName: string;
  professorSummary: string;
  totalScore: number;
  studyNotes?: string;
};

type RawChoice = {
  text?: unknown;
  preview?: unknown;
  reaction?: unknown;
  effects?: {
    affinity?: unknown;
    intellect?: unknown;
  };
};

function isChapterId(value: string): value is ChapterId {
  return value in chapterInfoMap;
}

function toSafeNumber(value: unknown, fallback: number) {
  const candidate = Number(value);
  if (Number.isNaN(candidate)) {
    return fallback;
  }

  return Math.max(-4, Math.min(12, Math.round(candidate)));
}

function normalizeChoice(input: RawChoice | undefined, fallback: ChapterChoice): ChapterChoice {
  return {
    text:
      typeof input?.text === "string" && input.text.trim().length > 0
        ? input.text
        : fallback.text,
    preview:
      typeof input?.preview === "string" && input.preview.trim().length > 0
        ? input.preview
        : fallback.preview,
    reaction:
      typeof input?.reaction === "string" && input.reaction.trim().length > 0
        ? input.reaction
        : fallback.reaction,
    effects: {
      affinity: toSafeNumber(input?.effects?.affinity, fallback.effects.affinity),
      intellect: toSafeNumber(input?.effects?.intellect, fallback.effects.intellect),
    },
  };
}

function buildFallback(chapterId: ChapterId) {
  const fallback = chapterFallbackDialogues[chapterId];
  return {
    dialogue: fallback.dialogue,
    choices: fallback.choices,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as DialogueRequestPayload;
  const chapterId = payload.chapterId;

  if (!chapterId || !isChapterId(chapterId)) {
    return NextResponse.json(
      {
        message: "유효하지 않은 chapterId입니다.",
      },
      { status: 400 },
    );
  }

  const chapter = chapterInfoMap[chapterId];
  const fallback = buildFallback(chapterId);
  const openai = createOpenAIClient();

  if (!openai) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message: "OPENAI_API_KEY가 없어 기본 대사를 사용했습니다.",
    });
  }

  const prompt = [
    "너는 캠퍼스 미연시 패러디 게임의 시나리오 라이터다.",
    "톤: MZ식 맑눈광 제자 + 츤데레 교수.",
    "형식: 한국어만 사용.",
    "챕터 정보:",
    `- 챕터명: ${chapter.title}`,
    `- 위치: ${chapter.location}`,
    `- 상황: ${chapter.scene}`,
    `- 키워드: ${chapter.keywords.join(", ")}`,
    `- 교수명: ${payload.professorName}`,
    `- 교수 페르소나 요약: ${payload.professorSummary}`,
    `- 현재 누적 점수: ${payload.totalScore}`,
    payload.studyNotes
      ? `- 학습 자료 요약: ${payload.studyNotes.slice(0, 1400)}`
      : "- 학습 자료 요약: 없음",
    "반드시 JSON만 반환.",
    "JSON 스키마:",
    "{",
    '  "dialogue": "교수의 현재 대사 1~2문장",',
    '  "choices": [',
    "    {",
    '      "text": "선택지 본문",',
    '      "preview": "선택지 보조 설명",',
    '      "reaction": "선택 직후 교수 반응",',
    '      "effects": { "affinity": 0, "intellect": 0 }',
    "    }",
    "  ]",
    "}",
    "조건:",
    "- choices는 정확히 3개.",
    "- affinity, intellect는 각각 -4~12 정수.",
    "- 한 선택지는 반드시 조금 과감한 맑눈광 드립으로 작성.",
    "- reaction은 츤데레 톤 유지.",
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
            "당신은 게임 시나리오 작가다. 사용자가 요구한 JSON 스키마를 엄격히 지키고 JSON 외 텍스트를 출력하지 마라.",
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
        message: "LLM 응답이 비어 있어 기본 대사를 사용했습니다.",
      });
    }

    const parsed = JSON.parse(raw) as {
      dialogue?: unknown;
      choices?: RawChoice[];
    };

    const normalizedChoices = [0, 1, 2].map((index) =>
      normalizeChoice(parsed.choices?.[index], fallback.choices[index]),
    );

    return NextResponse.json({
      dialogue:
        typeof parsed.dialogue === "string" && parsed.dialogue.trim().length > 0
          ? parsed.dialogue
          : fallback.dialogue,
      choices: normalizedChoices,
      fallback: false,
    });
  } catch (error) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message:
        error instanceof Error
          ? `대사 생성 실패로 기본 대사를 사용했습니다: ${error.message}`
          : "대사 생성 실패로 기본 대사를 사용했습니다.",
    });
  }
}
