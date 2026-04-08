"use client";

import { useMemo, useState } from "react";
import {
  chapters,
  endings,
  professorTraits,
  type ChapterScoreKey,
  type ProfessorFormState,
} from "@/lib/mvp-data";

const initialProfessorState: ProfessorFormState = {
  name: "민상 교수님",
  hair: professorTraits.hair[0].value,
  eyes: professorTraits.eyes[0].value,
  nose: professorTraits.nose[0].value,
  face: professorTraits.face[0].value,
  vibe: professorTraits.vibe[0].value,
  customPrompt: "",
};

type Phase = "customize" | "play" | "result";

function buildProfessorSummary(form: ProfessorFormState) {
  return `${form.name}은(는) ${form.face}, ${form.hair}, ${form.eyes}, ${form.nose} 인상의 교수님이다. 전체 분위기는 ${form.vibe}이며, 학생들이 느끼기에는 ${form.customPrompt || "한마디로 설명하기 어렵지만 유독 긴장감을 주는 존재"}에 가깝다.`;
}

function buildIllustrationPrompt(form: ProfessorFormState) {
  return [
    "full-body 2D Korean campus visual novel professor sprite",
    "standing pose",
    "portrait composition",
    form.face,
    form.hair,
    form.eyes,
    form.nose,
    form.vibe,
    form.customPrompt || "exam-eve tension, expressive face, clean game illustration",
  ].join(", ");
}

function getEnding(totalScore: number) {
  if (totalScore >= 19) {
    return endings.legend;
  }

  if (totalScore >= 14) {
    return endings.survivor;
  }

  return endings.crash;
}

