import { NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

type DebugPanelAuthPayload = {
  password?: string;
};

const FALLBACK_DEBUG_PASSWORD = "ssulikelion";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `debug-panel-auth:${getRequestIp(request)}`,
    max: 10,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "디버그 인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let payload: DebugPanelAuthPayload;
  try {
    payload = (await request.json()) as DebugPanelAuthPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "디버그 인증 요청 형식이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const providedPassword = payload.password?.trim() || "";
  if (!providedPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "비밀번호를 입력해주세요.",
      },
      { status: 400 },
    );
  }

  const expectedPassword = process.env.DEBUG_PANEL_PASSWORD?.trim() || FALLBACK_DEBUG_PASSWORD;
  if (providedPassword !== expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "비밀번호가 틀렸습니다.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
