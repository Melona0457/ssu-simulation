import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonitoringStatus = "success" | "warning" | "error";
export type MonitoringEventType =
  | "professor_image_generation"
  | "bg_health_check"
  | "monitoring_alert";

type MonitoringJson =
  | string
  | number
  | boolean
  | null
  | MonitoringJson[]
  | { [key: string]: MonitoringJson };

export type MonitoringEventRecord = {
  id: string;
  created_at: string;
  event_type: MonitoringEventType;
  status: MonitoringStatus;
  source: string;
  duration_ms: number | null;
  error_message: string | null;
  metadata: MonitoringJson;
};

type RecordMonitoringEventInput = {
  eventType: MonitoringEventType;
  status: MonitoringStatus;
  source: string;
  durationMs?: number | null;
  errorMessage?: string | null;
  metadata?: MonitoringJson;
};

export type BackgroundRemovalHealthCheck = {
  configured: boolean;
  ok: boolean;
  statusCode: number | null;
  durationMs: number | null;
  message: string;
  metadata?: MonitoringJson;
};

export type MonitoringSummary = {
  enabled: boolean;
  message?: string;
  generatedAt: string;
  lookbackHours: number;
  totals: {
    allEvents: number;
    generationCount: number;
    generationSuccessCount: number;
    generationWarningCount: number;
    generationErrorCount: number;
    generationErrorRate: number;
    averageGenerationDurationMs: number | null;
    bgHealthCheckCount: number;
    bgHealthErrorCount: number;
  };
  latest: {
    generation: MonitoringEventRecord | null;
    bgHealthCheck: MonitoringEventRecord | null;
    alert: MonitoringEventRecord | null;
  };
  recentErrors: Array<{
    createdAt: string;
    eventType: MonitoringEventType;
    source: string;
    message: string;
  }>;
  timeSeries: MonitoringTimeBucket[];
};

export type MonitoringAlert = {
  severity: "warning" | "error";
  code: string;
  message: string;
};

export type MonitoringTimeBucket = {
  label: string;
  isoHour: string;
  generationTotal: number;
  generationSuccess: number;
  generationWarning: number;
  generationError: number;
  averageGenerationDurationMs: number | null;
  bgHealthTotal: number;
  bgHealthErrors: number;
  alertTotal: number;
};

const MONITORING_TABLE = "monitoring_events";
const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_GENERATION_ERROR_COUNT_THRESHOLD = 3;
const DEFAULT_GENERATION_ERROR_RATE_THRESHOLD = 0.3;
const DEFAULT_GENERATION_WARNING_COUNT_THRESHOLD = 5;

function isMissingMonitoringTableError(errorMessage: string) {
  return errorMessage.includes(MONITORING_TABLE);
}

function readPositiveNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function getMonitoringLookbackHours() {
  return readPositiveNumberEnv("MONITORING_LOOKBACK_HOURS", DEFAULT_LOOKBACK_HOURS);
}

function toMonitoringErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

function toIntegerDuration(durationMs: number | null | undefined) {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    return null;
  }

  return Math.max(0, Math.round(durationMs));
}

export async function recordMonitoringEvent({
  eventType,
  status,
  source,
  durationMs,
  errorMessage,
  metadata = {},
}: RecordMonitoringEventInput) {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      skipped: true,
      reason: "Supabase 환경 변수가 없어 모니터링 이벤트 저장을 건너뛰었습니다.",
    } as const;
  }

  const { error } = await supabase.from(MONITORING_TABLE).insert({
    event_type: eventType,
    status,
    source,
    duration_ms: toIntegerDuration(durationMs),
    error_message: errorMessage?.trim() || null,
    metadata,
  });

  if (error) {
    if (!isMissingMonitoringTableError(error.message)) {
      console.error("[monitoring] event insert failed:", error.message);
    }

    return {
      ok: false,
      skipped: isMissingMonitoringTableError(error.message),
      reason: error.message,
    } as const;
  }

  return { ok: true, skipped: false } as const;
}

