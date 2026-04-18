import { NextResponse } from "next/server";
import { getMonitoringSummary, verifyMonitoringAdminAccess } from "@/lib/monitoring/server";
import { getPlatformMonitoringSummary } from "@/lib/monitoring/platform";

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
    const [summary, platform] = await Promise.all([
      getMonitoringSummary(),
      getPlatformMonitoringSummary(),
    ]);
    return NextResponse.json({
      ...summary,
      platform,
    });
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
