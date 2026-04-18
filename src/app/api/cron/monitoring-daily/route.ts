import { NextResponse } from "next/server";
import {
  runMonitoringCheck,
  verifyCronAccess,
} from "@/lib/monitoring/server";

export async function GET(request: Request) {
  const access = verifyCronAccess(request);

  if (!access.ok) {
    return NextResponse.json(
      {
        message: access.reason,
      },
      { status: 401 },
    );
  }

  try {
    const result = await runMonitoringCheck(access.warning || null);
    return NextResponse.json({
      ...result,
      message: "일일 모니터링 점검 완료",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `일일 모니터링 점검 실패: ${error.message}`
            : "일일 모니터링 점검 실패",
      },
      { status: 500 },
    );
  }
}
