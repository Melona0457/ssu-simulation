"use client";

import { useMemo, useState } from "react";
import {
  buildIllustrationPrompt,
  buildProfessorSummary,
  chapterFallbackDialogues,
  chapterInfoMap,
  clampScore100,
  endingMeta,
  finalRealityLine,
  getEndingRank,
  illustrationStyleOptions,
  pickSixChaptersForRun,
  playerGenderOptions,
  professorFeatureSuggestions,
  professorGenderOptions,
  professorSpeakingStyleOptions,
  resolveProfessorForGeneration,
  type ChapterChoice,
  type ChapterId,
  type PlayerFormState,
  type ProfessorFormState,
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
  customPrompt: "",
};

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

export default function Home() {
  const [phase, setPhase] = useState<Phase>("screen1_title");

  const [player, setPlayer] = useState<PlayerFormState>(initialPlayerState);
  const [professor, setProfessor] = useState<ProfessorFormState>(initialProfessorState);

  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [imagePromptUsed, setImagePromptUsed] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [selectedChapterIds, setSelectedChapterIds] = useState<ChapterId[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [rawScore, setRawScore] = useState(0);
  const [storyLog, setStoryLog] = useState<string[]>([]);

  const [ending, setEnding] = useState<EndingState | null>(null);
  const [isCreditFinished, setIsCreditFinished] = useState(false);

  const playerName = useMemo(() => toDisplayPlayerName(player.name), [player.name]);
  const professorName = useMemo(() => toDisplayProfessorName(professor.name), [professor.name]);
  const realityProfessorName = useMemo(
    () => toRealityProfessorLabel(professor.name),
    [professor.name],
  );

  const currentChapterId = selectedChapterIds[chapterIndex];
  const currentChapterInfo = currentChapterId ? chapterInfoMap[currentChapterId] : null;
  const currentDialogue = currentChapterId ? chapterFallbackDialogues[currentChapterId] : null;
  const currentSelectedChoice =
    selectedChoiceIndex !== null && currentDialogue
      ? currentDialogue.choices[selectedChoiceIndex]
      : null;
  const activeProfessorLine = stripProfessorPrefix(
    selectedChoiceIndex === null ? currentDialogue?.dialogue ?? "" : currentSelectedChoice?.reaction ?? "",
  );

  const progressPercent =
    selectedChapterIds.length > 0
      ? Math.min(
          100,
          Math.round(((chapterIndex + (selectedChoiceIndex !== null ? 1 : 0)) / selectedChapterIds.length) * 100),
        )
      : 0;

  function updatePlayer<K extends keyof PlayerFormState>(
    key: K,
    value: PlayerFormState[K],
  ) {
    setPlayer((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateProfessor<K extends keyof ProfessorFormState>(
    key: K,
    value: ProfessorFormState[K],
  ) {
    setProfessor((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function goScreen2() {
    setPhase("screen2_player");
  }

  function confirmPlayerInfo() {
    const normalizedName = toDisplayPlayerName(player.name);
    setPlayer((current) => ({ ...current, name: normalizedName }));
    setPhase("screen3_professor");
  }

  async function generateProfessorImage() {
    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const resolvedProfessorName = toDisplayProfessorName(resolvedProfessor.name);

    setProfessor(resolvedProfessor);
    setImageMessage("");
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
        }),
      });

      const data = (await response.json()) as {
        imageDataUrl?: string;
        promptUsed?: string;
        message?: string;
      };

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.message || "교수 이미지 생성 실패");
      }

      setGeneratedImageUrl(data.imageDataUrl);
      setImagePromptUsed(data.promptUsed || "");
      setImageMessage("교수님 생성이 완료되었습니다.");
    } catch (error) {
      setGeneratedImageUrl("");
      setImagePromptUsed("");
      setImageMessage(
        error instanceof Error
          ? `이미지 생성 실패: ${error.message}`
          : "이미지 생성 실패",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }

  function startStory() {
    const resolvedProfessor = resolveProfessorForGeneration(professor);
    const runChapters = pickSixChaptersForRun();

    setProfessor(resolvedProfessor);
    setSelectedChapterIds(runChapters);
    setChapterIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setEnding(null);
    setStoryLog([
      `${playerName}(${player.gender})의 시험기간 시뮬레이션 시작`,
      `${toDisplayProfessorName(resolvedProfessor.name)} 교수님과의 첫 만남이 시작되었다.`,
    ]);

    setPhase("screen4_8_chapter");
  }

  function chooseOption(choiceIndex: number) {
    if (!currentDialogue || selectedChoiceIndex !== null) {
      return;
    }

    const choice = currentDialogue.choices[choiceIndex];

    setSelectedChoiceIndex(choiceIndex);
    setRawScore((current) => current + choiceScore(choice));
    setStoryLog((current) => [
      ...current,
      `[${chapterIndex + 1}챕터] ${choice.text}`,
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

    setEnding({
      rank,
      title: endingTemplate.title,
      description: endingTemplate.description,
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
    setImagePromptUsed("");
    setImageMessage("");
    setSelectedChapterIds([]);
    setChapterIndex(0);
    setSelectedChoiceIndex(null);
    setRawScore(0);
    setStoryLog([]);
    setEnding(null);
    setIsCreditFinished(false);
  }

  return (
    <main className="min-h-screen bg-[#eeeeee] text-black">
      {phase === "screen1_title" && (
        <section
          className="flex min-h-screen cursor-pointer items-center justify-center px-6"
          onClick={goScreen2}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              goScreen2();
            }
          }}
        >
          <div className="text-center">
            <h1 className="text-5xl font-semibold leading-[1.35] md:text-6xl">
              교수님과 두근두근
              <br />
              시험기간 시뮬레이션
            </h1>
            <p className="mt-20 text-xl text-neutral-700">화면을 클릭하여 게임을 시작해 주세요</p>
          </div>
        </section>
      )}

      {phase === "screen2_player" && (
        <section className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-2xl border-2 border-black bg-[#f4f4f4] p-10 text-center">
            <h2 className="text-5xl font-semibold leading-[1.25]">
              당신의 이름과
              <br />
              성별은?
            </h2>
            <p className="mt-8 text-lg text-neutral-700">이름은 최대 3자까지 가능합니다.</p>

            <div className="mx-auto mt-8 max-w-lg space-y-4 border-2 border-black p-6">
              <input
                value={player.name}
                onChange={(event) => updatePlayer("name", event.target.value)}
                className="w-full border-2 border-black bg-white px-4 py-3 text-center text-xl"
                placeholder="이름 입력 (미입력 시 김멋사)"
                maxLength={3}
              />
              <div className="flex items-center justify-center gap-6 text-lg">
                {playerGenderOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="player-gender"
                      checked={player.gender === option.value}
                      onChange={() => updatePlayer("gender", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={confirmPlayerInfo}
              className="mt-10 border-2 border-black bg-white px-10 py-3 text-2xl font-semibold hover:bg-neutral-100"
            >
              확인
            </button>
          </div>
        </section>
      )}

      {phase === "screen3_professor" && (
        <section className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="grid w-full max-w-6xl gap-4 border-2 border-black bg-[#f6f6f6] p-6 md:grid-cols-[1fr_280px]">
            <article>
              <h2 className="text-5xl font-semibold">교수님 생성</h2>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr] md:items-center">
                <label className="text-2xl">이름</label>
                <input
                  value={professor.name}
                  onChange={(event) => updateProfessor("name", event.target.value)}
                  className="h-12 border-2 border-black px-3 text-lg"
                  placeholder="교수 이름"
                />

                <label className="text-2xl">성별</label>
                <div className="flex items-center gap-5 text-xl">
                  {professorGenderOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="professor-gender"
                        checked={professor.gender === option.value}
                        onChange={() => updateProfessor("gender", option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <label className="text-2xl">나이</label>
                <input
                  value={professor.age}
                  onChange={(event) => updateProfessor("age", event.target.value)}
                  className="h-12 border-2 border-black px-3 text-lg"
                  placeholder="예: 30"
                />

                <label className="text-2xl">말투</label>
                <select
                  value={professor.speakingStyle}
                  onChange={(event) => updateProfessor("speakingStyle", event.target.value)}
                  className="h-12 border-2 border-black px-3 text-lg"
                >
                  <option value="">선택</option>
                  {professorSpeakingStyleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <label className="text-2xl">일러스트 스타일</label>
                <select
                  value={professor.illustrationStyle}
                  onChange={(event) =>
                    updateProfessor(
                      "illustrationStyle",
                      event.target.value as ProfessorFormState["illustrationStyle"],
                    )
                  }
                  className="h-12 border-2 border-black px-3 text-lg"
                >
                  {illustrationStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-neutral-700">
                {
                  illustrationStyleOptions.find(
                    (option) => option.value === professor.illustrationStyle,
                  )?.description
                }
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  value={professor.feature1}
                  onChange={(event) => updateProfessor("feature1", event.target.value)}
                  list="feature1-options"
                  className="h-12 border-2 border-black px-3 text-lg"
                  placeholder="요소1 (헤어스타일)"
                />
                <datalist id="feature1-options">
                  {professorFeatureSuggestions.feature1.map((option) => (
                    <option key={`feature1-${option}`} value={option} />
                  ))}
                </datalist>
                <input
                  value={professor.feature2}
                  onChange={(event) => updateProfessor("feature2", event.target.value)}
                  list="feature2-options"
                  className="h-12 border-2 border-black px-3 text-lg"
                  placeholder="요소2 (눈매)"
                />
                <datalist id="feature2-options">
                  {professorFeatureSuggestions.feature2.map((option) => (
                    <option key={`feature2-${option}`} value={option} />
                  ))}
                </datalist>
                <input
                  value={professor.feature3}
                  onChange={(event) => updateProfessor("feature3", event.target.value)}
                  list="feature3-options"
                  className="h-12 border-2 border-black px-3 text-lg"
                  placeholder="요소3 (코/얼굴형)"
                />
                <datalist id="feature3-options">
                  {professorFeatureSuggestions.feature3.map((option) => (
                    <option key={`feature3-${option}`} value={option} />
                  ))}
                </datalist>
              </div>

              <p className="mt-6 text-2xl">
                그 외 원하는 교수님에 대한 요구사항을 작성해주세요!
                <br />
                (AI를 통해 반영해드립니다.)
              </p>

              <textarea
                value={professor.customPrompt}
                onChange={(event) => updateProfessor("customPrompt", event.target.value)}
                className="mt-4 h-28 w-full border-2 border-black px-3 py-2 text-lg"
                placeholder="예) 평소 무뚝뚝한데 가끔씩 웃어주는 교수님"
              />

              <p className="mt-2 text-sm text-neutral-700">
                전부 입력하지 않아도 &quot;만들기&quot;를 누르면 랜덤 요소로 자동 보정됩니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generateProfessorImage}
                  disabled={isGeneratingImage}
                  className="border-2 border-black bg-white px-8 py-3 text-2xl font-semibold hover:bg-neutral-100 disabled:opacity-70"
                >
                  {isGeneratingImage ? "생성 중..." : "만들기"}
                </button>
                <button
                  type="button"
                  onClick={startStory}
                  className="border-2 border-black bg-white px-8 py-3 text-2xl font-semibold hover:bg-neutral-100"
                >
                  시작하기
                </button>
              </div>

              {imageMessage && <p className="mt-3 text-base text-neutral-700">{imageMessage}</p>}
            </article>

            <aside className="border-l-2 border-black pl-4">
              <h3 className="text-3xl font-semibold">생성 예시 이미지</h3>
              <div className="mt-4 flex h-[360px] items-center justify-center border-2 border-black bg-[#dedede]">
                {generatedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImageUrl}
                    alt="생성된 교수 이미지"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="px-4 text-center text-neutral-700">만들기를 누르면 이미지가 생성됩니다.</p>
                )}
              </div>
              {imagePromptUsed && (
                <p className="mt-3 text-xs leading-5 text-neutral-600">Prompt: {imagePromptUsed}</p>
              )}
            </aside>
          </div>
        </section>
      )}

      {phase === "screen4_8_chapter" && currentChapterInfo && currentDialogue && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentChapterInfo.backdrop})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,35,0.22),rgba(10,20,35,0.66))]" />

          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-4 pt-8 md:px-8">
            <div className="ml-auto h-8 w-[320px] border border-black bg-white/60 p-1">
              <div className="h-full bg-[#3b82f6]" style={{ width: `${progressPercent}%` }} />
            </div>

            <div className="mt-3 rounded bg-black/45 px-4 py-2 text-sm text-white">
              CHAPTER {chapterIndex + 1} / 6 · {currentChapterInfo.title} · {currentChapterInfo.location}
            </div>

            <div className="relative mt-4 flex flex-1 items-end justify-center pb-[260px] md:pb-[300px]">
              {generatedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={generatedImageUrl}
                  alt={`${professorName} 교수 스프라이트`}
                  className="max-h-[72vh] w-auto object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="rounded-2xl border border-white/70 bg-white/30 px-6 py-10 text-center text-white">
                  생성된 교수 이미지 없이도 플레이 가능합니다.
                </div>
              )}
            </div>

            <div className="absolute inset-x-3 bottom-3 z-20 rounded border border-[#8b8b8b] bg-[rgba(30,30,30,0.62)] p-3 text-white md:inset-x-6 md:bottom-6 md:p-4">
              <p className="text-2xl font-semibold">교수: {activeProfessorLine}</p>

              <div className="mt-3 grid gap-2">
                {currentDialogue.choices.map((choice, index) => (
                  <button
                    key={`${choice.text}-${index}`}
                    type="button"
                    onClick={() => chooseOption(index)}
                    disabled={selectedChoiceIndex !== null}
                    className="border border-[#767676] bg-[#ededed] px-3 py-2 text-left text-2xl text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {choice.text}
                  </button>
                ))}
              </div>

              {selectedChoiceIndex !== null && (
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-white/90">선택 완료. 다음 챕터로 이동하세요.</p>
                  <button
                    type="button"
                    onClick={moveNextChapter}
                    className="border border-white bg-white px-5 py-2 text-lg font-semibold text-black hover:bg-neutral-100"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {phase === "screen9_ending" && ending && (
        <section className="relative min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${chapterInfoMap.EXAM_HALL.backdrop})` }}
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
        <section className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-4xl text-center text-5xl leading-[1.45] text-black">
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
              className="mt-12 border-2 border-black bg-white px-8 py-3 text-2xl font-semibold hover:bg-neutral-100"
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
