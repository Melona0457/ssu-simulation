import { NextResponse } from "next/server";
import {
  chapterFallbackDialogues,
  chapterInfoMap,
  endingMeta,
  type ChapterChoice,
  type ChapterDialogue,
  type ChapterId,
  type DialogueEmotion,
  type EndingRank,
} from "@/lib/game-data";
import {
  createGeminiClient,
  extractTextFromGeminiResponse,
  getGeminiTextModel,
} from "@/lib/gemini/server";

type SessionPackRequestPayload = {
  chapterIds?: string[];
  playerName?: string;
  professorName?: string;
  professorSummary?: string;
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

type RawChapter = {
  chapterId?: unknown;
  dialogue?: unknown;
  choices?: RawChoice[];
};

type RawEndingPolish = {
  title?: unknown;
  description?: unknown;
};

type RawSessionPackResponse = {
  chapters?: RawChapter[];
  endingPolish?: Partial<Record<EndingRank, RawEndingPolish>>;
};

const ENDING_RANKS: EndingRank[] = [
  "ENDING_A_PLUS",
  "ENDING_B_PLUS",
  "ENDING_C_PLUS",
  "ENDING_F",
];

function isChapterId(value: string): value is ChapterId {
  return value in chapterInfoMap;
}

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
        ? input.text.trim()
        : fallback.text,
    preview:
      typeof input?.preview === "string" && input.preview.trim().length > 0
        ? input.preview.trim()
        : fallback.preview,
    reaction:
      typeof input?.reaction === "string" && input.reaction.trim().length > 0
        ? input.reaction.trim()
        : fallback.reaction,
    emotion: normalizeEmotion(input?.emotion, fallback.emotion),
    effects: {
      affinity: toSafeNumber(input?.effects?.affinity, fallback.effects.affinity),
      intellect: toSafeNumber(input?.effects?.intellect, fallback.effects.intellect),
    },
  };
}

function normalizeDialogue(input: RawChapter | undefined, fallback: ChapterDialogue): ChapterDialogue {
  return {
    dialogue:
      typeof input?.dialogue === "string" && input.dialogue.trim().length > 0
        ? input.dialogue.trim()
        : fallback.dialogue,
    choices: [0, 1, 2].map((index) => normalizeChoice(input?.choices?.[index], fallback.choices[index])),
  };
}

function buildFallbackEndingPolish() {
  return ENDING_RANKS.reduce(
    (acc, rank) => {
      acc[rank] = {
        title: endingMeta[rank].title,
        description: endingMeta[rank].description,
      };
      return acc;
    },
    {} as Record<EndingRank, { title: string; description: string }>,
  );
}

function normalizeEndingPolish(
  input: RawEndingPolish | undefined,
  fallback: { title: string; description: string },
) {
  return {
    title:
      typeof input?.title === "string" && input.title.trim().length > 0
        ? input.title.trim()
        : fallback.title,
    description:
      typeof input?.description === "string" && input.description.trim().length > 0
        ? input.description.trim()
        : fallback.description,
  };
}