function normalizeMonitoringEvent(record: MonitoringEventRecord) {
  return {
    ...record,
    duration_ms:
      typeof record.duration_ms === "number" && Number.isFinite(record.duration_ms)
        ? record.duration_ms
        : null,
    error_message:
      typeof record.error_message === "string" && record.error_message.trim().length > 0
        ? record.error_message.trim()
        : null,
  } satisfies MonitoringEventRecord;
}

function startOfHour(date: Date) {
  const normalized = new Date(date);
  normalized.setMinutes(0, 0, 0);
  return normalized;
}

function formatBucketLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}시`;
}

function buildMonitoringTimeSeries(events: MonitoringEventRecord[], lookbackHours: number) {
  const bucketCount = Math.max(1, Math.min(lookbackHours, 24));
  const now = new Date();
  const currentHour = startOfHour(now);
  const buckets = new Map<string, MonitoringTimeBucket>();

  for (let offset = bucketCount - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(currentHour.getTime() - offset * 60 * 60 * 1000);
    const isoHour = bucketDate.toISOString();
    buckets.set(isoHour, {
      label: formatBucketLabel(bucketDate),
      isoHour,
      generationTotal: 0,
      generationSuccess: 0,
      generationWarning: 0,
      generationError: 0,
      averageGenerationDurationMs: null,
      bgHealthTotal: 0,
      bgHealthErrors: 0,
      alertTotal: 0,
    });
  }

  const generationDurationMap = new Map<string, number[]>();

  for (const event of events) {
    const eventDate = new Date(event.created_at);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const isoHour = startOfHour(eventDate).toISOString();
    const bucket = buckets.get(isoHour);
    if (!bucket) {
      continue;
    }

    if (event.event_type === "professor_image_generation") {
      bucket.generationTotal += 1;
      if (event.status === "success") {
        bucket.generationSuccess += 1;
      } else if (event.status === "warning") {
        bucket.generationWarning += 1;
      } else {
        bucket.generationError += 1;
      }

      if (typeof event.duration_ms === "number" && Number.isFinite(event.duration_ms)) {
        const durations = generationDurationMap.get(isoHour) ?? [];
        durations.push(event.duration_ms);
        generationDurationMap.set(isoHour, durations);
      }
    } else if (event.event_type === "bg_health_check") {
      bucket.bgHealthTotal += 1;
      if (event.status !== "success") {
        bucket.bgHealthErrors += 1;
      }
    } else if (event.event_type === "monitoring_alert") {
      bucket.alertTotal += 1;
    }
  }

  return Array.from(buckets.values()).map((bucket) => {
    const durations = generationDurationMap.get(bucket.isoHour) ?? [];
    return {
      ...bucket,
      averageGenerationDurationMs:
        durations.length > 0
          ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
          : null,
    } satisfies MonitoringTimeBucket;
  });
}

export async function getMonitoringSummary(
  lookbackHours = getMonitoringLookbackHours(),
): Promise<MonitoringSummary> {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      enabled: false,
      message: "Supabase 환경 변수가 없어 모니터링 요약을 불러올 수 없습니다.",
      generatedAt: new Date().toISOString(),
      lookbackHours,
      totals: {
        allEvents: 0,
        generationCount: 0,
        generationSuccessCount: 0,
        generationWarningCount: 0,
        generationErrorCount: 0,
        generationErrorRate: 0,
        averageGenerationDurationMs: null,
        bgHealthCheckCount: 0,
        bgHealthErrorCount: 0,
      },
      latest: {
        generation: null,
        bgHealthCheck: null,
        alert: null,
      },
      recentErrors: [],
      timeSeries: [],
    };
  }

  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(MONITORING_TABLE)
    .select("id, created_at, event_type, status, source, duration_ms, error_message, metadata")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingMonitoringTableError(error.message)) {
      return {
        enabled: false,
        message:
          "monitoring_events 테이블이 없습니다. supabase/monitoring_schema.sql을 먼저 실행해주세요.",
        generatedAt: new Date().toISOString(),
        lookbackHours,
        totals: {
          allEvents: 0,
          generationCount: 0,
          generationSuccessCount: 0,
          generationWarningCount: 0,
          generationErrorCount: 0,
          generationErrorRate: 0,
          averageGenerationDurationMs: null,
          bgHealthCheckCount: 0,
          bgHealthErrorCount: 0,
        },
        latest: {
          generation: null,
          bgHealthCheck: null,
          alert: null,
        },
        recentErrors: [],
        timeSeries: [],
      };
    }

    throw new Error(`모니터링 요약 조회 실패: ${error.message}`);
  }

  const events = ((data ?? []) as MonitoringEventRecord[]).map(normalizeMonitoringEvent);
  const generationEvents = events.filter(
    (event) => event.event_type === "professor_image_generation",
  );
  const bgHealthEvents = events.filter((event) => event.event_type === "bg_health_check");
  const alertEvents = events.filter((event) => event.event_type === "monitoring_alert");

  const generationSuccessCount = generationEvents.filter((event) => event.status === "success").length;
  const generationWarningCount = generationEvents.filter((event) => event.status === "warning").length;
  const generationErrorCount = generationEvents.filter((event) => event.status === "error").length;
  const durationSamples = generationEvents
    .map((event) => event.duration_ms)
    .filter((duration): duration is number => typeof duration === "number" && Number.isFinite(duration));
  const averageGenerationDurationMs =
    durationSamples.length > 0
      ? Math.round(durationSamples.reduce((sum, duration) => sum + duration, 0) / durationSamples.length)
      : null;
  const timeSeries = buildMonitoringTimeSeries(events, lookbackHours);

  return {
    enabled: true,
    generatedAt: new Date().toISOString(),
    lookbackHours,
    totals: {
      allEvents: events.length,
      generationCount: generationEvents.length,
      generationSuccessCount,
      generationWarningCount,
      generationErrorCount,
      generationErrorRate:
        generationEvents.length > 0 ? generationErrorCount / generationEvents.length : 0,
      averageGenerationDurationMs,
      bgHealthCheckCount: bgHealthEvents.length,
      bgHealthErrorCount: bgHealthEvents.filter((event) => event.status !== "success").length,
    },
    latest: {
      generation: generationEvents[0] ?? null,
      bgHealthCheck: bgHealthEvents[0] ?? null,
      alert: alertEvents[0] ?? null,
    },
    recentErrors: events
      .filter((event) => event.status === "error" && event.error_message)
      .slice(0, 5)
      .map((event) => ({
        createdAt: event.created_at,
        eventType: event.event_type,
        source: event.source,
        message: event.error_message || "오류 메시지 없음",
      })),
    timeSeries,
  };
}

export function verifyMonitoringAdminAccess(request: Request) {
  const secret = process.env.MONITORING_ADMIN_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      reason:
        "MONITORING_ADMIN_SECRET이 설정되지 않았습니다. 관리자 요약 API를 열려면 환경변수를 추가해주세요.",
    } as const;
  }

  const authorization = request.headers.get("authorization");
  const bearerToken =
    authorization && authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const headerSecret = request.headers.get("x-monitoring-secret")?.trim() || "";

  if (bearerToken === secret || headerSecret === secret) {
    return { ok: true } as const;
  }

  return { ok: false, reason: "관리자 모니터링 접근 권한이 없습니다." } as const;
}

export function verifyCronAccess(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      return { ok: true, warning: "CRON_SECRET 없이 개발 환경에서 수동 실행했습니다." } as const;
    }

    return {
      ok: false,
      reason: "CRON_SECRET이 없어 프로덕션 cron 요청을 검증할 수 없습니다.",
    } as const;
  }

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${secret}`) {
    return { ok: true } as const;
  }

  return { ok: false, reason: "cron 요청 인증에 실패했습니다." } as const;
}