function renderDialogue(text: string, professorName: string) {
  return text.replaceAll("{professorName}", professorName);
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("customize");
  const [professor, setProfessor] =
    useState<ProfessorFormState>(initialProfessorState);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [scores, setScores] = useState<Record<ChapterScoreKey, number>>({
    relationship: 0,
    strategy: 0,
    nerve: 0,
  });
  const [storyLog, setStoryLog] = useState<string[]>([]);
  const [imageState, setImageState] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const [imageMessage, setImageMessage] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [imagePromptUsed, setImagePromptUsed] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const professorSummary = useMemo(
    () => buildProfessorSummary(professor),
    [professor],
  );
  const illustrationPrompt = useMemo(
    () => buildIllustrationPrompt(professor),
    [professor],
  );
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const ending = getEnding(totalScore);
  const currentChapter = chapters[chapterIndex];
  const dialogueText = currentChapter
    ? renderDialogue(currentChapter.description, professor.name)
    : "";

  function updateProfessor<K extends keyof ProfessorFormState>(
    key: K,
    value: ProfessorFormState[K],
  ) {
    setProfessor((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startSimulation() {
    setPhase("play");
    setChapterIndex(0);
    setScores({
      relationship: 0,
      strategy: 0,
      nerve: 0,
    });
    setStoryLog([
      `${professor.name} 커스터마이징을 완료했다. 시험 전날 하루가 시작된다.`,
    ]);
    setSaveState("idle");
    setSaveMessage("");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function chooseOption(choice: (typeof chapters)[number]["choices"][number]) {
    const chapter = chapters[chapterIndex];

    setScores((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(choice.effects)) {
        next[key as ChapterScoreKey] += value;
      }
      return next;
    });

    setStoryLog((current) => [
      ...current,
      `${chapter.title}: ${choice.label}`,
      choice.outcome,
    ]);

    if (chapterIndex === chapters.length - 1) {
      setPhase("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setChapterIndex((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function generateProfessorImage() {
    setImageState("generating");
    setImageMessage("");

    try {
      const response = await fetch("/api/generate-professor-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professorName: professor.name,
          professorSummary,
          illustrationPrompt,
        }),
      });

      const data = (await response.json()) as {
        imageDataUrl?: string;
        promptUsed?: string;
        message?: string;
      };

      if (!response.ok || !data.imageDataUrl) {
        throw new Error(data.message || "이미지 생성에 실패했습니다.");
      }

      setGeneratedImageUrl(data.imageDataUrl);
      setImagePromptUsed(data.promptUsed || "");
      setImageState("ready");
      setImageMessage("전신 교수 스프라이트 시안을 생성했어요.");
    } catch (error) {
      setImageState("error");
      setImageMessage(
        error instanceof Error ? error.message : "이미지 생성에 실패했습니다.",
      );
    }
  }

  async function saveRun() {
    setSaveState("saving");
    setSaveMessage("");

    try {
      const response = await fetch("/api/play-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professor,
          professorSummary,
          illustrationPrompt,
          scores,
          totalScore,
          ending,
          storyLog,
        }),
      });

      const data = (await response.json()) as { message?: string; skipped?: boolean };

      if (!response.ok) {
        throw new Error(data.message || "저장에 실패했습니다.");
      }

      setSaveState("saved");
      setSaveMessage(
        data.skipped
          ? "Supabase 환경 변수가 없어 로컬 MVP 모드로 마무리했어요."
          : "플레이 기록을 Supabase에 저장했어요.",
      );
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    }
  }

  function resetMvp() {
    setPhase("customize");
    setChapterIndex(0);
    setScores({
      relationship: 0,
      strategy: 0,
      nerve: 0,
    });
    setStoryLog([]);
    setImageState("idle");
    setImageMessage("");
    setGeneratedImageUrl("");
    setImagePromptUsed("");
    setSaveState("idle");
    setSaveMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "play" && currentChapter) {
    return (
      <main className="min-h-screen bg-[#120f1c] text-white">
        <section
          className="relative min-h-screen overflow-hidden"
          style={{ backgroundImage: currentChapter.backdrop }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff20,transparent_38%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,20,0.1),rgba(4,6,20,0.18)_38%,rgba(4,6,20,0.35)_100%)]" />

          <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/65">
                Chapter {chapterIndex + 1}
              </p>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">
                {currentChapter.title}
              </h1>
            </div>
            <div className="rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
              {currentChapter.location}
            </div>
          </header>

          <div className="absolute inset-x-0 top-24 z-10 px-5 md:px-8">
            <div className="inline-flex rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm text-white/85 backdrop-blur">
              {currentChapter.scene}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-[240px] top-32 flex items-end justify-center px-4 md:bottom-[250px]">
            {generatedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={generatedImageUrl}
                alt={`${professor.name} 전신 스프라이트`}
                className="pointer-events-none h-auto max-h-[78vh] w-auto max-w-[76vw] object-contain drop-shadow-[0_35px_50px_rgba(0,0,0,0.42)]"
              />
            ) : (
              <div className="flex h-[70%] w-[min(360px,72vw)] items-center justify-center rounded-t-[180px] rounded-b-[40px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0.08))] px-6 text-center text-sm leading-7 text-white/80 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
                전신 교수 스프라이트를 생성하면
                <br />
                여기에서 장면 위에 표시됩니다.
              </div>
            )}
          </div>

          <div className="absolute inset-x-3 bottom-3 z-30 rounded-[30px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,248,241,0.92),rgba(252,243,236,0.86))] p-4 text-slate-900 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur md:inset-x-6 md:bottom-6 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex min-w-[132px] justify-center rounded-r-2xl rounded-bl-2xl rounded-tl-md bg-[#de8f8b] px-5 py-3 text-lg font-black text-[#2a1414] shadow-[4px_4px_0_rgba(111,39,39,0.18)]">
                {professor.name}
              </div>
              <button
                onClick={resetMvp}
                className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                커스터마이징으로 돌아가기
              </button>
            </div>

            <div className="mt-4 rounded-[22px] border border-black/5 bg-white/60 px-5 py-5 text-lg leading-8 text-slate-900">
              {dialogueText}
            </div>

            <div className="mt-4 grid gap-3">
              {currentChapter.choices.map((choice) => (
                <button
                  key={choice.label}
                  onClick={() => chooseOption(choice)}
                  className="rounded-[20px] border border-slate-300/70 bg-white/70 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50"
                >
                  <span className="block text-base font-bold text-slate-950">
                    {choice.label}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">
                    {choice.preview}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (phase === "result") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,0%,#fff7ed,35%,#f3f4f6,100%)] px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-7 shadow-[0_20px_80px_rgba(148,84,31,0.12)] backdrop-blur md:p-10">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Step 3
              </p>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                시험기간 엔딩
              </h2>
              <p className="text-slate-600">
                3챕터 MVP 점수를 기반으로 즉시 엔딩을 보여줘요. 이후 6챕터 확장,
                이미지 저장, PDF 기반 지식 주입을 붙이기 좋게 만들었어요.
              </p>
            </div>

            <div className="mt-8 rounded-[28px] bg-[linear-gradient(140deg,#431407_0%,#9a3412_40%,#fdba74_100%)] p-6 text-orange-50">
              <p className="text-sm uppercase tracking-[0.25em] text-orange-200">
                Ending
              </p>
              <h3 className="mt-3 text-3xl font-black">{ending.title}</h3>
              <p className="mt-3 text-sm leading-7 text-orange-50/90">
                {ending.description.replaceAll("{professorName}", professor.name)}
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Total Score
                </p>
                <p className="mt-3 text-4xl font-black">{totalScore}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Saved Result
                </p>
                <p
                  className={`mt-3 text-sm ${
                    saveState === "error" ? "text-red-600" : "text-slate-700"
                  }`}
                >
                  {saveMessage || "아직 저장하지 않았습니다."}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={saveRun}
                disabled={saveState === "saving"}
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saveState === "saving" ? "저장 중..." : "플레이 결과 저장"}
              </button>
              <button
                onClick={resetMvp}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                처음으로 돌아가기
              </button>
            </div>

            <div className="mt-8 rounded-[24px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Story Log
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                {storyLog.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="rounded-2xl bg-slate-50 p-3">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,0%,#fff7ed,35%,#f3f4f6,100%)] px-5 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_20px_80px_rgba(148,84,31,0.12)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
            <div className="space-y-5">
              <span className="inline-flex rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-900">
                두근두근 교수님과 시험기간 시뮬레이션 MVP
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                  교수님 커스터마이징이 곧 게임의 핵심인 버전으로 시작합니다.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
                  정형 파츠 선택과 자유 텍스트를 합쳐 교수님 페르소나를 만들고,
                  그 교수님과 함께 시험 전날 하루를 시뮬레이션하는 최소 MVP예요.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="핵심 루프"
                  value="커스터마이징"
                  detail="파츠 선택 + AI용 추가 설명"
                />
                <StatCard
                  label="플레이 화면"
                  value="다음 장면 전환"
                  detail="시작 버튼을 누르면 아예 장면 화면으로 이동"
                />
                <StatCard
                  label="이미지 생성"
                  value="세로 전신 스프라이트"
                  detail="1024x1536, transparent PNG"
                />
              </div>
            </div>

            <div className="relative rounded-[28px] border border-amber-200/70 bg-[linear-gradient(160deg,#7c2d12_0%,#b45309_40%,#fde68a_100%)] p-6 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <div className="absolute inset-x-6 top-6 h-px bg-white/30" />
              <div className="mt-6 space-y-4">
                <p className="text-sm uppercase tracking-[0.35em] text-amber-200/90">
                  AI Persona Preview
                </p>
                <h2 className="text-3xl font-bold">{professor.name}</h2>
                <p className="text-sm leading-7 text-amber-50/90">
                  {professorSummary}
                </p>
                <div className="rounded-3xl bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-amber-200">
                    Illustration Prompt
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-50/90">
                    {illustrationPrompt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                  Step 1
                </p>
                <h2 className="text-3xl font-black tracking-tight">
                  교수님을 먼저 만들어봅시다
                </h2>
                <p className="text-slate-600">
                  전신 스프라이트를 기준으로 생성하고, 다음 화면에서는 아예
                  비주얼노벨 장면으로 넘어가도록 구성했습니다.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">
                    교수님 이름
                  </span>
                  <input
                    value={professor.name}
                    onChange={(event) => updateProfessor("name", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-500 focus:bg-white"
                    placeholder="예: 민상 교수님"
                  />
                </label>
                {(Object.keys(professorTraits) as Array<
                  keyof typeof professorTraits
                >).map((traitKey) => (
                  <label key={traitKey} className="space-y-2">
                    <span className="text-sm font-semibold capitalize text-slate-700">
                      {professorTraits[traitKey].label}
                    </span>
                    <select
                      value={professor[traitKey]}
                      onChange={(event) =>
                        updateProfessor(traitKey, event.target.value)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-500 focus:bg-white"
                    >
                      {professorTraits[traitKey].map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  LLM 추가 커스터마이징 문구
                </span>
                <textarea
                  value={professor.customPrompt}
                  onChange={(event) =>
                    updateProfessor("customPrompt", event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-amber-500 focus:bg-white"
                  placeholder="예: 말끝마다 학생 이름을 또박또박 부르고, 시험 범위를 넓게 내는 편이지만 은근히 노력은 알아봐 주는 교수님."
                />
              </label>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                  LLM Input Preview
                </p>
                <p className="mt-3 text-sm leading-7 text-amber-950">
                  {professorSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateProfessorImage}
                  disabled={imageState === "generating"}
                  className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  {imageState === "generating"
                    ? "교수님 이미지 생성 중..."
                    : "교수님 이미지 생성"}
                </button>
                <button
                  onClick={startSimulation}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  이 교수님으로 시험 전날 시작하기
                </button>
              </div>

              {imageMessage && (
                <p
                  className={`text-sm ${
                    imageState === "error" ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {imageMessage}
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Professor Sprite
              </p>
              <div className="mt-5 overflow-hidden rounded-[28px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#fff7ed_0%,#f8fafc_100%)] p-4">
                {generatedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImageUrl}
                    alt={`${professor.name} 스프라이트`}
                    className="mx-auto h-auto max-h-[560px] w-full object-contain object-top"
                  />
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center rounded-[24px] bg-white/60 px-6 text-center text-sm leading-7 text-slate-500">
                    세로 전신 교수님 이미지가 여기에 표시됩니다.
                  </div>
                )}
              </div>

              {imagePromptUsed && (
                <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Image Prompt Used
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {imagePromptUsed}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Preview Notes
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <p>전신이 잘리지 않도록 이미지 생성 해상도를 세로형으로 바꿨습니다.</p>
                <p>시작 버튼을 누르면 커스터마이징 화면이 사라지고 장면 화면만 보입니다.</p>
                <p>마음에 안 드는 스프라이트가 나오면 다시 생성해서 비교해볼 수 있어요.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
