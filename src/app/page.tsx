"use client";

import { useEffect, useMemo, useState, useRef } from "react";

import { heartParticle } from "@/lib/heart-particle";
import {
  initialPlayerState,
  initialProfessorState,
  PlayerFormState,
  ProfessorFormState,
  ChapterChoice,
  EndingRank,
  sessionPackEpisodeIds,
  pickSixChaptersForRun,
  resolveProfessorForGeneration,
  buildProfessorSummary,
  buildIllustrationPrompt,
  clampScore100,
  playerGenderOptions,
  professorGenderOptions,
  professorSpeakingStyleOptions,
  professorFeatureSuggestions
} from "@/lib/game-data";

type Phase =
  | "screen1_title"
  | "screen2_player"
  | "screen3_professor"
  | "screen4_8_chapter"
  | "screen9_ending"
  | "screen10_reality"
  | "screen11_credit";

type EndingState = {
  rank: ReturnType<typeof getEndingRank>;
  title: string;
  description: string;
  score100: number;
};

type SessionExpressionDefinition = {
  key: string;
  label: string;
  direction: string;
  reason: string;
};

type ChapterSpriteCue = {
  dialogueExpressionKey: string;
  choiceReactionExpressionKeys: [string, string, string];
};

type SessionPackResponse = {
  chapters?: Partial<Record<ChapterId, ChapterDialogue>>;
  endingPolish?: Partial<Record<EndingRank, { title?: string; description?: string }>>;
  expressionSet?: SessionExpressionDefinition[];
  spriteCues?: Partial<Record<ChapterId, ChapterSpriteCue>>;
  fallback?: boolean;
  message?: string;
};

type ProfessorExpressionMap = Record<string, string>;

type GenerateProfessorImageResponse = {
  imageDataUrl?: string;
  expressionSet?: SessionExpressionDefinition[];
  expressionImageDataUrls?: ProfessorExpressionMap;
  promptUsed?: string;
  message?: string;
};

const initialPlayerState: PlayerFormState = {
  name: "",
  gender: "남자",
};

const initialProfessorState: ProfessorFormState = {
  name: "",
  gender: "여자",
  age: "30",
  speakingStyle: "",
  illustrationStyle: "DESIGN_3_CAMPUS_VISUAL_NOVEL",
  feature1: "",
  feature2: "",
  feature3: "",
  feature4: "",
  customPrompt: "",
};

const preGameBackgroundImageUrl = "/backgrounds/pre-game-bg.webp";
const mainCoverImageUrl = "/backgrounds/screen1-cover.webp";

function toDisplayPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "김멋사";
  }

  return trimmed.slice(0, 3);
}

function toDisplayProfessorName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "이름 미정 교수";
}

function toRealityProfessorLabel(name: string) {
  const base = toDisplayProfessorName(name);

  if (base.endsWith("교수님")) {
    return base;
  }

  if (base.endsWith("교수")) {
    return `${base}님`;
  }

  return `${base} 교수님`;
}

function choiceScore(choice: ChapterChoice) {
  const sum = choice.effects.affinity + choice.effects.intellect;
  return Math.max(0, Math.min(20, sum));
}

function stripProfessorPrefix(text: string) {
  return text
    .replace(/^\s*(교수님?|professor)\s*[:：]\s*/i, "")
    .replace(/^\s*(교수님?|professor)\s*[:：]\s*/i, "")
    .trim();
}

function getAffinityMood(percent: number) {
  if (percent >= 80) {
    return "두근두근";
  }

  if (percent >= 60) {
    return "호감 상승";
  }

  if (percent >= 35) {
    return "분위기 탐색";
  }

  return "어색한 시작";
}

function normalizeExpressionSet(
  raw: SessionExpressionDefinition[] | undefined,
): SessionExpressionDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: SessionExpressionDefinition[] = [];

  raw.forEach((item) => {
    const key = typeof item?.key === "string" ? item.key.trim() : "";
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push({
      key,
      label: typeof item?.label === "string" && item.label.trim().length > 0 ? item.label.trim() : key,
      direction: typeof item?.direction === "string" ? item.direction.trim() : "",
      reason: typeof item?.reason === "string" ? item.reason.trim() : "",
    });
  });

  return normalized;
}

function normalizeSpriteCueMap(
  raw: Partial<Record<ChapterId, ChapterSpriteCue>> | undefined,
): Partial<Record<ChapterId, ChapterSpriteCue>> {
  if (!raw) {
    return {};
  }

  return (Object.keys(raw) as ChapterId[]).reduce(
    (acc, chapterId) => {
      const source = raw[chapterId];
      const dialogueExpressionKey =
        typeof source?.dialogueExpressionKey === "string"
          ? source.dialogueExpressionKey.trim()
          : "";
      const sourceChoices = Array.isArray(source?.choiceReactionExpressionKeys)
        ? source.choiceReactionExpressionKeys
        : [];

      const choiceReactionExpressionKeys = [0, 1, 2].map((index) => {
        const candidate = sourceChoices[index];
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          return candidate.trim();
        }

        return dialogueExpressionKey;
      }) as [string, string, string];

      if (!dialogueExpressionKey || choiceReactionExpressionKeys.some((key) => !key)) {
        return acc;
      }

      acc[chapterId] = {
        dialogueExpressionKey,
        choiceReactionExpressionKeys,
      };
      return acc;
    },
    {} as Partial<Record<ChapterId, ChapterSpriteCue>>,
  );
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const HANGUL_MEDIAL_COUNT = 21;
const HANGUL_FINAL_COUNT = 28;
const HANGUL_INITIAL_BLOCK = HANGUL_MEDIAL_COUNT * HANGUL_FINAL_COUNT;
const HANGUL_INITIAL_COMPAT = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

function isHangulSyllable(char: string) {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_LAST;
}

