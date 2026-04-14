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

type ExpressionKey = "EXP_1" | "EXP_2" | "EXP_3";

type SessionExpressionDefinition = {
  key: ExpressionKey;
  label: string;
  direction: string;
  reason: string;
};

type ChapterSpriteCue = {
  dialogueExpressionKey: ExpressionKey;
  choiceReactionExpressionKeys: [ExpressionKey, ExpressionKey, ExpressionKey];
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

type RawExpressionDefinition = {
  key?: unknown;
  label?: unknown;
  direction?: unknown;
  reason?: unknown;
};

type RawSpriteCue = {
  dialogueExpressionKey?: unknown;
  choiceReactionExpressionKeys?: unknown;
};

type RawSessionPackResponse = {
  chapters?: RawChapter[];
  endingPolish?: Partial<Record<EndingRank, RawEndingPolish>>;
  expressionSet?: RawExpressionDefinition[];
  spriteCues?: Record<string, RawSpriteCue | undefined>;
};

const ENDING_RANKS: EndingRank[] = [
  "ENDING_A_PLUS",
  "ENDING_B_PLUS",
  "ENDING_C_PLUS",
  "ENDING_F",
];

const EXPRESSION_KEYS: ExpressionKey[] = ["EXP_1", "EXP_2", "EXP_3"];

const DEFAULT_EXPRESSION_SET: Record<ExpressionKey, Omit<SessionExpressionDefinition, "key">> = {
  EXP_1: {
    label: "차분한 기본",
    direction: "calm neutral expression, gentle eye contact, composed professor vibe",
    reason: "전체 에피소드의 기본 대사와 안정 구간을 담당",
  },
  EXP_2: {
    label: "미소/호감",
    direction: "warm subtle smile, softened eyes, approachable and affectionate tone",
    reason: "호감 상승, 장난기, 친밀한 반응 구간에 사용",
  },
  EXP_3: {
    label: "단호/긴장",
    direction: "stern focused expression, tighter brows, disciplined professor authority",
    reason: "긴장, 경고, 압박, 당황 반응 구간을 담당",
  },
};

function isChapterId(value: string): value is ChapterId {
  return value in chapterInfoMap;
}

function isExpressionKey(value: unknown): value is ExpressionKey {
  return value === "EXP_1" || value === "EXP_2" || value === "EXP_3";
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

function toSafeText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
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

function expressionKeyByEmotion(emotion: DialogueEmotion): ExpressionKey {
  if (emotion === "warm" || emotion === "teasing") {
    return "EXP_2";
  }

  if (emotion === "stern" || emotion === "panic") {
    return "EXP_3";
  }

  return "EXP_1";
}

function buildFallbackExpressionSet() {
  return EXPRESSION_KEYS.map((key) => ({
    key,
    label: DEFAULT_EXPRESSION_SET[key].label,
    direction: DEFAULT_EXPRESSION_SET[key].direction,
    reason: DEFAULT_EXPRESSION_SET[key].reason,
  })) satisfies SessionExpressionDefinition[];
}

function normalizeExpressionSet(raw: RawExpressionDefinition[] | undefined) {
  const byKey = new Map<ExpressionKey, RawExpressionDefinition>();

  for (const item of raw ?? []) {
    if (isExpressionKey(item?.key)) {
      byKey.set(item.key, item);
    }
  }

  return EXPRESSION_KEYS.map((key, index) => {
    const fallback = DEFAULT_EXPRESSION_SET[key];
    const source = byKey.get(key) ?? raw?.[index];

    return {
      key,
      label: toSafeText(source?.label, fallback.label),
      direction: toSafeText(source?.direction, fallback.direction),
      reason: toSafeText(source?.reason, fallback.reason),
    } satisfies SessionExpressionDefinition;
  });
}

function buildFallbackSpriteCues(
  chapterIds: ChapterId[],
  normalizedChapters: Partial<Record<ChapterId, ChapterDialogue>>,
) {
  return chapterIds.reduce(
    (acc, chapterId) => {
      const dialogue = normalizedChapters[chapterId] ?? chapterFallbackDialogues[chapterId];
      acc[chapterId] = {
        dialogueExpressionKey: "EXP_1",
        choiceReactionExpressionKeys: [0, 1, 2].map((index) =>
          expressionKeyByEmotion(dialogue.choices[index].emotion),
        ) as [ExpressionKey, ExpressionKey, ExpressionKey],
      };
      return acc;
    },
    {} as Partial<Record<ChapterId, ChapterSpriteCue>>,
  );
}

function normalizeSpriteCues(
  rawSpriteCues: Record<string, RawSpriteCue | undefined> | undefined,
  chapterIds: ChapterId[],
  normalizedChapters: Partial<Record<ChapterId, ChapterDialogue>>,
) {
  const fallback = buildFallbackSpriteCues(chapterIds, normalizedChapters);

  return chapterIds.reduce(
    (acc, chapterId) => {
      const raw = rawSpriteCues?.[chapterId];
      const fallbackCue = fallback[chapterId] as ChapterSpriteCue;

      const dialogueExpressionKey = isExpressionKey(raw?.dialogueExpressionKey)
        ? raw.dialogueExpressionKey
        : fallbackCue.dialogueExpressionKey;

      const rawChoiceKeys = Array.isArray(raw?.choiceReactionExpressionKeys)
        ? raw.choiceReactionExpressionKeys
        : [];

      const choiceReactionExpressionKeys = [0, 1, 2].map((index) => {
        const candidate = rawChoiceKeys[index];
        if (isExpressionKey(candidate)) {
          return candidate;
        }

        return fallbackCue.choiceReactionExpressionKeys[index];
      }) as [ExpressionKey, ExpressionKey, ExpressionKey];

      acc[chapterId] = {
        dialogueExpressionKey,
        choiceReactionExpressionKeys,
      };
      return acc;
    },
    {} as Partial<Record<ChapterId, ChapterSpriteCue>>,
  );
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
  const fallbackExpressionSet = buildFallbackExpressionSet();
  const fallbackSpriteCues = buildFallbackSpriteCues(chapterIds, fallbackChapters);
  const gemini = createGeminiClient();

  if (!gemini) {
    return NextResponse.json({
      chapters: fallbackChapters,
      endingPolish: fallbackEndingPolish,
      expressionSet: fallbackExpressionSet,
      spriteCues: fallbackSpriteCues,
      fallback: true,
      message: "GEMINI_API_KEY가 없어 기본 세션 대사/엔딩/표정 매핑을 사용했습니다.",
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
    "중요: 표정은 반드시 3개만 설계하고, 챕터/반응에서 실제 필요 구간에만 교체하도록 cue를 작성해라.",
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
    "  },",
    '  "expressionSet": [',
    '    { "key": "EXP_1", "label": "표정명", "direction": "이미지 생성 지시문", "reason": "왜 필요한지" },',
    '    { "key": "EXP_2", "label": "표정명", "direction": "이미지 생성 지시문", "reason": "왜 필요한지" },',
    '    { "key": "EXP_3", "label": "표정명", "direction": "이미지 생성 지시문", "reason": "왜 필요한지" }',
    "  ],",
    '  "spriteCues": {',
    '    "CHAPTER_ID": {',
    '      "dialogueExpressionKey": "EXP_1 | EXP_2 | EXP_3",',
    '      "choiceReactionExpressionKeys": ["EXP_1|EXP_2|EXP_3", "EXP_1|EXP_2|EXP_3", "EXP_1|EXP_2|EXP_3"]',
    "    }",
    "  }",
    "}",
    "제약:",
    "- chapters 배열은 입력받은 chapterId를 모두 포함하고 순서를 유지.",
    "- 각 chapter의 choices는 정확히 3개.",
    "- choice 중 최소 1개는 장난기/플러팅 톤.",
    "- choices.text는 최대한 중립적으로 작성해 정답처럼 보이지 않게 한다.",
    "- effects.affinity, effects.intellect는 각각 -4~12 정수.",
    "- 교수 말투/태도는 교수 페르소나 요약을 강하게 반영.",
    "- expressionSet은 정확히 3개(EXP_1, EXP_2, EXP_3)만 작성.",
    "- spriteCues는 chapterId별로 대사 1개 + 선택지 반응 3개 키를 모두 작성.",
    "- spriteCues의 key는 expressionSet key만 사용.",
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
        maxOutputTokens: 4300,
      },
    });

    const raw = extractTextFromGeminiResponse(response);

    if (!raw) {
      return NextResponse.json({
        chapters: fallbackChapters,
        endingPolish: fallbackEndingPolish,
        expressionSet: fallbackExpressionSet,
        spriteCues: fallbackSpriteCues,
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

    const normalizedExpressionSet = normalizeExpressionSet(parsed.expressionSet);
    const normalizedSpriteCues = normalizeSpriteCues(
      parsed.spriteCues,
      chapterIds,
      normalizedChapters,
    );

    return NextResponse.json({
      chapters: normalizedChapters,
      endingPolish: normalizedEndingPolish,
      expressionSet: normalizedExpressionSet,
      spriteCues: normalizedSpriteCues,
      fallback: false,
    });
  } catch (error) {
    return NextResponse.json({
      chapters: fallbackChapters,
      endingPolish: fallbackEndingPolish,
      expressionSet: fallbackExpressionSet,
      spriteCues: fallbackSpriteCues,
      fallback: true,
      message:
        error instanceof Error
          ? `세션 생성 실패로 기본 데이터로 진행합니다: ${error.message}`
          : "세션 생성 실패로 기본 데이터로 진행합니다.",
    });
  }
}
