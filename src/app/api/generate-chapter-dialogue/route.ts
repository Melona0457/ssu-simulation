import { NextResponse } from "next/server";
import {
  chapterFallbackDialogues,
  chapterInfoMap,
  type ChapterChoice,
  type ChapterId,
  type DialogueEmotion,
} from "@/lib/game-data";
import {
  createGeminiClient,
  extractTextFromGeminiResponse,
  getGeminiTextModel,
} from "@/lib/gemini/server";

type DialogueRequestPayload = {
  chapterId: ChapterId;
  professorName: string;
  professorSummary: string;
  totalScore: number;
  studyNotes?: string;
  studyQuizContext?: {
    summary?: string;
    keyPoints?: string[];
    sourceModel?: string;
  } | null;
};

type RawChoice = {
  text?: unknown;
  preview?: unknown;
  reaction?: unknown;
  emotion?: unknown;
  effects?: {
    affinity?: unknown;
    intellect?: unknown;
  };
};

type RawQuiz = {
  concept?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  explanation?: unknown;
};

function normalizeEmotion(value: unknown, fallback: DialogueEmotion): DialogueEmotion {
  if (
    value === "neutral" ||
    value === "stern" ||
    value === "teasing" ||
    value === "awkward" ||
    value === "warm" ||
    value === "panic"
  ) {
    return value;
  }

  return fallback;
}

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
    emotion: normalizeEmotion(input?.emotion, fallback.emotion),
    effects: {
      affinity: toSafeNumber(input?.effects?.affinity, fallback.effects.affinity),
      intellect: toSafeNumber(input?.effects?.intellect, fallback.effects.intellect),
    },
  };
}

function normalizeQuiz(input: RawQuiz | null | undefined) {
  if (!input) {
    return null;
  }

  const question =
    typeof input.question === "string" && input.question.trim().length > 0
      ? input.question.trim()
      : "";
  const options = Array.isArray(input.options)
    ? input.options
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, 4)
    : [];
  const answerIndex = Number(input.answerIndex);
  const explanation =
    typeof input.explanation === "string" && input.explanation.trim().length > 0
      ? input.explanation.trim()
      : "";

  if (!question || options.length !== 4 || Number.isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
    return null;
  }

  return {
    concept:
      typeof input.concept === "string" && input.concept.trim().length > 0
        ? input.concept.trim()
        : "핵심 개념",
    question,
    options,
    answerIndex: Math.round(answerIndex),
    explanation,
  };
}

function buildFallback(chapterId: ChapterId) {
  const fallback = chapterFallbackDialogues[chapterId];
  return {
    dialogue: fallback.dialogue,
    emotion: "neutral" as const,
    choices: fallback.choices,
    quiz: null,
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
  const gemini = createGeminiClient();
  const quizSummary =
    typeof payload.studyQuizContext?.summary === "string"
      ? payload.studyQuizContext.summary.trim()
      : "";
  const quizKeyPoints = Array.isArray(payload.studyQuizContext?.keyPoints)
    ? payload.studyQuizContext.keyPoints
        .map((point) => (typeof point === "string" ? point.trim() : ""))
        .filter((point) => point.length > 0)
        .slice(0, 8)
    : [];
  const hasQuizSource = quizSummary.length > 0 || quizKeyPoints.length > 0;
  const shouldGenerateQuiz = hasQuizSource && Math.random() < 0.5;

  if (!gemini) {
    return NextResponse.json({
      ...fallback,
      fallback: true,
      message: "GEMINI_API_KEY가 없어 기본 대사를 사용했습니다.",
    });
  }

  const prompt = [
    "너는 캠퍼스 미연시 패러디 게임의 시나리오 라이터다.",
    "톤: 교수 페르소나 요약을 최우선 반영.",
    "중요: 교수의 성격/말투를 임의로 고정하지 말고 제공된 페르소나를 따른다.",
    "학생 화자는 자연스러운 대학생 말투를 사용한다.",
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
    shouldGenerateQuiz
      ? `- OpenAI 요약 기반 깜짝 퀴즈: 생성 (출처 모델: ${payload.studyQuizContext?.sourceModel || "unknown"})`
      : "- OpenAI 요약 기반 깜짝 퀴즈: 생성하지 않음",
    shouldGenerateQuiz && quizSummary
      ? `- 요약 본문: ${quizSummary.slice(0, 1200)}`
      : "- 요약 본문: 없음",
    shouldGenerateQuiz && quizKeyPoints.length > 0
      ? `- 핵심 개념 목록: ${quizKeyPoints.join(" | ")}`
      : "- 핵심 개념 목록: 없음",
    "반드시 JSON만 반환.",
    "JSON 스키마:",
    "{",
    '  "dialogue": "교수의 현재 대사 1~2문장",',
    '  "emotion": "neutral | stern | teasing | awkward | warm | panic",',
    '  "choices": [',
    "    {",
    '      "text": "선택지 본문",',
    '      "preview": "선택지 보조 설명",',
    '      "reaction": "선택 직후 교수 반응",',
    '      "emotion": "neutral | stern | teasing | awkward | warm | panic",',
    '      "effects": { "affinity": 0, "intellect": 0 }',
    "    }",
    "  ],",
    '  "quiz": {',
    '    "concept": "학습 개념 이름",',
    '    "question": "4지선다 퀴즈 문제",',
    '    "options": ["보기1", "보기2", "보기3", "보기4"],',
    '    "answerIndex": 0,',
    '    "explanation": "정답 해설 1~2문장"',
    "  } | null",
    "}",
    "조건:",
    "- choices는 정확히 3개.",
    "- dialogue와 각 reaction에 어울리는 emotion을 반드시 넣을 것.",
    "- affinity, intellect는 각각 -4~12 정수.",
    "- 한 선택지는 반드시 조금 과감한 장난기 있는 드립으로 작성.",
    "- reaction은 교수 페르소나 요약에 맞는 톤으로 작성.",
    shouldGenerateQuiz
      ? "- quiz는 반드시 object로 생성하고 options는 정확히 4개, answerIndex는 0~3 정수."
      : "- quiz는 반드시 null.",
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
                "당신은 게임 시나리오 작가다.",
                "사용자가 요구한 JSON 스키마를 엄격히 지키고 JSON 외 텍스트를 출력하지 마라.",
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
        message: "LLM 응답이 비어 있어 기본 대사를 사용했습니다.",
      });
    }

    const parsed = JSON.parse(raw) as {
      dialogue?: unknown;
      emotion?: unknown;
      choices?: RawChoice[];
      quiz?: RawQuiz | null;
    };

    const normalizedChoices = [0, 1, 2].map((index) =>
      normalizeChoice(parsed.choices?.[index], fallback.choices[index]),
    );
    const normalizedQuiz = shouldGenerateQuiz ? normalizeQuiz(parsed.quiz) : null;

    return NextResponse.json({
      dialogue:
        typeof parsed.dialogue === "string" && parsed.dialogue.trim().length > 0
          ? parsed.dialogue
          : fallback.dialogue,
      emotion: normalizeEmotion(parsed.emotion, fallback.emotion),
      choices: normalizedChoices,
      quiz: normalizedQuiz,
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