function buildHangulTypingFrames(text: string) {
  const frames: string[] = [];
  let committed = "";

  const pushFrame = (value: string) => {
    if (frames[frames.length - 1] !== value) {
      frames.push(value);
    }
  };

  for (const char of text) {
    if (!isHangulSyllable(char)) {
      committed += char;
      pushFrame(committed);
      continue;
    }

    const syllableIndex = char.charCodeAt(0) - HANGUL_BASE;
    const initialIndex = Math.floor(syllableIndex / HANGUL_INITIAL_BLOCK);
    const medialIndex = Math.floor((syllableIndex % HANGUL_INITIAL_BLOCK) / HANGUL_FINAL_COUNT);
    const finalIndex = syllableIndex % HANGUL_FINAL_COUNT;
    const withoutFinalCharCode =
      HANGUL_BASE + (initialIndex * HANGUL_MEDIAL_COUNT + medialIndex) * HANGUL_FINAL_COUNT;
    const withoutFinal = String.fromCharCode(withoutFinalCharCode);

    pushFrame(`${committed}${HANGUL_INITIAL_COMPAT[initialIndex]}`);
    pushFrame(`${committed}${withoutFinal}`);

    if (finalIndex > 0) {
      pushFrame(`${committed}${char}`);
    }

    committed += char;
  }

  return frames.length > 0 ? frames : [text];
}