export async function runBackgroundRemovalHealthCheck(): Promise<BackgroundRemovalHealthCheck> {
  const baseUrl = process.env.BG_API_URL?.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    return {
      configured: false,
      ok: false,
      statusCode: null,
      durationMs: null,
      message: "BG_API_URL이 없어 배경 제거 서버 헬스체크를 건너뛰었습니다.",
    };
  }

  const startedAt = Date.now();

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const durationMs = Date.now() - startedAt;
    let parsed: MonitoringJson | null = null;

    try {
      parsed = (await response.json()) as MonitoringJson;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        statusCode: response.status,
        durationMs,
        message: `배경 제거 서버 헬스체크 실패 (${response.status})`,
        metadata: parsed ?? {},
      };
    }

    return {
      configured: true,
      ok: true,
      statusCode: response.status,
      durationMs,
      message: "배경 제거 서버 정상",
      metadata: parsed ?? {},
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      statusCode: null,
      durationMs: Date.now() - startedAt,
      message: `배경 제거 서버 네트워크 오류: ${toMonitoringErrorMessage(error)}`,
    };
  }
}

export function evaluateMonitoringAlerts(
  summary: MonitoringSummary,
  bgHealthCheck?: BackgroundRemovalHealthCheck,
) {
  const alerts: MonitoringAlert[] = [];
  const generationErrorCountThreshold = readPositiveNumberEnv(
    "MONITORING_GENERATION_ERROR_COUNT_THRESHOLD",
    DEFAULT_GENERATION_ERROR_COUNT_THRESHOLD,
  );
  const generationErrorRateThreshold = readPositiveNumberEnv(
    "MONITORING_GENERATION_ERROR_RATE_THRESHOLD",
    DEFAULT_GENERATION_ERROR_RATE_THRESHOLD,
  );
  const generationWarningCountThreshold = readPositiveNumberEnv(
    "MONITORING_GENERATION_WARNING_COUNT_THRESHOLD",
    DEFAULT_GENERATION_WARNING_COUNT_THRESHOLD,
  );

  if (!summary.enabled) {
    alerts.push({
      severity: "warning",
      code: "MONITORING_DISABLED",
      message: summary.message || "모니터링 요약을 불러오지 못했습니다.",
    });
    return alerts;
  }

  if (bgHealthCheck?.configured && !bgHealthCheck.ok) {
    alerts.push({
      severity: "error",
      code: "BG_API_UNHEALTHY",
      message: bgHealthCheck.message,
    });
  }

  if (summary.totals.generationErrorCount >= generationErrorCountThreshold) {
    alerts.push({
      severity: "error",
      code: "IMAGE_GENERATION_ERRORS",
      message: `${summary.lookbackHours}시간 동안 이미지 생성 오류가 ${summary.totals.generationErrorCount}회 발생했습니다.`,
    });
  }

  if (
    summary.totals.generationCount > 0 &&
    summary.totals.generationErrorRate >= generationErrorRateThreshold
  ) {
    alerts.push({
      severity: "error",
      code: "IMAGE_GENERATION_ERROR_RATE",
      message: `${summary.lookbackHours}시간 기준 이미지 생성 실패율이 ${(summary.totals.generationErrorRate * 100).toFixed(1)}%입니다.`,
    });
  }

  if (summary.totals.generationWarningCount >= generationWarningCountThreshold) {
    alerts.push({
      severity: "warning",
      code: "IMAGE_GENERATION_WARNINGS",
      message: `${summary.lookbackHours}시간 동안 이미지 생성 경고가 ${summary.totals.generationWarningCount}회 발생했습니다.`,
    });
  }

  return alerts;
}

