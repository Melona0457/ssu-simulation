import { NextResponse } from "next/server";
import {
  loadProfessorScriptProfile,
  resolveProfessorScriptProfileKey,
  type ProfessorAgeToneKey,
  type ProfessorGenderKey,
} from "@/lib/professor-script-profile";

function parseGender(value: string | null): ProfessorGenderKey {
  return value === "여자" ? "여자" : "남자";
}

function parseAgeTone(value: string | null): ProfessorAgeToneKey {
  if (value === "TONE_20S" || value === "TONE_30S" || value === "TONE_40S") {
    return value;
  }
  return "TONE_30S";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const gender = parseGender(url.searchParams.get("gender"));
  const ageTone = parseAgeTone(url.searchParams.get("ageTone"));
  const profileKey = resolveProfessorScriptProfileKey({ gender, ageTone });

  try {
    const profile = await loadProfessorScriptProfile(profileKey);
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "교수 스크립트 프로필 로드 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