export default function Home() {
  // BGM URL 상수 (실제 경로에 맞게 수정)
  const MAIN_BGM_URL = "/ui/main-bgm.mp3";

  // SessionPackResponse 타입 임시 선언 (실제 API 응답 구조에 맞게 수정)
  type SessionPackResponse = {
    chapters?: any;
    endingPolish?: any;
    fallback?: boolean;
    message?: string;
  };

  // particleCanvasRef 선언
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 유틸 함수: 플레이어/교수 정보 업데이트
  function updatePlayer<K extends keyof PlayerFormState>(key: K, value: PlayerFormState[K]) {
    setPlayer((prev) => ({ ...prev, [key]: value }));
  }
  function updateProfessor<K extends keyof ProfessorFormState>(key: K, value: ProfessorFormState[K]) {
    setProfessor((prev) => ({ ...prev, [key]: value }));
  }

  // BGM 토글 함수
  function toggleBgm() {
    setIsBgmOn((prev) => !prev);
    if (audioRef.current) {
      if (!isBgmOn) audioRef.current.play();
      else audioRef.current.pause();
    }
  }

  // 교수 생성 및 스토리 시작 함수 (실제 로직에 맞게 수정)
  function makeProfessorAndStartStory() {
    generateProfessorImage().then(() => startStory());
  }

  // 선택지 클릭 함수 (실제 로직에 맞게 수정)
  function chooseOption(index: number) {
    setSelectedChoiceIndex(index);
    // 예시: 호감도 증가 등 처리 추가 가능
  }



  // 호감도 증가량 표시 상태
  const [affinityDelta, setAffinityDelta] = useState<number | null>(null);
  const affinityDeltaTimer = useRef<NodeJS.Timeout | null>(null);
  const [phase, setPhase] = useState<Phase>("screen1_title");

  const [player, setPlayer] = useState<PlayerFormState>(initialPlayerState);
  const [professor, setProfessor] = useState<ProfessorFormState>(initialProfessorState);

  const [isBgmOn, setIsBgmOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isBgmOn) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error("BGM 재생 실패:", err));
    }
    setIsBgmOn(!isBgmOn);
  };

  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [generatedExpressionImageUrls, setGeneratedExpressionImageUrls] =
    useState<ProfessorExpressionMap>({});
  const [imageMessage, setImageMessage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [sessionPackMessage, setSessionPackMessage] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [rawScore, setRawScore] = useState(0);
  const [ending, setEnding] = useState<any>(null);
  const [sessionDialogues, setSessionDialogues] = useState<any>({});
  const [sessionEndingPolish, setSessionEndingPolish] = useState<any>({});
  const [storyLog, setStoryLog] = useState<string[]>([]);
  const [isCreditFinished, setIsCreditFinished] = useState(false);
  const [isPreparingSession, setIsPreparingSession] = useState(false);
  const [sessionPackMessage, setSessionPackMessage] = useState("");
  const [sessionDialogues, setSessionDialogues] = useState<
    Partial<Record<ChapterId, ChapterDialogue>>
  >({});
  const [sessionExpressionSet, setSessionExpressionSet] = useState<
    SessionExpressionDefinition[]
  >([]);
  const [sessionSpriteCues, setSessionSpriteCues] = useState<
    Partial<Record<ChapterId, ChapterSpriteCue>>
  >({});
  const [sessionEndingPolish, setSessionEndingPolish] = useState<
    Partial<Record<EndingRank, { title: string; description: string }>>
  >({});
  const [typedProfessorLine, setTypedProfessorLine] = useState("");

  const playerName = useMemo(() => toDisplayPlayerName(player.name), [player.name]);
  const professorName = useMemo(() => toDisplayProfessorName(professor.name), [professor.name]);
  const realityProfessorName = useMemo(
    () => toRealityProfessorLabel(professor.name),
    [professor.name],
  );

  const currentChapterId = selectedChapterIds[chapterIndex];
  const currentChapterInfo = currentChapterId ? chapterInfoMap[currentChapterId] : null;
  const currentDialogue = currentChapterId
    ? sessionDialogues[currentChapterId] ?? chapterFallbackDialogues[currentChapterId]
    : null;
  const currentSelectedChoice =
    selectedChoiceIndex !== null && currentDialogue
      ? currentDialogue.choices[selectedChoiceIndex]
      : null;
  const endingBackdrop = useMemo(() => {
    const finalEpisodeId = selectedChapterIds[selectedChapterIds.length - 1] ?? "NIGHT_SELF_STUDY";
    return chapterInfoMap[finalEpisodeId]?.backdrop ?? preGameBackgroundImageUrl;
  }, [selectedChapterIds]);
  const activeProfessorLine = stripProfessorPrefix(
    selectedChoiceIndex === null ? currentDialogue?.dialogue ?? "" : currentSelectedChoice?.reaction ?? "",
  );
  const isProfessorLineTyping =
    phase === "screen4_8_chapter" &&
    selectedChoiceIndex === null &&
    activeProfessorLine.length > 0 &&
    typedProfessorLine !== activeProfessorLine;
  const shouldShowChoiceOverlay = selectedChoiceIndex === null && !isProfessorLineTyping;
  const activeProfessorImageUrl = useMemo(() => {
    if (!generatedImageUrl) {
      return "";
    }

    const chapterCue = currentChapterId ? sessionSpriteCues[currentChapterId] : undefined;
    const selectedExpressionKey =
      selectedChoiceIndex === null
        ? chapterCue?.dialogueExpressionKey
        : chapterCue?.choiceReactionExpressionKeys?.[selectedChoiceIndex];

    if (
      selectedExpressionKey &&
      typeof generatedExpressionImageUrls[selectedExpressionKey] === "string"
    ) {
      return generatedExpressionImageUrls[selectedExpressionKey];
    }

    return generatedImageUrl;
  }, [
    currentChapterId,
    generatedExpressionImageUrls,
    generatedImageUrl,
    selectedChoiceIndex,
    sessionSpriteCues,
  ]);
  const expressionPreviewEntries = useMemo(() => {
    const ordered = sessionExpressionSet
      .map((expression) => ({
        key: expression.key,
        label: expression.label,
        src: generatedExpressionImageUrls[expression.key],
      }))
      .filter(
        (
          entry,
        ): entry is {
          key: string;
          label: string;
          src: string;
        } => typeof entry.src === "string" && entry.src.length > 0,
      );

    if (ordered.length > 0) {
      return ordered;
    }

    return Object.entries(generatedExpressionImageUrls)
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0,
      )
      .map(([key, src]) => ({
        key,
        label: key,
        src,
      }));
  }, [generatedExpressionImageUrls, sessionExpressionSet]);

  const affinityPercent =
    selectedChapterIds.length > 0
      ? Math.min(
          100,
          Math.round(
            (Math.max(0, rawScore) / Math.max(1, selectedChapterIds.length * 20)) * 100,
          ),
        )
      : 0;
  const affinityMood = getAffinityMood(affinityPercent);

  useEffect(() => {
    if (phase !== "screen4_8_chapter") {
      setTypedProfessorLine("");
      return;
    }

    const line = activeProfessorLine.trim();

    if (!line) {
      setTypedProfessorLine("");
      return;
    }

    const frames = buildHangulTypingFrames(line);
    setTypedProfessorLine(frames[0] ?? "");

    if (frames.length <= 1) {
      return;
    }

    let frameIndex = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      frameIndex += 1;

      if (frameIndex >= frames.length) {
        return;
      }

      setTypedProfessorLine(frames[frameIndex]);
      timer = setTimeout(tick, 52);
    };

  // 유틸 변수들 (상태 변수 선언 이후에 위치)
  const playerName = player.name && player.name.trim() ? player.name.trim() : "김멋사";
  const currentDialogue = sessionDialogues[selectedChapterIds[chapterIndex]];
  // endingMeta는 실제로는 game-data.ts에 정의되어 있어야 함. 임시로 아래와 같이 선언 (실제 구현에 맞게 수정 필요)
  const endingMeta: Record<EndingRank, { title: string; description: string }> = {
    ENDING_A_PLUS: { title: "A+ 엔딩", description: "최고의 엔딩입니다." },
    ENDING_B_PLUS: { title: "B+ 엔딩", description: "좋은 엔딩입니다." },
    ENDING_C_PLUS: { title: "C+ 엔딩", description: "보통 엔딩입니다." },
    ENDING_F: { title: "F 엔딩", description: "아쉬운 엔딩입니다." },
  };

  // getEndingRank 함수도 임시 선언 (실제 구현에 맞게 수정 필요)
  function getEndingRank(score100: number): EndingRank {
    if (score100 >= 90) return "ENDING_A_PLUS";
    if (score100 >= 70) return "ENDING_B_PLUS";
    if (score100 >= 50) return "ENDING_C_PLUS";
    return "ENDING_F";
  }

  // --- 상태 변수 선언 이후에 유틸 변수 선언 ---
  // 실제 로직에 맞게 수정 필요
  const currentChapterInfo = selectedChapterIds[chapterIndex]
    ? (window as any).chapterInfoMap?.[selectedChapterIds[chapterIndex]] || { title: "", location: "", backdrop: "" }
    : { title: "", location: "", backdrop: "" };
  const affinityMood = "호감 상승";
  const affinityPercent = 80;
  const professorName = professor.name || "이름 미정";
  const typedProfessorLine = "";
  const endingBackdrop = "/backgrounds/ending-bg.webp";
  const finalRealityLine = "오늘도 수고했어요!";
  const realityProfessorName = professor.name || "이름 미정";
  // shouldShowChoiceOverlay 임시 선언 (실제 로직에 맞게 수정)
  const shouldShowChoiceOverlay = false;


  function goScreen2() {
    setPhase("screen2_player");
  }

  function confirmPlayerInfo() {
    const normalizedName = toDisplayPlayerName(player.name);
    setPlayer((current) => ({ ...current, name: normalizedName }));
    setPhase("screen3_professor");
  }

  async function generateProfessorImage(options?: {
    resolvedProfessor?: ProfessorFormState;
    expressionSet?: SessionExpressionDefinition[];
  }) {
    const resolvedProfessor = options?.resolvedProfessor ?? resolveProfessorForGeneration(professor);
    const resolvedProfessorName = toDisplayProfessorName(resolvedProfessor.name);
    const normalizedExpressionSet = normalizeExpressionSet(options?.expressionSet);

    setProfessor(resolvedProfessor);
    setImageMessage("");
    setGeneratedExpressionImageUrls({});
    setIsGeneratingImage(true);

    try {
      const response = await fetch("/api/generate-professor-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professorName: resolvedProfessorName,
          professorSummary: buildProfessorSummary(resolvedProfessor),
          illustrationPrompt: buildIllustrationPrompt(resolvedProfessor),
          expressionSet: normalizedExpressionSet.length > 0 ? normalizedExpressionSet : undefined,
        }),
      });

      const data = (await response.json()) as GenerateProfessorImageResponse;

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.message || "교수 이미지 생성 실패");
      }

      setGeneratedImageUrl(data.imageDataUrl);
      setGeneratedExpressionImageUrls(data.expressionImageDataUrls ?? {});
      const returnedExpressionSet = normalizeExpressionSet(data.expressionSet);
      if (returnedExpressionSet.length > 0) {
        setSessionExpressionSet(returnedExpressionSet);
      } else if (normalizedExpressionSet.length > 0) {
        setSessionExpressionSet(normalizedExpressionSet);
      }
      const expressionCount = Object.values(data.expressionImageDataUrls ?? {}).filter(
        (value) => typeof value === "string" && value.length > 0,
      ).length;
      setImageMessage(
        data.message ||
          `교수님 생성이 완료되었습니다. (${expressionCount > 0 ? `표정 ${expressionCount}종 포함` : "기본 이미지"})`,
      );
    } catch (error) {
      setGeneratedImageUrl("");
      setGeneratedExpressionImageUrls({});
      setImageMessage(
        error instanceof Error
          ? `이미지 생성 실패: ${error.message}`
          : "이미지 생성 실패",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function prepareSessionPack(
    resolvedProfessor: ProfessorFormState,
    runChapters: ChapterId[],
  ) {
    const professorNameForPrompt = toDisplayProfessorName(resolvedProfessor.name);
    const professorSummaryForPrompt = buildProfessorSummary(resolvedProfessor);
    let normalizedExpressionSet: SessionExpressionDefinition[] = [];

    setIsPreparingSession(true);
    setSessionPackMessage("세션 스토리를 준비 중입니다...");
    setProfessor(resolvedProfessor);
    setSelectedChapterIds(runChapters);
    setChapterIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setEnding(null);
    setSessionDialogues({});
    setSessionExpressionSet([]);
    setSessionSpriteCues({});
    setSessionEndingPolish({});
    setStoryLog([
      `${playerName}(${player.gender})의 시험기간 시뮬레이션 시작`,
      `${toDisplayProfessorName(resolvedProfessor.name)} 교수님과의 첫 만남이 시작되었다.`,
    ]);

    try {
      const response = await fetch("/api/generate-session-pack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterIds: sessionPackEpisodeIds,
          playerName,
          professorName: professorNameForPrompt,
          professorSummary: professorSummaryForPrompt,
        }),
      });

      const data = (await response.json()) as SessionPackResponse;

      if (!response.ok) {
        throw new Error(data.message || "세션 스토리 생성 실패");
      }

      if (data.chapters) {
        setSessionDialogues(data.chapters);
      }

      normalizedExpressionSet = normalizeExpressionSet(data.expressionSet);
      setSessionExpressionSet(normalizedExpressionSet);
      setSessionSpriteCues(normalizeSpriteCueMap(data.spriteCues));

      if (data.endingPolish) {
        const normalizedEndingPolish: Partial<
          Record<EndingRank, { title: string; description: string }>
        > = {};

        (Object.keys(endingMeta) as EndingRank[]).forEach((rank) => {
          const polished = data.endingPolish?.[rank];
          const title =
            typeof polished?.title === "string" && polished.title.trim().length > 0
              ? polished.title.trim()
              : endingMeta[rank].title;
          const description =
            typeof polished?.description === "string" &&
            polished.description.trim().length > 0
              ? polished.description.trim()
              : endingMeta[rank].description;

          normalizedEndingPolish[rank] = { title, description };
        });

        setSessionEndingPolish(normalizedEndingPolish);
      }

      if (data.fallback) {
        setSessionPackMessage(data.message || "기본 챕터 대사/엔딩으로 시작합니다.");
      } else {
        setSessionPackMessage("세션 스토리 준비 완료");
      }
    } catch (error) {
      setSessionPackMessage(
        error instanceof Error
          ? `세션 생성 실패: ${error.message}. 기본 데이터로 시작합니다.`
          : "세션 생성 실패로 기본 데이터로 시작합니다.",
      );
      setSessionExpressionSet([]);
      setSessionSpriteCues({});
    } finally {
      setIsPreparingSession(false);
    }

    return normalizedExpressionSet;
  }

  async function startStory() {
    if (isPreparingSession) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const runChapters = pickSixChaptersForRun();

    await prepareSessionPack(resolvedProfessor, runChapters);
    setPhase("screen4_8_chapter");
  }

  async function makeProfessorAndStartStory() {
    if (isGeneratingImage || isPreparingSession) {
      return;
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const runChapters = pickSixChaptersForRun();

    const expressionSetFromSession = await prepareSessionPack(resolvedProfessor, runChapters);
    await generateProfessorImage({
      resolvedProfessor,
      expressionSet: expressionSetFromSession,
    });
    setPhase("screen4_8_chapter");
  }

  function chooseOption(choiceIndex: number) {
    if (!currentDialogue || selectedChoiceIndex !== null) {
      return;
    }

    const choice = currentDialogue.choices[choiceIndex];

    setSelectedChoiceIndex(choiceIndex);
    setRawScore((current) => current + choiceScore(choice));
    if (currentChapterId === "MORNING_CLASSROOM") {
      const lunchEpisode = morningLunchBranchByChoice[choiceIndex as 0 | 1 | 2];
      setSelectedChapterIds((current) => {
        if (current.length < 3) {
          return current;
        }

        const next = [...current];
        next[2] = lunchEpisode;
        return next;
      });
    }

    if (currentChapterId === "LIGHT_DINNER") {
      const nightEpisode = dinnerNightBranchByChoice[choiceIndex as 0 | 1 | 2];
      setSelectedChapterIds((current) => {
        if (current.length < 6) {
          return current;
        }

        const next = [...current];
        next[5] = nightEpisode;
        return next;
      });
    }

    setStoryLog((current) => [
      ...current,
      `[${chapterIndex + 1}에피소드] ${choice.text}`,
      choice.reaction,
    ]);
  }

  function moveNextChapter() {
    if (!currentDialogue || selectedChoiceIndex === null) {
      return;
    }

    const nextIndex = chapterIndex + 1;

    if (nextIndex < selectedChapterIds.length) {
      setChapterIndex(nextIndex);
      setSelectedChoiceIndex(null);
      return;
    }

    const score100 = clampScore100(rawScore, selectedChapterIds.length);
    const rank = getEndingRank(score100);
    const endingTemplate = endingMeta[rank];
    const polishedEnding = sessionEndingPolish[rank];

    setEnding({
      rank,
      title: polishedEnding?.title || endingTemplate.title,
      description: polishedEnding?.description || endingTemplate.description,
      score100,
    });
    setPhase("screen9_ending");
  }

  function goRealityScreen() {
    setPhase("screen10_reality");
  }

  function goCreditScreen() {
    setIsCreditFinished(false);
    setPhase("screen11_credit");
  }

  function resetToMain() {
    setPhase("screen1_title");
    setPlayer(initialPlayerState);
    setProfessor(initialProfessorState);
    setGeneratedImageUrl("");
    setGeneratedExpressionImageUrls({});
    setImageMessage("");
    setSelectedChapterIds([]);
    setChapterIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setStoryLog([]);
    setEnding(null);
    setIsCreditFinished(false);
    setIsPreparingSession(false);
    setSessionPackMessage("");
    setSessionDialogues({});
    setSessionExpressionSet([]);
    setSessionSpriteCues({});
    setSessionEndingPolish({});
  }

  return (
    <main className="min-h-screen text-black">
      {/* BGM 컨트롤 버튼 (우측 상단 고정) */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col items-end gap-2">
        <button
          onClick={toggleBgm}
          className={`w-14 h-14 flex items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 border-[3px] ${
            isBgmOn 
              ? "bg-[#ffb8d5] border-white text-white" 
              : "bg-white border-[#ffb8d5] text-[#ffb8d5]"
          }`}
          aria-label={isBgmOn ? "BGM 끄기" : "BGM 켜기"}
        >
          {isBgmOn ? <Volume2 size={32} strokeWidth={2.5} /> : <VolumeX size={32} strokeWidth={2.5} />}
        </button>
        {/* 실제 오디오 태그 */}
        <audio ref={audioRef} src={MAIN_BGM_URL} loop />
      </div>

      {phase === "screen1_title" && (
        <section
          className="relative flex min-h-screen cursor-pointer items-end justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10"
          onClick={goScreen2}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              goScreen2();
            }
          }}
        >
          <div className="absolute inset-0 bg-[#f1c8da]" />
          <div
            className="absolute inset-0 scale-[1.06] bg-cover bg-center opacity-55 blur-[8px]"
            style={{ backgroundImage: `url(${mainCoverImageUrl})` }}
          />
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url(${mainCoverImageUrl})`,
              backgroundPosition: "center center",
              backgroundSize: "contain",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(255,199,226,0.58),rgba(255,199,226,0)_52%),radial-gradient(circle_at_14%_84%,rgba(255,193,221,0.56),rgba(255,193,221,0)_56%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,208,227,0.08),rgba(64,20,42,0.52))]" />

          <div className="relative z-10 mx-auto w-full max-w-[1120px] px-2 text-center md:px-4">
            <h1 className="text-[clamp(42px,6.6vw,110px)] font-black leading-[1.01] tracking-[-0.04em] text-[#ffd6e7] [text-shadow:_0_4px_0_#8c3f64,_0_9px_26px_rgba(38,10,24,0.5)]">
              ♡교수님과 두근두근♡
              <br />
              시험기간 시뮬레이션
            </h1>
            <p className="screen1-touch-guide mt-4 text-[clamp(18px,2.2vw,34px)] font-bold leading-none text-white [text-shadow:_0_2px_10px_rgba(0,0,0,0.82)]">
              화면을 클릭하여 게임을 시작해 주세요
            </p>
          </div>
        </section>
      )}

      {phase === "screen2_player" && (
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, rgba(69,20,44,0.28), rgba(61,18,40,0.44))",
              `url(${preGameBackgroundImageUrl})`,
              "radial-gradient(circle at 82% 16%, rgba(255,176,212,0.58), rgba(255,176,212,0) 52%)",
              "radial-gradient(circle at 16% 82%, rgba(255,188,217,0.55), rgba(255,188,217,0) 55%)",
              "linear-gradient(135deg, #d98baa 0%, #e9a9c2 28%, #f6c6d8 54%, #e1a1bf 100%)",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="w-full max-w-[980px] text-center">
            <h2 className="text-[clamp(56px,8vw,112px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8b3a60,_0_12px_30px_rgba(0,0,0,0.45)]">
              당신의 이름과 성별은?
            </h2>

            <div className="mx-auto mt-8 max-w-[760px] rounded-[26px] border-4 border-[#c6809e] bg-[rgba(255,237,245,0.55)] px-6 py-8 shadow-[0_14px_38px_rgba(72,20,45,0.2)] backdrop-blur-[3px] md:px-8 md:py-10">
              <input
                value={player.name}
                onChange={(event) => updatePlayer("name", event.target.value)}
                className="h-16 w-full rounded-2xl border-[3px] border-[#bb6f91] bg-white/92 px-4 text-center text-3xl font-semibold text-[#4d1d37] outline-none placeholder:text-[#b57d94] focus:ring-2 focus:ring-[#d778a1]/65"
                placeholder="이름은 최대 3자까지 가능합니다."
                maxLength={3}
              />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                {playerGenderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updatePlayer("gender", option.value)}
                    className={`min-w-[128px] rounded-full border-[3px] px-6 py-2 text-3xl font-bold transition ${
                      player.gender === option.value
                        ? "border-[#b15f84] bg-[linear-gradient(180deg,#ffd8ea,#f7a9c8)] text-[#5d1e3c] shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_6px_12px_rgba(0,0,0,0.18)]"
                        : "border-[#c798ad] bg-white/78 text-[#6a2a49] hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="mt-6 text-[clamp(28px,3vw,46px)] font-semibold leading-[1.3] text-[#6a2a49]">
                이름을 입력하지 않을 시
                <br />
                [김멋사]로 자동 설정 됩니다.
              </p>
            </div>

            <button
              type="button"
              onClick={confirmPlayerInfo}
              className="screen2-confirm-btn mt-8"
            >
              <span className="screen2-confirm-gloss" aria-hidden />
              <span className="screen2-confirm-line screen2-confirm-line-vertical" aria-hidden />
              <span className="screen2-confirm-line screen2-confirm-line-horizontal" aria-hidden />
              <span className="screen2-confirm-heart screen2-confirm-heart-left" aria-hidden>
                ♡
              </span>
              <span className="screen2-confirm-label">확인</span>
              <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                ♡
              </span>
            </button>
          </div>
        </section>
      )}

      {phase === "screen3_professor" && (
        <section
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 md:px-8 md:py-8"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, rgba(67,20,42,0.3), rgba(69,16,41,0.48))",
              `url(${preGameBackgroundImageUrl})`,
              "radial-gradient(circle at 80% 18%, rgba(255,188,219,0.56), rgba(255,188,219,0) 54%)",
              "radial-gradient(circle at 14% 82%, rgba(255,194,219,0.53), rgba(255,194,219,0) 56%)",
              "linear-gradient(145deg, #d892b0 0%, #e5aac3 34%, #f8d4e4 58%, #d895b5 100%)",
            ].join(", "),
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="w-full max-w-[1240px] text-center">
            <h2 className="text-[clamp(56px,8vw,108px)] font-black leading-none tracking-[-0.03em] text-[#ffb8d5] [text-shadow:_0_4px_0_#8a3a5f,_0_12px_30px_rgba(0,0,0,0.45)]">
              교수님 생성
            </h2>

            <article className="mx-auto mt-5 rounded-[28px] border-4 border-[#be809d] bg-[rgba(255,239,246,0.55)] px-5 py-5 shadow-[0_14px_40px_rgba(68,18,40,0.2)] backdrop-blur-[4px] md:px-8 md:py-7">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">이름</label>
                    <input
                      value={professor.name}
                      onChange={(event) => updateProfessor("name", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="교수 이름"
                    />
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <span className="text-[44px] font-bold leading-none text-[#5f213f]">성별</span>
                    <div className="flex gap-2">
                      {professorGenderOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateProfessor("gender", option.value)}
                          className={`h-16 min-w-[120px] rounded-full border-[3px] text-[44px] font-bold leading-none transition ${
                            professor.gender === option.value
                              ? "border-[#b05f84] bg-[linear-gradient(180deg,#ffd8ea,#f7a9c8)] text-[#5e1f3e] shadow-[inset_0_2px_0_rgba(255,255,255,0.82),0_6px_12px_rgba(0,0,0,0.18)]"
                              : "border-[#c99aae] bg-white/80 text-[#6b2b4a] hover:bg-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">나이</label>
                    <input
                      value={professor.age}
                      onChange={(event) => updateProfessor("age", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="예: 30"
                    />
                  </div>

                  <div className="grid grid-cols-[92px_1fr] items-center gap-3">
                    <label className="text-[44px] font-bold leading-none text-[#5f213f]">말투</label>
                    <select
                      value={professor.speakingStyle}
                      onChange={(event) => updateProfessor("speakingStyle", event.target.value)}
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none focus:ring-2 focus:ring-[#d977a1]/60"
                    >
                      <option value="">선택</option>
                      {professorSpeakingStyleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소1
                    </label>
                    <input
                      value={professor.feature1}
                      onChange={(event) => updateProfessor("feature1", event.target.value)}
                      list="feature1-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="헤어스타일"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소2
                    </label>
                    <input
                      value={professor.feature2}
                      onChange={(event) => updateProfessor("feature2", event.target.value)}
                      list="feature2-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="눈매"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소3
                    </label>
                    <input
                      value={professor.feature3}
                      onChange={(event) => updateProfessor("feature3", event.target.value)}
                      list="feature3-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="코/얼굴형"
                    />
                  </div>

                  <div className="grid grid-cols-[132px_1fr] items-center gap-3">
                    <label className="whitespace-nowrap text-[44px] font-bold leading-none text-[#5f213f]">
                      요소4
                    </label>
                    <input
                      value={professor.feature4}
                      onChange={(event) => updateProfessor("feature4", event.target.value)}
                      list="feature4-options"
                      className="h-16 rounded-3xl border-[3px] border-[#b87695] bg-white/92 px-4 text-2xl font-semibold text-[#58203b] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60"
                      placeholder="입꼬리/피부톤"
                    />
                  </div>
                </div>
              </div>

              <datalist id="feature1-options">
                {professorFeatureSuggestions.feature1.map((option) => (
                  <option key={`feature1-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature2-options">
                {professorFeatureSuggestions.feature2.map((option) => (
                  <option key={`feature2-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature3-options">
                {professorFeatureSuggestions.feature3.map((option) => (
                  <option key={`feature3-${option}`} value={option} />
                ))}
              </datalist>
              <datalist id="feature4-options">
                {professorFeatureSuggestions.feature4.map((option) => (
                  <option key={`feature4-${option}`} value={option} />
                ))}
              </datalist>

              <div className="mt-5 rounded-3xl border-[3px] border-[#c186a3] bg-[rgba(255,241,247,0.6)] px-4 py-4 md:px-6">
                <p className="text-[clamp(30px,3.2vw,46px)] font-bold leading-[1.22] text-[#5f223f]">
                  그 외 원하는 교수님에 대한 요구사항을 작성해주세요!
                  <br />
                  (AI를 통해 반영해드립니다.)
                </p>
                <textarea
                  value={professor.customPrompt}
                  onChange={(event) => updateProfessor("customPrompt", event.target.value)}
                  className="mt-3 h-28 w-full rounded-2xl border-[3px] border-[#be7898] bg-white/92 px-4 py-3 text-xl font-medium text-[#5a1f3a] outline-none placeholder:text-[#b68198] focus:ring-2 focus:ring-[#d977a1]/60 md:h-32 md:text-2xl"
                  placeholder="ex) 항상 무뚝뚝하고 차갑지만 나와 둘이 있을 때는 다정함, 강아지상의 초미남"
                />
              </div>

              <p className="mt-3 text-[clamp(22px,2.3vw,34px)] font-semibold leading-[1.2] text-[#5a1f39]">
                전부 입력, 및 선택하셨으면 &apos;만들기&apos;를 눌러주세요
                <br />
                (최대 3번까지 생성 가능합니다.)
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={makeProfessorAndStartStory}
                  disabled={isGeneratingImage || isPreparingSession}
                  className="screen2-confirm-btn screen3-create-btn disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="screen2-confirm-gloss" aria-hidden />
                  <span
                    className="screen2-confirm-line screen2-confirm-line-vertical"
                    aria-hidden
                  />
                  <span
                    className="screen2-confirm-line screen2-confirm-line-horizontal"
                    aria-hidden
                  />
                  <span className="screen2-confirm-heart screen2-confirm-heart-left" aria-hidden>
                    ♡
                  </span>
                  <span className="screen2-confirm-label">
                    {isGeneratingImage || isPreparingSession ? "생성중..." : "만들기"}
                  </span>
                  <span className="screen2-confirm-heart screen2-confirm-heart-right" aria-hidden>
                    ♡
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startStory}
                  disabled={isPreparingSession || isGeneratingImage}
                  className="rounded-full border-2 border-[#b87995] bg-white/80 px-7 py-2 text-xl font-semibold text-[#5c223e] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPreparingSession || isGeneratingImage ? "준비 중..." : "스토리만 바로 시작"}
                </button>
              </div>

              {generatedImageUrl && (
                <div className="mx-auto mt-4 max-w-[420px] rounded-2xl border-[3px] border-[#bf7e9f] bg-[rgba(255,242,248,0.72)] p-3">
                  <p className="text-[22px] font-semibold text-[#5e2240]">생성 예시 이미지</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generatedImageUrl}
                    alt="생성된 교수 이미지 예시"
                    className="mt-2 h-auto w-full rounded-xl border-2 border-[#c78ea8] object-cover shadow-[0_8px_18px_rgba(71,22,43,0.2)]"
                  />
                  {expressionPreviewEntries.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {expressionPreviewEntries.map((entry) => (
                        <div
                          key={entry.key}
                          className="rounded-lg border border-[#c78ea8] bg-white/70 p-1"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.src}
                            alt={`${entry.label} 표정`}
                            className="h-24 w-full rounded-md object-cover"
                          />
                          <p className="mt-1 text-center text-sm font-semibold text-[#5e2240]">
                            {entry.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {imageMessage && <p className="mt-2 text-lg text-[#612842]">{imageMessage}</p>}
              {sessionPackMessage && (
                <p className="mt-1 text-base text-[#67314a]">{sessionPackMessage}</p>
              )}
            </article>
          </div>
        </section>
      )}

      {phase === "screen4_8_chapter" && currentChapterInfo && currentDialogue && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentChapterInfo.backdrop})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(44,14,33,0.22),rgba(34,10,27,0.58))]" />
          <div className="episode-soft-pink-tint absolute inset-0" />
          {shouldShowChoiceOverlay && (
            <div
              className="absolute inset-0 z-10 bg-[rgba(32,8,21,0.36)] backdrop-blur-[2.4px]"
              aria-hidden
            />
          )}

          <div className="relative z-20 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-8 md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full max-w-[340px] rounded-xl border border-white/40 bg-black/45 px-4 py-3 text-white relative shadow-lg heart-gauge-container">
                {/* 파티클 캔버스 */}
                <canvas ref={particleCanvasRef} width={180} height={44} className="absolute left-8 top-4 pointer-events-none z-10" style={{width:180, height:44}} />
                {/* 칭호 */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#ff4f81] tracking-wide font-gothic">{affinityMood}</span>
                  <span className="text-xs font-bold text-white/80 font-gothic">{Math.round(affinityPercent)}/100</span>
                </div>
                <div className="relative flex items-center">
                  {/* 하트 아이콘 */}
                  <img src="/ui/heart-gauge.svg" alt="호감도" className="w-7 h-7 mr-2 drop-shadow-heart" draggable="false" />
                  {/* 게이지 바 */}
                  <div className="relative flex-1 h-7 overflow-visible">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-4 rounded-full bg-[#2a1a22] opacity-70 shadow-gauge-glow" />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-4 rounded-full heart-gauge-bar transition-[width] duration-700 ease-out"
                      style={{ width: `${affinityPercent}%` }}
                    />
                    {/* 바운스 효과용 끝점 */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full heart-gauge-knob"
                      style={{ left: `calc(${affinityPercent}% - 12px)` }}
                    />
                  </div>
                  {/* +xx 애니메이션 */}
                  {affinityDelta !== null && (
                    <span
                      className="affinity-delta-anim absolute left-[60px] top-[-28px] select-none text-[22px] font-extrabold text-[#ff4f81] font-gothic drop-shadow"
                      aria-live="polite"
                    >
                      {`+${affinityDelta}`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded bg-black/45 px-4 py-2 text-sm text-white">
              EPISODE {chapterIndex + 1} / 6 · {currentChapterInfo.title} · {currentChapterInfo.location}
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[260px] md:pb-[300px]">
              {activeProfessorImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeProfessorImageUrl}
                  alt={`${professorName} 교수 스프라이트`}
                  className="max-h-[72vh] w-auto object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="rounded-2xl border border-white/70 bg-white/30 px-6 py-10 text-center text-white">
                  생성된 교수 이미지 없이도 플레이 가능합니다.
                </div>
              )}
            </div>

            {shouldShowChoiceOverlay && (
              <div className="absolute inset-0 z-30 flex items-center justify-center px-4 md:px-10">
                <div className="w-full max-w-5xl space-y-4 md:space-y-6">
                  {currentDialogue.choices.map((choice: ChapterChoice, index: number) => (
                    <button
                      key={`${choice.text}-${index}`}
                      type="button"
                      onClick={() => chooseOption(index)}
                      className="block w-full rounded-[12px] border border-[#b7b7b7] bg-[rgba(255,255,255,0.94)] px-6 py-4 text-center text-[clamp(22px,2.4vw,52px)] font-medium leading-[1.2] text-[#2f2f2f] shadow-[0_10px_28px_rgba(0,0,0,0.18)] transition duration-150 hover:translate-y-[-1px] hover:brightness-[1.01] active:translate-y-0"
                    >
                      {choice.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] md:inset-x-6 md:bottom-6">
            <div className="mx-auto w-full max-w-6xl pointer-events-auto">
              <div className="overflow-hidden rounded-[8px] shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
                <div
                  className="h-7 rounded-t-[8px] border-2 border-b-[#323232] border-[#a8a8a8]"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg,#ffffff 0 14px,#ffffff 14px 21px,#2f2f2f 21px 25px,#ffffff 25px 35px)",
                  }}
                  aria-hidden
                />
                <div className="border-x-2 border-b-2 border-[#a8a8a8] bg-[#f4f4f4] px-[clamp(16px,1.8vw,28px)] py-[clamp(16px,1.8vw,28px)]">
                  <p className="m-0 flex items-start gap-[clamp(18px,2vw,36px)] text-[clamp(24px,2.5vw,50px)] font-medium leading-[1.24] text-[#242424]">
                    <span className="min-w-[clamp(60px,5vw,120px)] font-black">교수</span>
                    <span>{typedProfessorLine || "\u00A0"}</span>
                  </p>
                </div>
                {selectedChoiceIndex !== null && (
                  <div className="mt-[-1px] flex items-center justify-between gap-4 border-x-2 border-b-2 border-[#a8a8a8] bg-[#f4f4f4] px-[clamp(16px,1.8vw,28px)] pb-[clamp(14px,1.5vw,22px)]">
                    <p className="text-base text-[#2d2d2d]">선택 완료. 다음 에피소드로 이동하세요.</p>
                    <button
                      type="button"
                      onClick={moveNextChapter}
                      className="rounded-md border border-[#484848] bg-white px-5 py-2 text-lg font-semibold text-black transition hover:bg-[#f6f6f6]"
                    >
                      다음
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "screen9_ending" && ending && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${endingBackdrop})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,20,0.35),rgba(8,12,20,0.75))]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-end px-4 pb-6 md:px-8">
            <div className="rounded border border-[#8b8b8b] bg-[rgba(30,30,30,0.62)] p-4 text-white">
              <p className="text-xl">엔딩 내용</p>
              <p className="mt-2 text-3xl font-semibold">{ending.title}</p>
              <p className="mt-3 text-2xl leading-relaxed">{ending.description}</p>
              <p className="mt-3 text-lg">최종 점수: {ending.score100}점</p>
              <button
                type="button"
                onClick={goRealityScreen}
                className="mt-5 border border-white bg-white px-6 py-2 text-lg font-semibold text-black hover:bg-neutral-100"
              >
                다음
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === "screen10_reality" && (
        <section className="flex min-h-screen items-center justify-center bg-[#e6e6e6] px-4 py-8">
          <div className="w-full max-w-[1240px] text-center text-[clamp(54px,5.8vw,96px)] leading-[1.36] text-black">
            <p>
              {playerName}!<br />
              {finalRealityLine}
              <br />
              오늘 {realityProfessorName}과 함께 한 하루를 잊지 말고
              <br />
              시험 잘 보길 바랄게.
            </p>
            <button
              type="button"
              onClick={goCreditScreen}
              className="mt-16 border-[3px] border-black bg-white px-14 py-4 text-[clamp(48px,4.7vw,76px)] font-semibold leading-none text-black hover:bg-[#f8f8f8]"
            >
              크레딧 보기
            </button>
          </div>
        </section>
      )}

      {phase === "screen11_credit" && (
        <section
          className="relative min-h-screen overflow-hidden bg-[#1f1f21] text-white"
          onClick={() => {
            if (isCreditFinished) {
              resetToMain();
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (isCreditFinished && (event.key === "Enter" || event.key === " ")) {
              resetToMain();
            }
          }}
        >
          <div className="credit-roll-track">
            <div
              className="credit-roll-content"
              onAnimationEnd={() => setIsCreditFinished(true)}
            >
              <p className="text-5xl font-semibold leading-snug">
                두근두근 교수님과 시험기간 시뮬레이션
              </p>
              <p className="mt-14 text-5xl">Credit</p>
              <p className="mt-12 text-5xl">숭멋사 14기</p>
              <p className="mt-14 text-5xl leading-[1.35]">
                PM 최영환
                <br />
                PM 이영서
                <br />
                FE 최정인
                <br />
                FE 김하빈
                <br />
                FE 차민상
              </p>
            </div>
          </div>

          {isCreditFinished && (
            <div className="credit-touch-guide">
              화면 터치시 메인 화면으로 돌아갑니다
            </div>
          )}
        </section>
      )}

      {phase === "screen9_ending" && ending && storyLog.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-8">
          <div className="rounded border border-black bg-white p-4">
            <p className="text-lg font-semibold">플레이 로그 (내부 데모용)</p>
            <div className="mt-3 grid gap-2 text-sm text-neutral-800">
              {storyLog.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
