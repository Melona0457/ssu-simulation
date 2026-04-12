"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildIllustrationPrompt,
  buildProfessorSummary,
  chapterFallbackDialogues,
  chapterInfoMap,
  chapterSequence,
  type DialogueEmotion,
  endingMeta,
  finalRealityLine,
  getDefaultExamDeadline,
  getEndingRank,
  professorGenderOptions,
  professorVoiceOptions,
  professorTraits,
  resolveProfessorForGeneration,
  type ChapterChoice,
  type EndingRank,
  type GameScoreKey,
  type ProfessorFormState,
} from "@/lib/game-data";

type Phase = "title" | "customize" | "initializing" | "chapter" | "ending";

type ScoreState = Record<GameScoreKey, number>;

type DialogueApiResponse = {
  dialogue?: unknown;
  emotion?: unknown;
  choices?: unknown;
  quiz?: unknown;
  fallback?: boolean;
  message?: string;
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

type EndingApiResponse = {
  rank?: unknown;
  endingKey?: unknown;
  endingTitle?: unknown;
  endingStory?: unknown;
  realityLine?: unknown;
  fallback?: boolean;
  message?: string;
};

type StudySummaryContext = {
  summary: string;
  keyPoints: string[];
  sourceModel: string;
};

type SurpriseQuiz = {
  concept: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

type RawQuiz = {
  concept?: unknown;
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  explanation?: unknown;
};

const scoreLabels: Record<GameScoreKey, string> = {
  affinity: "친밀도",
  intellect: "지성",
};

const initialScores: ScoreState = {
  affinity: 0,
  intellect: 0,
};

const initialProfessorState: ProfessorFormState = {
  name: "",
  gender: "미정(중성 표현)",
  voiceName: "Kore",
  hair: "",
  eyes: "",
  nose: "",
  face: "",
  vibe: "",
  customPrompt: "",
  studyNotes: "",
  examDeadline: getDefaultExamDeadline(),
};

const traitKeys = ["hair", "eyes", "nose", "face", "vibe"] as const;
type TraitKey = (typeof traitKeys)[number];
type TraitMode = "preset" | "custom" | "unset";

const TRAIT_CUSTOM_VALUE = "__CUSTOM__";
const TRAIT_UNSET_VALUE = "__UNSET__";

const initialTraitModes: Record<TraitKey, TraitMode> = {
  hair: "unset",
  eyes: "unset",
  nose: "unset",
  face: "unset",
  vibe: "unset",
};

const initialCustomTraits: Record<TraitKey, string> = {
  hair: "",
  eyes: "",
  nose: "",
  face: "",
  vibe: "",
};

function toSafeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.round(parsed);
}

function toEndingRank(value: unknown, fallback: EndingRank): EndingRank {
  if (value === "S" || value === "A" || value === "B" || value === "F") {
    return value;
  }

  return fallback;
}

function toDialogueEmotion(value: unknown, fallback: DialogueEmotion): DialogueEmotion {
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

function normalizeChoices(value: unknown, fallback: ChapterChoice[]) {
  if (!Array.isArray(value) || value.length < 3) {
    return fallback;
  }

  return [0, 1, 2].map((index) => {
    const base = fallback[index];
    const raw = value[index] as RawChoice | undefined;

    return {
      text:
        typeof raw?.text === "string" && raw.text.trim().length > 0
          ? raw.text
          : base.text,
      preview:
        typeof raw?.preview === "string" && raw.preview.trim().length > 0
          ? raw.preview
          : base.preview,
      reaction:
        typeof raw?.reaction === "string" && raw.reaction.trim().length > 0
          ? raw.reaction
          : base.reaction,
      emotion: toDialogueEmotion(raw?.emotion, base.emotion),
      effects: {
        affinity: toSafeNumber(raw?.effects?.affinity, base.effects.affinity),
        intellect: toSafeNumber(raw?.effects?.intellect, base.effects.intellect),
      },
    };
  });
}

function normalizeQuiz(value: unknown) {
  const raw = value as RawQuiz | null | undefined;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const question =
    typeof raw.question === "string" && raw.question.trim().length > 0
      ? raw.question.trim()
      : "";

  const options = Array.isArray(raw.options)
    ? raw.options
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0)
        .slice(0, 4)
    : [];

  const answerIndex = toSafeNumber(raw.answerIndex, -1);
  const explanation =
    typeof raw.explanation === "string" && raw.explanation.trim().length > 0
      ? raw.explanation.trim()
      : "";

  if (!question || options.length !== 4 || answerIndex < 0 || answerIndex > 3) {
    return null;
  }

  return {
    concept:
      typeof raw.concept === "string" && raw.concept.trim().length > 0
        ? raw.concept.trim()
        : "핵심 개념",
    question,
    options,
    answerIndex,
    explanation,
  } as SurpriseQuiz;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(value);
}

function formatCountdown(deadlineValue: string, nowMs: number) {
  const deadlineMs = new Date(deadlineValue).getTime();

  if (Number.isNaN(deadlineMs)) {
    return "시험 일정 미설정";
  }

  const diff = deadlineMs - nowMs;

  if (diff <= 0) {
    return "시험 시작";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `D-${days} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const CHOSEONG = [
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
];

function isHangulSyllable(char: string) {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_LAST;
}

function composeHangul(cho: number, jung: number, jong: number) {
  return String.fromCharCode(HANGUL_BASE + (cho * 21 + jung) * 28 + jong);
}

function buildKoreanTypingFrames(text: string) {
  const frames: string[] = [""];
  let committed = "";

  for (const char of text) {
    if (!isHangulSyllable(char)) {
      committed += char;
      frames.push(committed);
      continue;
    }

    const code = char.charCodeAt(0) - HANGUL_BASE;
    const cho = Math.floor(code / 588);
    const jung = Math.floor((code % 588) / 28);
    const jong = code % 28;

    frames.push(committed + CHOSEONG[cho]);
    frames.push(committed + composeHangul(cho, jung, 0));

    if (jong > 0) {
      frames.push(committed + composeHangul(cho, jung, jong));
    }

    committed += char;
  }

  if (frames[frames.length - 1] !== text) {
    frames.push(text);
  }

  return frames;
}

function TypewriterText({
  text,
  speed = 42,
  allowSkip = false,
}: {
  text: string;
  speed?: number;
  allowSkip?: boolean;
}) {
  const frames = useMemo(() => buildKoreanTypingFrames(text), [text]);
  const [frameIndex, setFrameIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const isTyping = frameIndex < frames.length - 1;

  useEffect(() => {
    if (frames.length <= 1) {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setFrameIndex((current) => {
        if (current >= frames.length - 1) {
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return current;
        }

        return current + 1;
      });
    }, speed);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [frames, speed]);

  const visibleText = frames[Math.min(frameIndex, frames.length - 1)] ?? "";
  const handleSkip = () => {
    if (!allowSkip || !isTyping) {
      return;
    }

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setFrameIndex(frames.length - 1);
  };

  if (!allowSkip) {
    return <p className="leading-8 whitespace-pre-wrap md:text-lg md:leading-9">{visibleText}</p>;
  }

  return (
    <button
      type="button"
      onClick={handleSkip}
      className="w-full cursor-pointer bg-transparent p-0 text-left leading-8 whitespace-pre-wrap md:text-lg md:leading-9"
      title={isTyping ? "클릭하면 대사를 즉시 끝까지 표시" : undefined}
    >
      {visibleText}
      {isTyping && <span className="ml-1 inline-block animate-pulse text-slate-400">▌</span>}
    </button>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-black/35 px-4 py-2 text-sm text-white/90 backdrop-blur">
      <span className="font-semibold">{label}</span>
      <span className="ml-2 text-base font-black">{value}</span>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("title");
  const [professor, setProfessor] = useState<ProfessorFormState>(initialProfessorState);
  const [traitModes, setTraitModes] = useState<Record<TraitKey, TraitMode>>({
    ...initialTraitModes,
  });
  const [customTraits, setCustomTraits] = useState<Record<TraitKey, string>>({
    ...initialCustomTraits,
  });
  const [chapterIndex, setChapterIndex] = useState(0);
  const [scores, setScores] = useState<ScoreState>(initialScores);
  const scoresRef = useRef<ScoreState>(initialScores);
  const [storyLog, setStoryLog] = useState<string[]>([]);

  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [imagePromptUsed, setImagePromptUsed] = useState("");

  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterMessage, setChapterMessage] = useState("");
  const [dialogue, setDialogue] = useState("");
  const [dialogueEmotion, setDialogueEmotion] = useState<DialogueEmotion>("neutral");
  const [choices, setChoices] = useState<ChapterChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<ChapterChoice | null>(null);

  const [endingLoading, setEndingLoading] = useState(false);
  const [endingData, setEndingData] = useState<{
    rank: EndingRank;
    endingKey: string;
    endingTitle: string;
    endingStory: string;
    realityLine: string;
  } | null>(null);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [noteSummaryLoading, setNoteSummaryLoading] = useState(false);
  const [noteSummaryMessage, setNoteSummaryMessage] = useState("");
  const [studySummaryContext, setStudySummaryContext] = useState<StudySummaryContext | null>(null);
  const [surpriseQuiz, setSurpriseQuiz] = useState<SurpriseQuiz | null>(null);
  const [quizSelectedIndex, setQuizSelectedIndex] = useState<number | null>(null);
  const [quizSolved, setQuizSolved] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");

  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef(0);
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [ttsMessage, setTtsMessage] = useState("");
  const [ttsAudioUrl, setTtsAudioUrl] = useState("");
  const [ttsVoiceName, setTtsVoiceName] = useState("");
  const [displayedSpeechText, setDisplayedSpeechText] = useState("");
  const [typingSpeed, setTypingSpeed] = useState(38);

  const [countdownNow, setCountdownNow] = useState(Date.now());

  const displayProfessorName = useMemo(
    () => professor.name.trim() || "이름 미정 교수님",
    [professor.name],
  );
  const professorForPrompt = useMemo(
    () => ({
      ...professor,
      name: displayProfessorName,
    }),
    [professor, displayProfessorName],
  );
  const professorSummary = useMemo(
    () => buildProfessorSummary(professorForPrompt),
    [professorForPrompt],
  );
  const illustrationPrompt = useMemo(
    () => buildIllustrationPrompt(professorForPrompt),
    [professorForPrompt],
  );

  const totalScore = scores.affinity + scores.intellect;
  const currentChapterId = chapterSequence[chapterIndex] ?? chapterSequence[0];
  const currentChapter = chapterInfoMap[currentChapterId];
  const activeSpeechText = selectedChoice ? selectedChoice.reaction : dialogue;
  const activeSpeechEmotion = selectedChoice ? selectedChoice.emotion : dialogueEmotion;
  const availableVoiceOptions = useMemo(
    () =>
      professorVoiceOptions.filter((option) =>
        option.genders.includes(professor.gender),
      ),
    [professor.gender],
  );

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  useEffect(() => {
    if (phase !== "ending") {
      return;
    }

    setCountdownNow(Date.now());
    const timer = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const speechAudio = speechAudioRef.current;

    if (!speechAudio) {
      return;
    }

    if (phase !== "chapter") {
      speechAudio.pause();
      speechAudio.removeAttribute("src");
      speechAudio.load();
      setTtsState("idle");
      setTtsAudioUrl("");
      setTtsVoiceName("");
      setDisplayedSpeechText("");
      return;
    }

    const textToSpeak = activeSpeechText.trim();

    if (!textToSpeak || chapterLoading) {
      return;
    }

    const requestId = speechRequestRef.current + 1;
    speechRequestRef.current = requestId;
    setTtsState("loading");
    setTtsMessage("");
    setDisplayedSpeechText("");

    const controller = new AbortController();

    const run = async () => {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: textToSpeak,
            gender: professor.gender,
            voiceName: professor.voiceName,
            emotion: activeSpeechEmotion,
          }),
          signal: controller.signal,
        });

        const data = (await response.json()) as {
          audioDataUrl?: string;
          voiceName?: string;
          message?: string;
        };

        if (!response.ok || !data.audioDataUrl) {
          throw new Error(data.message || "TTS 생성 실패");
        }

        if (speechRequestRef.current !== requestId) {
          return;
        }

        speechAudio.pause();
        speechAudio.src = data.audioDataUrl;
        speechAudio.currentTime = 0;
        setTtsAudioUrl(data.audioDataUrl);
        setTtsVoiceName(data.voiceName || "");
        await new Promise<void>((resolve) => {
          const finalize = () => {
            speechAudio.removeEventListener("loadedmetadata", finalize);
            speechAudio.removeEventListener("canplaythrough", finalize);
            resolve();
          };

          speechAudio.addEventListener("loadedmetadata", finalize, { once: true });
          speechAudio.addEventListener("canplaythrough", finalize, { once: true });

          if (speechAudio.readyState >= 1) {
            finalize();
          }
        });

        const estimatedFrames = Math.max(textToSpeak.length * 2, 1);
        const durationMs =
          Number.isFinite(speechAudio.duration) && speechAudio.duration > 0
            ? speechAudio.duration * 1000
            : textToSpeak.length * 110;
        setTypingSpeed(Math.max(22, Math.min(90, Math.round(durationMs / estimatedFrames))));
        setDisplayedSpeechText(textToSpeak);
        setTtsState("ready");

        try {
          await speechAudio.play();
        } catch {
          setTtsMessage("브라우저 정책으로 자동 음성 재생이 차단되었습니다. 재생 버튼을 눌러주세요.");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (speechRequestRef.current !== requestId) {
          return;
        }

        setTtsState("error");
        setTtsMessage(error instanceof Error ? error.message : "TTS 생성 실패");
        setDisplayedSpeechText(textToSpeak);
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [
    activeSpeechEmotion,
    activeSpeechText,
    chapterLoading,
    phase,
    professor.gender,
    professor.voiceName,
  ]);

  useEffect(() => {
    if (availableVoiceOptions.some((option) => option.value === professor.voiceName)) {
      return;
    }

    updateProfessor("voiceName", availableVoiceOptions[0]?.value ?? "Kore");
  }, [availableVoiceOptions, professor.voiceName]);

  function updateProfessor<K extends keyof ProfessorFormState>(
    key: K,
    value: ProfessorFormState[K],
  ) {
    setProfessor((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getTraitSelectValue(traitKey: TraitKey) {
    const mode = traitModes[traitKey];

    if (mode === "custom") {
      return TRAIT_CUSTOM_VALUE;
    }

    if (mode === "unset") {
      return TRAIT_UNSET_VALUE;
    }

    const currentValue = professor[traitKey].trim();
    return currentValue.length > 0 ? currentValue : TRAIT_UNSET_VALUE;
  }

  function handleTraitSelectChange(traitKey: TraitKey, value: string) {
    if (value === TRAIT_CUSTOM_VALUE) {
      setTraitModes((current) => ({ ...current, [traitKey]: "custom" }));
      updateProfessor(traitKey, customTraits[traitKey] as ProfessorFormState[TraitKey]);
      return;
    }

    if (value === TRAIT_UNSET_VALUE) {
      setTraitModes((current) => ({ ...current, [traitKey]: "unset" }));
      updateProfessor(traitKey, "" as ProfessorFormState[TraitKey]);
      return;
    }

    setTraitModes((current) => ({ ...current, [traitKey]: "preset" }));
    updateProfessor(traitKey, value as ProfessorFormState[TraitKey]);
  }

  function handleCustomTraitChange(traitKey: TraitKey, value: string) {
    setCustomTraits((current) => ({ ...current, [traitKey]: value }));

    if (traitModes[traitKey] === "custom") {
      updateProfessor(traitKey, value as ProfessorFormState[TraitKey]);
    }
  }

  async function summarizeStudyNotes() {
    const rawNotes = professor.studyNotes.trim();

    if (!rawNotes) {
      setNoteSummaryMessage("요약할 학습 노트를 먼저 입력해주세요.");
      return;
    }

    setNoteSummaryLoading(true);
    setNoteSummaryMessage("");

    try {
      const response = await fetch("/api/summarize-study-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: rawNotes,
        }),
      });

      const data = (await response.json()) as {
        summary?: unknown;
        keyPoints?: unknown;
        model?: unknown;
        message?: unknown;
      };

      if (
        !response.ok ||
        typeof data.summary !== "string" ||
        data.summary.trim().length === 0
      ) {
        throw new Error(
          typeof data.message === "string" ? data.message : "학습 노트 요약 실패",
        );
      }

      const normalizedPoints = Array.isArray(data.keyPoints)
        ? data.keyPoints
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
        : [];

      const mergedSummary =
        normalizedPoints.length > 0
          ? `${data.summary}\n\n핵심 포인트\n${normalizedPoints.map((point) => `- ${point}`).join("\n")}`
          : data.summary;
      const sourceModel =
        typeof data.model === "string" && data.model.trim().length > 0
          ? data.model.trim()
          : "gpt-4.1-mini";

      updateProfessor("studyNotes", mergedSummary);
      setStudySummaryContext({
        summary: data.summary,
        keyPoints: normalizedPoints,
        sourceModel,
      });
      setNoteSummaryMessage(
        `OpenAI 요약 완료 (${sourceModel})`,
      );
    } catch (error) {
      setNoteSummaryMessage(error instanceof Error ? error.message : "학습 노트 요약 실패");
    } finally {
      setNoteSummaryLoading(false);
    }
  }

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (musicOn) {
      audio.pause();
      setMusicOn(false);
      return;
    }

    try {
      await audio.play();
      setMusicOn(true);
    } catch {
      setChapterMessage("브라우저 정책으로 자동 재생이 차단되었습니다. 버튼을 다시 눌러주세요.");
    }
  }

  async function replaySpeech() {
    const speechAudio = speechAudioRef.current;

    if (!speechAudio || !ttsAudioUrl) {
      return;
    }

    try {
      speechAudio.currentTime = 0;
      await speechAudio.play();
      setTtsMessage("");
    } catch {
      setTtsMessage("음성 재생에 실패했습니다. 브라우저 오디오 권한을 확인해주세요.");
    }
  }

  async function loadChapter(
    targetChapterIndex: number,
    scoreSnapshot: ScoreState,
    promptOverride?: {
      professorName?: string;
      professorSummary?: string;
      studyNotes?: string;
    },
  ) {
    const chapterId = chapterSequence[targetChapterIndex];
    const fallback = chapterFallbackDialogues[chapterId];
    const professorNameForPrompt = promptOverride?.professorName ?? displayProfessorName;
    const professorSummaryForPrompt = promptOverride?.professorSummary ?? professorSummary;
    const studyNotesForPrompt = promptOverride?.studyNotes ?? professor.studyNotes;

    setChapterLoading(true);
    setDialogue("");
    setDialogueEmotion("neutral");
    setChoices([]);
    setSelectedChoice(null);
    setChapterMessage("");
    setSurpriseQuiz(null);
    setQuizSelectedIndex(null);
    setQuizSolved(false);
    setQuizFeedback("");

    try {
      const response = await fetch("/api/generate-chapter-dialogue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterId,
          professorName: professorNameForPrompt,
          professorSummary: professorSummaryForPrompt,
          totalScore: scoreSnapshot.affinity + scoreSnapshot.intellect,
          studyNotes: studyNotesForPrompt,
          studyQuizContext: studySummaryContext,
        }),
      });

      const data = (await response.json()) as DialogueApiResponse;

      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "대사 생성 실패");
      }

      setDialogue(
        typeof data.dialogue === "string" && data.dialogue.trim().length > 0
          ? data.dialogue
          : fallback.dialogue,
      );
      setDialogueEmotion(toDialogueEmotion(data.emotion, "neutral"));
      setChoices(normalizeChoices(data.choices, fallback.choices));
      setSurpriseQuiz(normalizeQuiz(data.quiz));

      if (typeof data.message === "string") {
        setChapterMessage(data.message);
      }
    } catch (error) {
      setDialogue(fallback.dialogue);
      setDialogueEmotion("neutral");
      setChoices(fallback.choices);
      setChapterMessage(
        error instanceof Error
          ? `기본 대사로 진행합니다: ${error.message}`
          : "기본 대사로 진행합니다.",
      );
    } finally {
      setChapterLoading(false);
    }
  }

  async function startSimulation(skipImageGeneration = false) {
    const randomizedTraits: string[] = [];
    if (!professor.hair.trim()) {
      randomizedTraits.push("헤어");
    }
    if (!professor.eyes.trim()) {
      randomizedTraits.push("눈매");
    }
    if (!professor.nose.trim()) {
      randomizedTraits.push("코");
    }
    if (!professor.face.trim()) {
      randomizedTraits.push("얼굴형");
    }
    if (!professor.vibe.trim()) {
      randomizedTraits.push("분위기");
    }
    if (!professor.customPrompt.trim()) {
      randomizedTraits.push("성격 디테일");
    }

    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const resolvedProfessorName = resolvedProfessor.name.trim() || "이름 미정 교수님";
    const resolvedProfessorForPrompt = {
      ...resolvedProfessor,
      name: resolvedProfessorName,
    };
    const resolvedProfessorSummary = buildProfessorSummary(resolvedProfessorForPrompt);
    const resolvedIllustrationPrompt = buildIllustrationPrompt(resolvedProfessorForPrompt);
    const randomizedNotice =
      randomizedTraits.length > 0
        ? `미선택 항목 랜덤 배정: ${randomizedTraits.join(", ")}`
        : "";
    const joinStatusMessage = (...parts: string[]) =>
      parts.filter((part) => part.length > 0).join(" / ");

    setProfessor(resolvedProfessor);
    setPhase("initializing");
    setGeneratedImageUrl("");
    setImageMessage("");
    setImagePromptUsed("");
    setSaveState("idle");
    setSaveMessage("");
    setEndingData(null);
    setSurpriseQuiz(null);
    setQuizSelectedIndex(null);
    setQuizSolved(false);
    setQuizFeedback("");

    const resetScores = { ...initialScores };
    setScores(resetScores);
    scoresRef.current = resetScores;
    setStoryLog([`${resolvedProfessorName}과(와) 시험기간 시뮬레이션을 시작했다.`]);

    if (skipImageGeneration) {
      setImageMessage(
        joinStatusMessage(
          randomizedNotice,
          "디버그 모드: 이미지 생성 없이 바로 진행합니다.",
        ),
      );
    } else {
      try {
        const response = await fetch("/api/generate-professor-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            professorName: resolvedProfessorName,
            professorSummary: resolvedProfessorSummary,
            illustrationPrompt: resolvedIllustrationPrompt,
          }),
        });

        const data = (await response.json()) as {
          imageDataUrl?: string;
          promptUsed?: string;
          message?: string;
        };

        if (!response.ok || !data.imageDataUrl) {
          throw new Error(data.message || "교수 스프라이트 생성 실패");
        }

        setGeneratedImageUrl(data.imageDataUrl);
        setImagePromptUsed(data.promptUsed || "");
        setImageMessage(
          joinStatusMessage(randomizedNotice, "교수님 전신 스프라이트를 생성했습니다."),
        );
      } catch (error) {
        setGeneratedImageUrl("");
        setImageMessage(
          joinStatusMessage(
            randomizedNotice,
            error instanceof Error
              ? `이미지 없이 진행합니다: ${error.message}`
              : "이미지 없이 진행합니다.",
          ),
        );
      }
    }

    setChapterIndex(0);
    setPhase("chapter");
    await loadChapter(0, resetScores, {
      professorName: resolvedProfessorName,
      professorSummary: resolvedProfessorSummary,
      studyNotes: resolvedProfessor.studyNotes,
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function chooseOption(choice: ChapterChoice) {
    if (selectedChoice || chapterLoading || (surpriseQuiz && !quizSolved)) {
      return;
    }

    setSelectedChoice(choice);
    setScores((current) => {
      const next = {
        affinity: current.affinity + choice.effects.affinity,
        intellect: current.intellect + choice.effects.intellect,
      };
      scoresRef.current = next;
      return next;
    });

    setStoryLog((current) => [
      ...current,
      `${currentChapter.title}: ${choice.text}`,
      choice.reaction,
    ]);
  }

  function answerSurpriseQuiz(optionIndex: number) {
    if (!surpriseQuiz || quizSolved || selectedChoice || chapterLoading) {
      return;
    }

    setQuizSelectedIndex(optionIndex);
    setQuizSolved(true);

    const isCorrect = optionIndex === surpriseQuiz.answerIndex;
    const intellectDelta = isCorrect ? 4 : -1;

    setScores((current) => {
      const next = {
        ...current,
        intellect: current.intellect + intellectDelta,
      };
      scoresRef.current = next;
      return next;
    });

    const resultLine = isCorrect
      ? `깜짝 퀴즈 정답! 지성 +4 (${surpriseQuiz.concept})`
      : `깜짝 퀴즈 오답! 지성 -1 (${surpriseQuiz.concept})`;
    const explanationLine = surpriseQuiz.explanation
      ? `해설: ${surpriseQuiz.explanation}`
      : "";

    setQuizFeedback([resultLine, explanationLine].filter((line) => line.length > 0).join(" "));

    setStoryLog((current) => [
      ...current,
      `[깜짝 퀴즈] ${surpriseQuiz.question}`,
      `[선택] ${surpriseQuiz.options[optionIndex] ?? ""}`,
      resultLine,
    ]);
  }

  async function generateEnding(scoreSnapshot: ScoreState) {
    setEndingLoading(true);

    const total = scoreSnapshot.affinity + scoreSnapshot.intellect;
    const fallbackRank = getEndingRank(total);
    const fallback = endingMeta[fallbackRank];

    try {
      const response = await fetch("/api/generate-ending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professorName: displayProfessorName,
          professorSummary,
          totalScore: total,
          affinityScore: scoreSnapshot.affinity,
          intellectScore: scoreSnapshot.intellect,
        }),
      });

      const data = (await response.json()) as EndingApiResponse;

      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "엔딩 생성 실패");
      }

      const rank = toEndingRank(data.rank, fallbackRank);
      const rankFallback = endingMeta[rank];

      setEndingData({
        rank,
        endingKey:
          typeof data.endingKey === "string" && data.endingKey.trim().length > 0
            ? data.endingKey
            : rankFallback.key,
        endingTitle:
          typeof data.endingTitle === "string" && data.endingTitle.trim().length > 0
            ? data.endingTitle
            : rankFallback.title,
        endingStory:
          typeof data.endingStory === "string" && data.endingStory.trim().length > 0
            ? data.endingStory
            : rankFallback.description,
        realityLine:
          typeof data.realityLine === "string" && data.realityLine.trim().length > 0
            ? data.realityLine
            : finalRealityLine,
      });

      if (typeof data.message === "string") {
        setSaveMessage(data.message);
      }
    } catch {
      setEndingData({
        rank: fallbackRank,
        endingKey: fallback.key,
        endingTitle: fallback.title,
        endingStory: fallback.description,
        realityLine: finalRealityLine,
      });
    } finally {
      setEndingLoading(false);
    }
  }

  async function nextChapter() {
    if (!selectedChoice) {
      return;
    }

    const nextIndex = chapterIndex + 1;

    if (nextIndex >= chapterSequence.length) {
      setPhase("ending");
      await generateEnding(scoresRef.current);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setChapterIndex(nextIndex);
    await loadChapter(nextIndex, scoresRef.current);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveRun() {
    if (!endingData) {
      return;
    }

    setSaveState("saving");
    setSaveMessage("");

    try {
      const response = await fetch("/api/play-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professor: professorForPrompt,
          professorSummary,
          illustrationPrompt,
          scores,
          totalScore,
          ending: {
            key: endingData.endingKey,
            title: endingData.endingTitle,
            description: endingData.endingStory,
          },
          storyLog,
        }),
      });

      const data = (await response.json()) as { message?: string; skipped?: boolean };

      if (!response.ok) {
        throw new Error(data.message || "저장 실패");
      }

      setSaveState("saved");
      setSaveMessage(
        data.skipped
          ? "Supabase 키가 없어 저장은 건너뛰고 로컬 플레이만 완료했습니다."
          : "플레이 로그를 Supabase에 저장했습니다.",
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "저장 실패");
    }
  }

  function resetToTitle() {
    setPhase("title");
    setProfessor(initialProfessorState);
    setTraitModes({ ...initialTraitModes });
    setCustomTraits({ ...initialCustomTraits });
    setChapterIndex(0);
    setScores(initialScores);
    scoresRef.current = initialScores;
    setStoryLog([]);
    setGeneratedImageUrl("");
    setImageMessage("");
    setImagePromptUsed("");
    setDialogue("");
    setChoices([]);
    setSelectedChoice(null);
    setDisplayedSpeechText("");
    setTtsState("idle");
    setTtsMessage("");
    setTtsAudioUrl("");
    setTtsVoiceName("");
    setEndingData(null);
    setEndingLoading(false);
    setSaveState("idle");
    setSaveMessage("");
    setNoteSummaryLoading(false);
    setNoteSummaryMessage("");
    setStudySummaryContext(null);
    setSurpriseQuiz(null);
    setQuizSelectedIndex(null);
    setQuizSolved(false);
    setQuizFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const countdownText = formatCountdown(professor.examDeadline, countdownNow);

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-white selection:bg-pink-400 selection:text-black">
      <audio
        ref={audioRef}
        src="https://cdn.pixabay.com/audio/2022/05/27/audio_180873748b.mp3"
        loop
        preload="auto"
      />
      <audio ref={speechAudioRef} preload="auto" />

      <button
        onClick={toggleMusic}
        className="fixed right-4 top-4 z-50 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-xs font-bold tracking-[0.16em] text-pink-200 backdrop-blur transition hover:border-pink-300 hover:text-pink-100"
        type="button"
      >
        {musicOn ? "BGM ON" : "BGM OFF"}
      </button>

      {phase === "title" && (
        <section className="relative flex min-h-screen items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,113,133,0.35),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(244,114,182,0.3),transparent_40%),linear-gradient(180deg,#18061f_0%,#09080f_70%,#050506_100%)]" />
          <div className="relative z-10 w-full max-w-4xl rounded-[34px] border border-white/20 bg-black/55 p-8 text-center shadow-[0_30px_120px_rgba(255,53,150,0.25)] backdrop-blur md:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-200/80">
              Visual Novel Survival Simulation
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-transparent [text-shadow:0_0_18px_rgba(255,131,190,0.35)] [background:linear-gradient(180deg,#fff_0%,#ffd4ea_45%,#ff93c6_100%)] [background-clip:text] md:text-6xl">
              두근두근 교수님과
              <br />
              시험기간 시뮬레이션
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-pink-100/85 md:text-base">
              미연시 감성 UI 속에서 살아남는 K-대학생 생존기. 사랑 고백처럼 보이는
              선택지가 학점에 직결됩니다.
            </p>
            <button
              onClick={() => setPhase("customize")}
              className="anime-button mt-9 px-12 py-4 text-base md:text-lg"
              type="button"
            >
              시뮬레이션 시작
            </button>
          </div>
        </section>
      )}

      {phase === "customize" && (
        <section className="relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,163,206,0.25),transparent_35%),linear-gradient(180deg,#2a0b22_0%,#120812_55%,#08070d_100%)] px-5 py-8 md:px-8 md:py-10">
          <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[30px] border border-white/20 bg-black/50 p-6 shadow-[0_22px_90px_rgba(255,76,166,0.18)] backdrop-blur md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-200/80">
                Step 1. 교수님 생성
              </p>
              <h2 className="mt-2 text-3xl font-black text-pink-50 md:text-4xl">
                츤데레 교수 커스터마이징
              </h2>
              <p className="mt-3 text-sm leading-7 text-pink-100/80">
                비주얼과 성격을 정하고 스프라이트를 생성한 뒤, 5챕터 시뮬레이션에
                진입합니다.
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-pink-100">교수님 이름</span>
                  <input
                    value={professor.name}
                    onChange={(event) => updateProfessor("name", event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                    placeholder="예: XX 교수님"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-pink-100">성별 표현</span>
                  <select
                    value={professor.gender}
                    onChange={(event) =>
                      updateProfessor("gender", event.target.value as ProfessorFormState["gender"])
                    }
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                  >
                    {professorGenderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-pink-100">교수님 목소리</span>
                  <select
                    value={professor.voiceName}
                    onChange={(event) => updateProfessor("voiceName", event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                  >
                    {availableVoiceOptions.map((option, index) => (
                      <option key={`${option.value}-${index}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-6 text-pink-100/65">
                    Gemini TTS 프리뷰 보이스 목록입니다. 같은 텍스트라도 보이스에 따라
                    성격 톤이 꽤 다르게 들립니다.
                  </p>
                </label>

                {traitKeys.map((traitKey) => (
                  <div key={traitKey} className="space-y-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-pink-100">
                        {professorTraits[traitKey].label}
                      </span>
                      <select
                        value={getTraitSelectValue(traitKey)}
                        onChange={(event) =>
                          handleTraitSelectChange(traitKey, event.target.value)
                        }
                        className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                      >
                        {professorTraits[traitKey].map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        <option value={TRAIT_CUSTOM_VALUE}>직접 입력</option>
                        <option value={TRAIT_UNSET_VALUE}>미선택</option>
                      </select>
                    </label>

                    {traitModes[traitKey] === "custom" && (
                      <input
                        value={customTraits[traitKey]}
                        onChange={(event) =>
                          handleCustomTraitChange(traitKey, event.target.value)
                        }
                        className="w-full rounded-2xl border border-pink-200/45 bg-black/45 px-4 py-3 text-sm outline-none transition focus:border-pink-300"
                        placeholder={`${professorTraits[traitKey].label} 직접 입력`}
                      />
                    )}
                  </div>
                ))}

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-pink-100">추가 성격 프롬프트</span>
                  <textarea
                    value={professor.customPrompt}
                    onChange={(event) => updateProfessor("customPrompt", event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                    placeholder="예: 철벽처럼 보이지만 노력은 꼭 칭찬해주는 츤데레"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-pink-100">
                      학습 노트/PDF 요약
                    </span>
                    <button
                      type="button"
                      onClick={summarizeStudyNotes}
                      disabled={noteSummaryLoading}
                      className="rounded-full border border-pink-200/60 bg-pink-100/90 px-4 py-2 text-xs font-semibold text-pink-900 transition hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {noteSummaryLoading ? "OpenAI 요약 중..." : "OpenAI로 요약하기"}
                    </button>
                  </div>
                  <textarea
                    value={professor.studyNotes}
                    onChange={(event) => updateProfessor("studyNotes", event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                    placeholder="시험 범위 핵심 키워드나 요약본을 넣으면 챕터 대사에 반영됩니다."
                  />
                  {noteSummaryMessage && (
                    <p className="text-xs leading-6 text-pink-100/75">{noteSummaryMessage}</p>
                  )}
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-pink-100">시험 시각 (D-day 기준)</span>
                  <input
                    type="datetime-local"
                    value={professor.examDeadline}
                    onChange={(event) => updateProfessor("examDeadline", event.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-black/35 px-4 py-3 outline-none transition focus:border-pink-300"
                  />
                </label>
              </div>

              <div className="mt-6 rounded-2xl border border-pink-200/30 bg-pink-950/35 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-200/85">
                  Persona Preview
                </p>
                <p className="mt-2 text-sm leading-7 text-pink-50/90">{professorSummary}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => startSimulation(false)}
                  className="anime-button px-8 py-3 text-sm md:text-base"
                  type="button"
                >
                  교수님 생성하고 시작하기
                </button>
                <button
                  onClick={() => startSimulation(true)}
                  className="rounded-full border border-amber-200/70 bg-amber-100/90 px-6 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  type="button"
                >
                  디버그 시작 (이미지 생성 건너뛰기)
                </button>
                <button
                  onClick={resetToTitle}
                  className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-pink-50 transition hover:bg-white/20"
                  type="button"
                >
                  타이틀로
                </button>
              </div>

              {imageMessage && (
                <p className="mt-4 text-sm text-pink-100/85">{imageMessage}</p>
              )}
            </article>

            <aside className="space-y-6">
              <div className="rounded-[30px] border border-white/20 bg-black/45 p-6 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-200/80">
                  Professor Sprite Preview
                </p>
                <div className="mt-4 flex min-h-[460px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/45 p-4">
                  {generatedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={generatedImageUrl}
                      alt={`${displayProfessorName} 스프라이트`}
                      className="h-full max-h-[520px] w-auto object-contain"
                    />
                  ) : (
                    <div className="text-center text-sm leading-7 text-pink-100/55">
                      생성된 스프라이트가 여기에 표시됩니다.
                      <br />
                      바로 시작해도 플레이는 가능합니다.
                    </div>
                  )}
                </div>
              </div>

              {imagePromptUsed && (
                <div className="rounded-[30px] border border-white/20 bg-black/45 p-6 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-200/80">
                    Image Prompt Used
                  </p>
                  <p className="mt-3 text-sm leading-7 text-pink-50/85">{imagePromptUsed}</p>
                </div>
              )}
            </aside>
          </div>
        </section>
      )}

      {phase === "initializing" && (
        <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,163,206,0.24),transparent_45%),#09060d] px-6">
          <div className="rounded-[30px] border border-white/20 bg-black/55 px-8 py-10 text-center backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-pink-200/80">Initializing</p>
            <p className="mt-4 text-xl font-bold text-pink-50">교수님이 임용되는 중...</p>
            <p className="mt-3 text-sm text-pink-100/70">전신 스프라이트와 1챕터 대사를 준비하고 있어요.</p>
          </div>
        </section>
      )}

      {phase === "chapter" && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentChapter.backdrop})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_40%),linear-gradient(180deg,rgba(11,5,15,0.35)_0%,rgba(8,4,13,0.72)_55%,rgba(5,3,8,0.9)_100%)]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-20 md:px-8 md:pb-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-pink-200/80">
                  Chapter {chapterIndex + 1}
                </p>
                <h2 className="mt-1 text-3xl font-black text-pink-50 md:text-4xl">
                  {currentChapter.title}
                </h2>
                <p className="mt-1 text-sm text-pink-100/85">{currentChapter.location}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ScoreChip label={scoreLabels.affinity} value={scores.affinity} />
                <ScoreChip label={scoreLabels.intellect} value={scores.intellect} />
                <ScoreChip label="총점" value={totalScore} />
              </div>
            </header>

            <div className="mt-4 inline-flex max-w-max rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-pink-100/90 backdrop-blur">
              {currentChapter.scene}
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[270px] md:pb-[300px]">
              {generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={generatedImageUrl}
                  alt={`${displayProfessorName} 전신 스프라이트`}
                  className="pointer-events-none h-auto max-h-[76vh] w-auto max-w-[74vw] object-contain drop-shadow-[0_35px_50px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <div className="flex h-[70%] w-[min(360px,80vw)] items-center justify-center rounded-t-[170px] rounded-b-[32px] border border-white/20 bg-white/10 px-6 text-center text-sm leading-7 text-pink-100/80 backdrop-blur">
                  스프라이트가 없어도 시뮬레이션은 계속됩니다.
                </div>
              )}
            </div>

            <div className="absolute inset-x-3 bottom-3 z-20 rounded-[30px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,240,247,0.92),rgba(255,228,241,0.84))] p-4 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur md:inset-x-6 md:bottom-6 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex min-w-[148px] justify-center rounded-r-2xl rounded-bl-2xl rounded-tl-md bg-pink-500 px-5 py-3 text-lg font-black text-white shadow-[4px_4px_0_rgba(128,30,84,0.35)]">
                  {displayProfessorName}
                </div>
                <button
                  onClick={resetToTitle}
                  className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  type="button"
                >
                  처음으로
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-5 py-5 text-base md:text-lg">
                {chapterLoading ? (
                  <p className="animate-pulse text-slate-500">교수님이 다음 멘트를 고르는 중...</p>
                ) : ttsState === "loading" && !displayedSpeechText ? (
                  <p className="animate-pulse text-slate-500">교수님이 입을 여는 중...</p>
                ) : (
                  <TypewriterText
                    key={
                      selectedChoice
                        ? `reaction-${displayedSpeechText}-${typingSpeed}`
                        : `dialogue-${displayedSpeechText}-${typingSpeed}`
                    }
                    text={displayedSpeechText}
                    speed={typingSpeed}
                    allowSkip
                  />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {ttsState === "loading" && "교수님 음성을 생성하는 중..."}
                  {ttsState === "ready" &&
                    ttsVoiceName &&
                    `TTS Voice: ${ttsVoiceName} · 감정: ${activeSpeechEmotion} · 대사 속도 동기화 중`}
                  {ttsState === "error" && ttsMessage}
                  {ttsState === "idle" && "대사가 바뀌면 교수님 음성이 자동으로 재생됩니다."}
                </div>
                <button
                  onClick={replaySpeech}
                  disabled={!ttsAudioUrl || ttsState === "loading"}
                  className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-xs font-bold tracking-[0.14em] text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                >
                  음성 다시 듣기
                </button>
              </div>

              {chapterMessage && (
                <p className="mt-3 text-xs text-slate-500">{chapterMessage}</p>
              )}

              {surpriseQuiz && !selectedChoice && (
                <div className="mt-4 rounded-2xl border border-amber-200/75 bg-amber-50 px-4 py-4">
                  <p className="text-xs font-bold tracking-[0.14em] text-amber-700 uppercase">
                    Surprise Quiz · {surpriseQuiz.concept}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900">{surpriseQuiz.question}</p>
                  <div className="mt-3 grid gap-2">
                    {surpriseQuiz.options.map((option, index) => {
                      const isSelected = quizSelectedIndex === index;
                      const isCorrectChoice = quizSolved && index === surpriseQuiz.answerIndex;
                      return (
                        <button
                          key={`${option}-${index}`}
                          type="button"
                          onClick={() => answerSurpriseQuiz(index)}
                          disabled={quizSolved || chapterLoading}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            isCorrectChoice
                              ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                              : isSelected
                                ? "border-rose-300 bg-rose-100 text-rose-900"
                                : "border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
                          } disabled:cursor-not-allowed disabled:opacity-80`}
                        >
                          {index + 1}. {option}
                        </button>
                      );
                    })}
                  </div>
                  {quizFeedback ? (
                    <p className="mt-3 text-xs leading-6 text-slate-700">{quizFeedback}</p>
                  ) : (
                    <p className="mt-3 text-xs leading-6 text-slate-500">
                      퀴즈를 풀면 다음 선택지가 열립니다.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 grid gap-3">
                {selectedChoice ? (
                  <button
                    onClick={nextChapter}
                    className="anime-button w-full rounded-[18px] px-4 py-4 text-left"
                    type="button"
                  >
                    다음 챕터로 이동
                  </button>
                ) : (
                  choices.map((choice, index) => (
                    <button
                      key={`${choice.text}-${index}`}
                      onClick={() => chooseOption(choice)}
                      disabled={chapterLoading || Boolean(surpriseQuiz && !quizSolved)}
                      className="rounded-[20px] border border-pink-200/80 bg-white/80 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-pink-400 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-70"
                      type="button"
                    >
                      <span className="block text-base font-bold text-slate-950">
                        {index + 1}. {choice.text}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {choice.preview}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === "ending" && (
        <section className="relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,174,212,0.36)_0%,rgba(247,220,236,0.72)_35%,#f6f6f8_100%)] px-5 py-10 text-slate-900 md:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <article className="rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-[0_25px_90px_rgba(192,61,130,0.18)] backdrop-blur md:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-pink-600">
                FINAL ENDING
              </p>

              {endingLoading || !endingData ? (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  학점을 계산하고 결말을 작성하는 중입니다...
                </div>
              ) : (
                <>
                  <div className="mt-5 rounded-[28px] bg-[linear-gradient(135deg,#5b114a_0%,#9d174d_42%,#fb7185_100%)] p-6 text-rose-50">
                    <p className="text-xs uppercase tracking-[0.25em] text-rose-100/90">
                      Rank {endingData.rank}
                    </p>
                    <h2 className="mt-2 text-3xl font-black md:text-4xl">{endingData.endingTitle}</h2>
                    <div className="mt-4 text-sm leading-7 text-rose-50/95">
                      <TypewriterText key={`ending-${endingData.endingStory}`} text={endingData.endingStory} speed={32} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">친밀도</p>
                      <p className="mt-1 text-3xl font-black">{scores.affinity}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">지성</p>
                      <p className="mt-1 text-3xl font-black">{scores.intellect}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">총점</p>
                      <p className="mt-1 text-3xl font-black">{totalScore}</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-black px-5 py-6 text-white">
                    <p className="text-xs uppercase tracking-[0.28em] text-pink-200/80">
                      Reality Check
                    </p>
                    <p className="mt-3 text-xl font-black leading-9 text-pink-100">
                      {endingData.realityLine}
                    </p>
                    <p className="mt-4 text-sm text-white/80">
                      현재 시간: {formatDateTime(new Date(countdownNow))}
                    </p>
                    <p className="mt-1 text-sm text-white/80">
                      시험까지 남은 시간: {countdownText}
                    </p>
                  </div>
                </>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  onClick={saveRun}
                  disabled={saveState === "saving" || endingLoading || !endingData}
                  className="anime-button px-7 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                >
                  {saveState === "saving" ? "저장 중..." : "플레이 결과 저장"}
                </button>
                <button
                  onClick={resetToTitle}
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-800 hover:text-slate-900"
                  type="button"
                >
                  다시 시작
                </button>
              </div>

              <p
                className={`mt-3 text-sm ${
                  saveState === "error"
                    ? "text-red-600"
                    : saveState === "saved"
                      ? "text-emerald-700"
                      : "text-slate-500"
                }`}
              >
                {saveMessage || "저장 전입니다."}
              </p>
            </article>

            <article className="rounded-[30px] border border-white/80 bg-white/85 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pink-600">
                Story Log
              </p>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
                {storyLog.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                    {entry}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      )}
    </main>
  );
}
