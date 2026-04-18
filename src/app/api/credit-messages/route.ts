import { NextResponse } from "next/server";
import { createSupabaseServerClient, type CreditMessageRecord } from "@/lib/supabase/server";

type CreditMessagePayload = {
  playerName?: string;
  messageText?: string;
  professorImageUrl?: string | null;
  ending?: {
    key?: string;
    title?: string;
  };
};

const CREDIT_MESSAGE_MAX_LENGTH = 80;

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isMissingProfessorImageColumnError(errorMessage: string) {
  return errorMessage.includes("professor_image_url");
}

export async function GET() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({
      skipped: true,
      messages: [] satisfies CreditMessageRecord[],
    });
  }

  const { data, error } = await supabase
    .from("credit_messages")
    .select("id, created_at, player_name, message_text, professor_image_url, ending_key, ending_title")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingProfessorImageColumnError(error.message)) {
      const fallback = await supabase
        .from("credit_messages")
        .select("id, created_at, player_name, message_text, ending_key, ending_title")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        return NextResponse.json(
          {
            message: `응원 문구 조회 실패: ${fallback.error.message}`,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        messages: (fallback.data ?? []).map((entry) => ({
          ...entry,
          professor_image_url: null,
        })) satisfies CreditMessageRecord[],
      });
    }

    return NextResponse.json(
      {
        message: `응원 문구 조회 실패: ${error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    messages: (data ?? []) as CreditMessageRecord[],
  });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CreditMessagePayload;
  const supabase = createSupabaseServerClient();

  const playerName = (payload.playerName || "익명의 학생").trim().slice(0, 30) || "익명의 학생";
  const messageText = normalizeMessageText(payload.messageText || "");
  const professorImageUrl = payload.professorImageUrl?.trim() || null;

  if (!messageText) {
    return NextResponse.json(
      {
        message: "응원 문구를 입력해주세요.",
      },
      { status: 400 },
    );
  }

  if (messageText.length > CREDIT_MESSAGE_MAX_LENGTH) {
    return NextResponse.json(
      {
        message: `응원 문구는 ${CREDIT_MESSAGE_MAX_LENGTH}자 이하로 입력해주세요.`,
      },
      { status: 400 },
    );
  }

  if (!supabase) {
    return NextResponse.json({
      skipped: true,
      message: "Supabase 환경 변수가 없어 저장은 건너뛰고 크레딧만 진행합니다.",
    });
  }

  const insertPayload = {
    player_name: playerName,
    message_text: messageText,
    professor_image_url: professorImageUrl,
    ending_key: payload.ending?.key?.trim() || null,
    ending_title: payload.ending?.title?.trim() || null,
  };

  const { error } = await supabase.from("credit_messages").insert(insertPayload);

  if (error) {
    if (isMissingProfessorImageColumnError(error.message)) {
      const fallback = await supabase.from("credit_messages").insert({
        player_name: playerName,
        message_text: messageText,
        ending_key: payload.ending?.key?.trim() || null,
        ending_title: payload.ending?.title?.trim() || null,
      });

      if (!fallback.error) {
        return NextResponse.json({
          message: "응원 문구 저장 완료",
          warning: "professor_image_url 컬럼이 없어 이미지 저장은 건너뛰었습니다.",
        });
      }

      return NextResponse.json(
        {
          message: `응원 문구 저장 실패: ${fallback.error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: `응원 문구 저장 실패: ${error.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "응원 문구 저장 완료",
  });
}