export function formatMonitoringAlertMessage(
  summary: MonitoringSummary,
  alerts: MonitoringAlert[],
  bgHealthCheck?: BackgroundRemovalHealthCheck,
) {
  const lines = [
    "ssu-simulation 모니터링 경고",
    "",
    `기준 구간: 최근 ${summary.lookbackHours}시간`,
    `이미지 생성: ${summary.totals.generationCount}회`,
    `성공/경고/오류: ${summary.totals.generationSuccessCount}/${summary.totals.generationWarningCount}/${summary.totals.generationErrorCount}`,
    `평균 생성 시간: ${summary.totals.averageGenerationDurationMs ?? "-"}ms`,
  ];

  if (bgHealthCheck?.configured) {
    lines.push(
      `BG 서버 상태: ${bgHealthCheck.ok ? "정상" : "이상"} (${bgHealthCheck.durationMs ?? "-"}ms)`,
    );
  }

  lines.push("", "감지된 항목:");
  lines.push(...alerts.map((alert) => `- [${alert.severity}] ${alert.message}`));

  if (summary.recentErrors.length > 0) {
    lines.push("", "최근 오류:");
    lines.push(
      ...summary.recentErrors.map(
        (entry) => `- ${entry.createdAt} ${entry.eventType}/${entry.source}: ${entry.message}`,
      ),
    );
  }

  return lines.join("\n").slice(0, 1800);
}

