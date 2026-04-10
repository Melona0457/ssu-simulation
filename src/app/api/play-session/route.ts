import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PlaySessionPayload = {
  professor: {
    name: string;
    gender?: string;
    hair: string;
    eyes: string;
    nose: string;
    face: string;
    vibe: string;
    customPrompt: string;
  };
  professorSummary: string;
  illustrationPrompt: string;
  scores: Record<string, number>;
  totalScore: number;
  ending: {
    key: string;
    title: string;
    description: string;
  };
  storyLog: string[];
};

export async function POST(request: Request) {
  const payload = (await request.json()) as PlaySessionPayload;
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({
      skipped: true,
      message:
        "Supabase 환경 변수가 없어 저장은 건너뛰었지만 MVP 플레이는 정상 동작합니다.",
    });
  }

  const { error } = await supabase.from("play_sessions").insert({
      professor_name: payload.professor.name,
      appearance: {
        gender: payload.professor.gender || "미정(중성 표현)",
        hair: payload.professor.hair,
        eyes: payload.professor.eyes,
        nose: payload.professor.nose,
        face: payload.professor.face,
        vibe: payload.professor.vibe,
      },
      custom_prompt: payload.professor.customPrompt,
      professor_summary: payload.professorSummary,
      illustration_prompt: payload.illustrationPrompt,
      chapter_scores: payload.scores,
      total_score: payload.totalScore,
      ending_key: payload.ending.key,
      ending_title: payload.ending.title,
      story_log: payload.storyLog,
  });

  if (error) {
    return NextResponse.json(
      {
        message: `Supabase 저장 실패: ${error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "플레이 기록 저장 완료",
  });
}
