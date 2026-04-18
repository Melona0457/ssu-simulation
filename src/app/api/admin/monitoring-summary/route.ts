import { NextResponse } from "next/server";
import { getMonitoringSummary, verifyMonitoringAdminAccess } from "@/lib/monitoring/server";

export async function GET(request: Request) {
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
    const summary = await getMonitoringSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `모니터링 요약 조회 실패: ${error.message}`
            : "모니터링 요약 조회 실패",
      },
      { status: 500 },
    );
  }
}