export async function sendMonitoringDiscordWebhook(message: string) {
  const webhookUrl = process.env.MONITORING_DISCORD_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "MONITORING_DISCORD_WEBHOOK_URL이 없어 알림 전송을 건너뛰었습니다.",
    } as const;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord 웹훅 전송 실패 (${response.status}): ${text.slice(0, 180)}`);
  }

  return { ok: true, skipped: false } as const;
}

export type MonitoringCheckResult = {
  ok: true;
  message: string;
  note: string | null;
  bgHealthCheck: BackgroundRemovalHealthCheck;
  summary: MonitoringSummary;
  alerts: MonitoringAlert[];
  webhook:
    | {
        ok: boolean;
        skipped: boolean;
        reason?: string;
      }
    | null;
};

export async function runMonitoringCheck(note: string | null = null): Promise<MonitoringCheckResult> {
  const bgHealthCheck = await runBackgroundRemovalHealthCheck();

  if (bgHealthCheck.configured) {
    await recordMonitoringEvent({
      eventType: "bg_health_check",
      status: bgHealthCheck.ok ? "success" : "error",
      source: "bg-api",
      durationMs: bgHealthCheck.durationMs,
      errorMessage: bgHealthCheck.ok ? null : bgHealthCheck.message,
      metadata: {
        statusCode: bgHealthCheck.statusCode,
        message: bgHealthCheck.message,
        details: bgHealthCheck.metadata ?? {},
      },
    });
  }

  const summary = await getMonitoringSummary();
  const alerts = evaluateMonitoringAlerts(summary, bgHealthCheck);
  let webhookResult:
    | {
        ok: boolean;
        skipped: boolean;
        reason?: string;
      }
    | null = null;

  if (alerts.length > 0) {
    const message = formatMonitoringAlertMessage(summary, alerts, bgHealthCheck);

    try {
      webhookResult = await sendMonitoringDiscordWebhook(message);
    } catch (error) {
      webhookResult = {
        ok: false,
        skipped: false,
        reason: error instanceof Error ? error.message : "Discord 웹훅 전송 실패",
      };
    }

    await recordMonitoringEvent({
      eventType: "monitoring_alert",
      status: alerts.some((alert) => alert.severity === "error") ? "error" : "warning",
      source: "system",
      errorMessage:
        webhookResult && !webhookResult.ok && !webhookResult.skipped
          ? webhookResult.reason || "알림 전송 실패"
          : null,
      metadata: {
        alerts,
        webhook: webhookResult,
      },
    });
  }

  return {
    ok: true,
    message: "모니터링 점검 완료",
    note,
    bgHealthCheck,
    summary,
    alerts,
    webhook: webhookResult,
  };
}