function toUniqueChapterIds(chapterIds: string[] | undefined) {
  const seen = new Set<ChapterId>();
  const picked: ChapterId[] = [];

  for (const id of chapterIds ?? []) {
    if (!isChapterId(id)) {
      continue;
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    picked.push(id);

    if (picked.length >= 24) {
      break;
    }
  }

  return picked;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SessionPackRequestPayload;
  const chapterIds = toUniqueChapterIds(payload.chapterIds);

  if (chapterIds.length === 0) {
    return NextResponse.json(
      {
        message: "chapterIds가 비어있거나 유효하지 않습니다.",
      },
      { status: 400 },
    );
  }

  const professorName =
    typeof payload.professorName === "string" && payload.professorName.trim().length > 0
      ? payload.professorName.trim()
      : "이름 미정 교수";
  const playerName =
    typeof payload.playerName === "string" && payload.playerName.trim().length > 0
      ? payload.playerName.trim()
      : "김멋사";
  const professorSummary =
    typeof payload.professorSummary === "string" && payload.professorSummary.trim().length > 0
      ? payload.professorSummary.trim()
      : "차분하지만 학생 성장을 챙기는 교수";

  const fallbackChapters = chapterIds.reduce(
    (acc, chapterId) => {
      acc[chapterId] = chapterFallbackDialogues[chapterId];
      return acc;
    },
    {} as Partial<Record<ChapterId, ChapterDialogue>>,
  );
  const fallbackEndingPolish = buildFallbackEndingPolish();
  const gemini = createGeminiClient();

  if (!gemini) {
    return NextResponse.json({
      chapters: fallbackChapters,
      endingPolish: fallbackEndingPolish,
      fallback: true,
      message: "GEMINI_API_KEY가 없어 기본 세션 대사/엔딩을 사용했습니다.",
    });
  }

  const chapterBrief = chapterIds
    .map((chapterId, index) => {
      const info = chapterInfoMap[chapterId];
      return [
        `${index + 1}. chapterId=${chapterId}`,
        `   title=${info.title}`,
        `   location=${info.location}`,
        `   scene=${info.scene}`,
        `   keywords=${info.keywords.join(", ")}`,
      ].join("\n");
    })
    .join("\n");

  const prompt = [
    "너는 한국어 캠퍼스 비주얼노벨 시나리오 작가다.",
    "게임 목적: 시험기간 하루 6개 에피소드의 감정선 유지 + 교수와의 긴장감/코미디 밸런스.",
    "반드시 JSON만 출력하고, 코드블록/설명문 금지.",
    `플레이어 이름: ${playerName}`,
    `교수 이름: ${professorName}`,
    `교수 페르소나 요약: ${professorSummary}`,
    "중요: 아래 에피소드 전체 문체를 교수 페르소나 말투로 통일해라.",
    "중요: 교수 대사와 반응은 한 캐릭터가 이어서 말하는 것처럼 일관되게 유지해라.",
    "생성 대상 에피소드 목록:",
    chapterBrief,
    "JSON 스키마:",
    "{",
    '  "chapters": [',
    "    {",
    '      "chapterId": "에피소드 ID",',
    '      "dialogue": "교수 대사 중심 1~3문장",',
    '      "choices": [',
    "        {",
    '          "text": "선택지",',
      '          "preview": "짧은 보조 설명",',
      '          "reaction": "선택 후 교수 반응 1문장",',
      '          "emotion": "neutral | stern | teasing | awkward | warm | panic",',
      '          "effects": { "affinity": 0, "intellect": 0 }',
    "        }",
    "      ]",
    "    }",
    "  ],",
    '  "endingPolish": {',
    '    "ENDING_A_PLUS": { "title": "제목", "description": "2~3문장" },',
    '    "ENDING_B_PLUS": { "title": "제목", "description": "2~3문장" },',
    '    "ENDING_C_PLUS": { "title": "제목", "description": "2~3문장" },',
    '    "ENDING_F": { "title": "제목", "description": "2~3문장" }',
    "  }",
    "}",
    "제약:",
    "- chapters 배열은 입력받은 chapterId를 모두 포함하고 순서를 유지.",
    "- 각 chapter의 choices는 정확히 3개.",
    "- choice 중 최소 1개는 장난기/플러팅 톤.",
    "- choices.text는 최대한 중립적으로 작성해 정답처럼 보이지 않게 한다.",
    "- 같은 선택지라도 교수 페르소나에 따라 effects 점수가 달라질 수 있게 배치한다.",
    "- 배점은 문장 톤과 연동되어야 하며, 교수 페르소나와 어긋나면 감점한다.",
    "- effects.affinity, effects.intellect는 각각 -4~12 정수.",
    "- reaction에서 '교수: 교수:'처럼 중복 호칭 금지.",
    "- 교수 말투/태도는 교수 페르소나 요약을 강하게 반영.",
    "- 분기 에피소드(점심/밤)는 같은 하루 타임라인 안에서 자연스럽게 이어지도록 작성.",
    "- endingPolish는 A+ > B+ > C+ > F 순으로 성숙하고 안정적인 톤이 되도록 작성.",
  ].join("\n");

  try {
    const response = await gemini.models.generateContent({
      model: getGeminiTextModel(),
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        maxOutputTokens: 3800,
      },
    });

    const raw = extractTextFromGeminiResponse(response);

    if (!raw) {
      return NextResponse.json({
        chapters: fallbackChapters,
        endingPolish: fallbackEndingPolish,
        fallback: true,
        message: "세션 생성 응답이 비어 기본 데이터로 진행합니다.",
      });
    }

    const parsed = JSON.parse(raw) as RawSessionPackResponse;

    const normalizedChapters = chapterIds.reduce(
      (acc, chapterId) => {
        const fallback = chapterFallbackDialogues[chapterId];
        const matched = Array.isArray(parsed.chapters)
          ? parsed.chapters.find((chapter) => chapter.chapterId === chapterId)
          : undefined;
        acc[chapterId] = normalizeDialogue(matched, fallback);
        return acc;
      },
      {} as Partial<Record<ChapterId, ChapterDialogue>>,
    );

    const normalizedEndingPolish = ENDING_RANKS.reduce(
      (acc, rank) => {
        const fallback = fallbackEndingPolish[rank];
        const rawEnding = parsed.endingPolish?.[rank];
        acc[rank] = normalizeEndingPolish(rawEnding, fallback);
        return acc;
      },
      {} as Record<EndingRank, { title: string; description: string }>,
    );

    return NextResponse.json({
      chapters: normalizedChapters,
      endingPolish: normalizedEndingPolish,
      fallback: false,
    });
  } catch (error) {
    return NextResponse.json({
      chapters: fallbackChapters,
      endingPolish: fallbackEndingPolish,
      fallback: true,
      message:
        error instanceof Error
          ? `세션 생성 실패로 기본 데이터로 진행합니다: ${error.message}`
          : "세션 생성 실패로 기본 데이터로 진행합니다.",
    });
  }
}
