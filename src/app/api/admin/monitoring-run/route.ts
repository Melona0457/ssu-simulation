import { NextResponse } from "next/server";
import { runMonitoringCheck, verifyMonitoringAdminAccess } from "@/lib/monitoring/server";

export async function POST(request: Request) {
  const access = verifyMonitoringAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json(
      {
        message: access.reason,
      },
      { status: 401 },
    );
  }

  try {
    const result = await runMonitoringCheck("관리자 페이지에서 수동 실행했습니다.");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? `모니터링 수동 실행 실패: ${error.message}` : "모니터링 수동 실행 실패",
      },
      { status: 500 },
    );
  }
}
