"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./monitoring.module.css";

type MonitoringStatus = "success" | "warning" | "error";
type MonitoringEventType =
  | "professor_image_generation"
  | "bg_health_check"
  | "monitoring_alert";
type PlatformMonitoringStatus = "ready" | "partial" | "setup_required" | "error";

type MonitoringSummaryResponse = {
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
    generation: MonitoringEventPayload | null;
    bgHealthCheck: MonitoringEventPayload | null;
    alert: MonitoringEventPayload | null;
  };
  recentErrors: Array<{
    createdAt: string;
    eventType: MonitoringEventType;
    source: string;
    message: string;
  }>;
  timeSeries: Array<{
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
  }>;
  platform: {
    generatedAt: string;
    notes: string[];
    vercel: {
      status: PlatformMonitoringStatus;
      message: string;
      scopeLabel: string | null;
      periodStart: string | null;
      periodEnd: string | null;
      totalBilledCost: number | null;
      totalEffectiveCost: number | null;
      services: Array<{
        name: string;
        billedCost: number | null;
        effectiveCost: number | null;
        usageQuantity: number | null;
        usageUnit: string | null;
      }>;
      rawLineCount: number;
      updatedAt: string;
      setup: string[];
    };
    supabase: {
      status: PlatformMonitoringStatus;
      message: string;
      projectRef: string | null;
      storageObjectCount: number | null;
      storageBucketCount: number | null;
      approxStorageBytes: number | null;
      storageScanTruncated: boolean;
      requestBreakdown: {
        totalRequests: number | null;
        authRequests: number | null;
        realtimeRequests: number | null;
        restRequests: number | null;
        storageRequests: number | null;
        windowLabel: string;
      } | null;
      updatedAt: string;
      setup: string[];
    };
  };
};

type MonitoringEventPayload = {
  id: string;
  created_at: string;
  event_type: MonitoringEventType;
  status: MonitoringStatus;
  source: string;
  duration_ms: number | null;
  error_message: string | null;
  metadata: unknown;
};

type MonitoringCheckResponse = {
  ok: boolean;
  message?: string;
  note?: string | null;
  alerts?: Array<{
    severity: "warning" | "error";
    code: string;
    message: string;
  }>;
  bgHealthCheck?: {
    configured: boolean;
    ok: boolean;
    statusCode: number | null;
    durationMs: number | null;
    message: string;
  };
  webhook?: {
    ok: boolean;
    skipped: boolean;
    reason?: string;
  } | null;
};

const SECRET_STORAGE_KEY = "ssu-monitoring-admin-secret-v1";
const AUTO_REFRESH_INTERVAL_MS = 60_000;

function toLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(value: number | null) {
  return typeof value === "number" ? `${value}ms` : "-";
}

function formatNumber(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBytes(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "-";
  }

  if (value < 1024) {
    return `${value}B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let currentValue = value / 1024;
  let unitIndex = 0;

  while (currentValue >= 1024 && unitIndex < units.length - 1) {
    currentValue /= 1024;
    unitIndex += 1;
  }

  return `${currentValue.toFixed(currentValue >= 10 ? 1 : 2)}${units[unitIndex]}`;
}

function getStatusTone(status: MonitoringStatus | "info") {
  if (status === "success") {
    return styles.statusSuccess;
  }

  if (status === "warning") {
    return styles.statusWarning;
  }

  if (status === "error") {
    return styles.statusError;
  }

  return styles.statusInfo;
}

function getPlatformTone(status: PlatformMonitoringStatus) {
  if (status === "ready") {
    return styles.statusSuccess;
  }

  if (status === "partial") {
    return styles.statusWarning;
  }

  if (status === "error") {
    return styles.statusError;
  }

  return styles.statusInfo;
}

function getPlatformStatusLabel(status: PlatformMonitoringStatus) {
  if (status === "ready") {
    return "정상";
  }

  if (status === "partial") {
    return "부분 연결";
  }

  if (status === "error") {
    return "오류";
  }

  return "설정 필요";
}

function formatAxisHour(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function shouldShowAxisLabel(index: number, total: number, value: string) {
  if (index === 0 || index === total - 1) {
    return true;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return index % 2 === 0;
  }

  return date.getHours() % 2 === 0 || date.getHours() === 0;
}

async function fetchWithSecret<T>(
  url: string,
  secret: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-monitoring-secret": secret,
    },
  });

  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(data.message || "요청에 실패했습니다.");
  }

  return data;
}

export function MonitoringDashboard() {
  const [secret, setSecret] = useState("");
  const [summary, setSummary] = useState<MonitoringSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const storedSecret = window.sessionStorage.getItem(SECRET_STORAGE_KEY);
    if (storedSecret) {
      setSecret(storedSecret);
    }
  }, []);

  const loadSummary = useCallback(async (nextSecret?: string) => {
    const effectiveSecret = (nextSecret ?? secret).trim();
    if (!effectiveSecret) {
      setErrorMessage("관리자 비밀키를 먼저 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const data = await fetchWithSecret<MonitoringSummaryResponse>(
        "/api/admin/monitoring-summary",
        effectiveSecret,
      );
      setSummary(data);
      window.sessionStorage.setItem(SECRET_STORAGE_KEY, effectiveSecret);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "모니터링 요약을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [secret]);

  async function runCheckNow() {
    const effectiveSecret = secret.trim();
    if (!effectiveSecret) {
      setErrorMessage("관리자 비밀키를 먼저 입력해주세요.");
      return;
    }

    setIsRunningCheck(true);
    setErrorMessage("");
    setLastCheckMessage("");

    try {
      const result = await fetchWithSecret<MonitoringCheckResponse>(
        "/api/admin/monitoring-run",
        effectiveSecret,
        {
          method: "POST",
        },
      );

      const alertCount = result.alerts?.length ?? 0;
      setLastCheckMessage(
        `${result.message || "점검 완료"}${alertCount > 0 ? ` / 감지된 경고 ${alertCount}건` : ""}`,
      );
      await loadSummary(effectiveSecret);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "모니터링 점검 실행에 실패했습니다.");
    } finally {
      setIsRunningCheck(false);
    }
  }

  useEffect(() => {
    if (!autoRefreshEnabled || !secret.trim()) {
      return;
    }

    const refreshSummarySilently = () => {
      void loadSummary(secret);
    };
    const timer = window.setInterval(() => {
      refreshSummarySilently();
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [autoRefreshEnabled, secret, loadSummary]);

  const generation = summary?.latest.generation;
  const bgHealth = summary?.latest.bgHealthCheck;
  const alert = summary?.latest.alert;
  const generationSeries = summary?.timeSeries ?? [];
  const generationMax = Math.max(1, ...generationSeries.map((bucket) => bucket.generationTotal));
  const durationMax = Math.max(
    1,
    ...generationSeries.map((bucket) => bucket.averageGenerationDurationMs ?? 0),
  );
  const incidentMax = Math.max(
    1,
    ...generationSeries.map((bucket) => bucket.bgHealthErrors + bucket.alertTotal),
  );
  const chartColumnCount = Math.max(1, generationSeries.length);
  const chartMinWidth = Math.max(chartColumnCount * 42, 720);
  const vercelPlatform = summary?.platform.vercel;
  const supabasePlatform = summary?.platform.supabase;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Admin Monitoring</p>
          <h1 className={styles.title}>실시간 운영 상태 대시보드</h1>
          <p className={styles.description}>
            앱 내부 이벤트와 Vercel/Supabase 플랫폼 스냅샷을 한 화면에서 나눠 확인할 수 있습니다.
          </p>
        </section>

        <section className={styles.panel}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="monitoring-secret">
              관리자 비밀키
            </label>
            <div className={styles.secretRow}>
              <input
                id="monitoring-secret"
                className={styles.input}
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="MONITORING_ADMIN_SECRET 입력"
              />
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowSecret((current) => !current)}
              >
                {showSecret ? "숨기기" : "보기"}
              </button>
            </div>
            <p className={styles.helper}>
              비밀키는 이 브라우저 탭의 session storage에만 저장됩니다.
            </p>
          </div>

          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void loadSummary()}
              disabled={isLoading}
            >
              {isLoading ? "불러오는 중..." : "요약 불러오기"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void runCheckNow()}
              disabled={isRunningCheck}
            >
              {isRunningCheck ? "점검 실행 중..." : "지금 점검 실행"}
            </button>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(event) => setAutoRefreshEnabled(event.target.checked)}
              />
              1분마다 자동 새로고침
            </label>
          </div>

          {errorMessage ? <p className={`${styles.notice} ${styles.noticeError}`}>{errorMessage}</p> : null}
          {lastCheckMessage ? (
            <p className={`${styles.notice} ${styles.noticeInfo}`}>{lastCheckMessage}</p>
          ) : null}
        </section>

        {summary ? (
          <>
            <section className={styles.sectionBlock}>
              <div className={styles.blockHeader}>
                <div>
                  <p className={styles.blockEyebrow}>App Monitoring</p>
                  <h2 className={styles.blockTitle}>앱 상태</h2>
                </div>
                <p className={styles.blockDescription}>
                  최근 {summary.lookbackHours}시간 기준 이미지 생성, BG 서버, 자동 경고를 요약합니다.
                </p>
              </div>

              <section className={styles.grid}>
                <article className={styles.card}>
                  <p className={styles.cardLabel}>최근 {summary.lookbackHours}시간 생성 수</p>
                  <p className={styles.cardValue}>{summary.totals.generationCount}</p>
                  <p className={styles.cardMeta}>
                    성공 {summary.totals.generationSuccessCount} / 경고 {summary.totals.generationWarningCount} / 오류{" "}
                    {summary.totals.generationErrorCount}
                  </p>
                </article>
                <article className={styles.card}>
                  <p className={styles.cardLabel}>실패율</p>
                  <p className={styles.cardValue}>{formatPercent(summary.totals.generationErrorRate)}</p>
                  <p className={styles.cardMeta}>평균 생성 시간 {summary.totals.averageGenerationDurationMs ?? "-"}ms</p>
                </article>
                <article className={styles.card}>
                  <p className={styles.cardLabel}>BG 헬스체크</p>
                  <p className={styles.cardValue}>{summary.totals.bgHealthCheckCount}</p>
                  <p className={styles.cardMeta}>오류 {summary.totals.bgHealthErrorCount}건</p>
                </article>
                <article className={styles.card}>
                  <p className={styles.cardLabel}>최신 기준 시각</p>
                  <p className={styles.cardValueSmall}>{toLocalDateTime(summary.generatedAt)}</p>
                  <p className={styles.cardMeta}>총 이벤트 {summary.totals.allEvents}건</p>
                </article>
              </section>

              <section className={styles.chartGrid}>
                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>시간대별 이미지 생성</h2>
                    <p className={styles.sectionHint}>성공/경고/오류를 막대 하나에 누적</p>
                  </div>
                  <div className={styles.chartLegend}>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendSuccess}`} />
                      성공
                    </span>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendWarning}`} />
                      경고
                    </span>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendError}`} />
                      오류
                    </span>
                  </div>
                  {generationSeries.length > 0 ? (
                    <div className={styles.chartScroller}>
                      <div
                        className={styles.chartFrame}
                        style={{
                          gridTemplateColumns: `repeat(${chartColumnCount}, minmax(36px, 1fr))`,
                          minWidth: `${chartMinWidth}px`,
                        }}
                      >
                        {generationSeries.map((bucket, index) => {
                          const totalHeight = bucket.generationTotal > 0
                            ? `${Math.max((bucket.generationTotal / generationMax) * 100, 6)}%`
                            : "0%";
                          const successHeight =
                            bucket.generationTotal > 0
                              ? `${(bucket.generationSuccess / bucket.generationTotal) * 100}%`
                              : "0%";
                          const warningHeight =
                            bucket.generationTotal > 0
                              ? `${(bucket.generationWarning / bucket.generationTotal) * 100}%`
                              : "0%";
                          const errorHeight =
                            bucket.generationTotal > 0
                              ? `${(bucket.generationError / bucket.generationTotal) * 100}%`
                              : "0%";
                          const showLabel = shouldShowAxisLabel(index, generationSeries.length, bucket.isoHour);

                          return (
                            <div key={bucket.isoHour} className={styles.chartColumn}>
                              <div className={styles.stackedBarTrack}>
                                <div
                                  className={styles.stackedBar}
                                  title={`${toLocalDateTime(bucket.isoHour)} / 전체 ${bucket.generationTotal}건 / 성공 ${bucket.generationSuccess} / 경고 ${bucket.generationWarning} / 오류 ${bucket.generationError}`}
                                  style={{ height: totalHeight }}
                                >
                                  <span
                                    className={`${styles.barSegment} ${styles.barSuccess}`}
                                    style={{ height: successHeight }}
                                  />
                                  <span
                                    className={`${styles.barSegment} ${styles.barWarning}`}
                                    style={{ height: warningHeight }}
                                  />
                                  <span
                                    className={`${styles.barSegment} ${styles.barError}`}
                                    style={{ height: errorHeight }}
                                  />
                                </div>
                              </div>
                              <span className={styles.chartValue}>{bucket.generationTotal}</span>
                              <span className={styles.chartLabel}>{showLabel ? formatAxisHour(bucket.isoHour) : " "}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyState}>차트를 그릴 데이터가 아직 없습니다.</p>
                  )}
                </article>

                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>시간대별 지연/이상 징후</h2>
                    <p className={styles.sectionHint}>평균 생성 시간과 BG/알림 이벤트</p>
                  </div>
                  <div className={styles.chartLegend}>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendLatency}`} />
                      생성 지연
                    </span>
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.legendIncident}`} />
                      BG/알림
                    </span>
                  </div>
                  {generationSeries.length > 0 ? (
                    <div className={styles.chartScroller}>
                      <div
                        className={styles.chartFrame}
                        style={{
                          gridTemplateColumns: `repeat(${chartColumnCount}, minmax(36px, 1fr))`,
                          minWidth: `${chartMinWidth}px`,
                        }}
                      >
                        {generationSeries.map((bucket, index) => {
                          const durationHeight = bucket.averageGenerationDurationMs
                            ? `${Math.max((bucket.averageGenerationDurationMs / durationMax) * 100, 6)}%`
                            : "0%";
                          const incidentHeight =
                            bucket.bgHealthErrors + bucket.alertTotal > 0
                              ? `${Math.max(((bucket.bgHealthErrors + bucket.alertTotal) / incidentMax) * 100, 6)}%`
                              : "0%";
                          const showLabel = shouldShowAxisLabel(index, generationSeries.length, bucket.isoHour);

                          return (
                            <div key={`${bucket.isoHour}-latency`} className={styles.dualColumn}>
                              <div className={styles.dualBars}>
                                <div
                                  className={`${styles.slimBar} ${styles.barLatency}`}
                                  title={`${toLocalDateTime(bucket.isoHour)} / 평균 생성 시간 ${formatDuration(bucket.averageGenerationDurationMs)}`}
                                  style={{ height: durationHeight }}
                                />
                                <div
                                  className={`${styles.slimBar} ${styles.barIncident}`}
                                  title={`${toLocalDateTime(bucket.isoHour)} / BG 오류 ${bucket.bgHealthErrors} / 경고 ${bucket.alertTotal}`}
                                  style={{ height: incidentHeight }}
                                />
                              </div>
                              <span className={styles.chartValue}>
                                {bucket.averageGenerationDurationMs ? `${bucket.averageGenerationDurationMs}ms` : "-"}
                              </span>
                              <span className={styles.chartLabel}>{showLabel ? formatAxisHour(bucket.isoHour) : " "}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.emptyState}>차트를 그릴 데이터가 아직 없습니다.</p>
                  )}
                </article>
              </section>

              <section className={styles.detailGrid}>
                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>최신 이벤트</h2>
                  </div>
                  <div className={styles.eventList}>
                    <div className={styles.eventItem}>
                      <div className={styles.eventTop}>
                        <p className={styles.eventTitle}>이미지 생성</p>
                        <span className={`${styles.statusPill} ${getStatusTone(generation?.status ?? "info")}`}>
                          {generation?.status ?? "기록 없음"}
                        </span>
                      </div>
                      <p className={styles.eventMeta}>
                        {generation ? toLocalDateTime(generation.created_at) : "-"} / {generation?.duration_ms ?? "-"}ms
                      </p>
                      <p className={styles.eventBody}>{generation?.error_message || "최근 오류 없음"}</p>
                    </div>
                    <div className={styles.eventItem}>
                      <div className={styles.eventTop}>
                        <p className={styles.eventTitle}>BG 서버</p>
                        <span className={`${styles.statusPill} ${getStatusTone(bgHealth?.status ?? "info")}`}>
                          {bgHealth?.status ?? "기록 없음"}
                        </span>
                      </div>
                      <p className={styles.eventMeta}>
                        {bgHealth ? toLocalDateTime(bgHealth.created_at) : "-"} / {bgHealth?.duration_ms ?? "-"}ms
                      </p>
                      <p className={styles.eventBody}>{bgHealth?.error_message || "최근 오류 없음"}</p>
                    </div>
                    <div className={styles.eventItem}>
                      <div className={styles.eventTop}>
                        <p className={styles.eventTitle}>자동 경고</p>
                        <span className={`${styles.statusPill} ${getStatusTone(alert?.status ?? "info")}`}>
                          {alert?.status ?? "기록 없음"}
                        </span>
                      </div>
                      <p className={styles.eventMeta}>{alert ? toLocalDateTime(alert.created_at) : "-"}</p>
                      <p className={styles.eventBody}>{alert?.error_message || "최근 경고 없음"}</p>
                    </div>
                  </div>
                </article>

                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>최근 오류</h2>
                  </div>
                  {summary.recentErrors.length > 0 ? (
                    <div className={styles.errorList}>
                      {summary.recentErrors.map((entry) => (
                        <div key={`${entry.createdAt}-${entry.eventType}-${entry.source}`} className={styles.errorItem}>
                          <p className={styles.errorTitle}>
                            {entry.eventType} / {entry.source}
                          </p>
                          <p className={styles.errorMeta}>{toLocalDateTime(entry.createdAt)}</p>
                          <p className={styles.errorBody}>{entry.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>최근 오류가 없습니다.</p>
                  )}
                </article>
              </section>
            </section>

            <section className={styles.sectionBlock}>
              <div className={styles.blockHeader}>
                <div>
                  <p className={styles.blockEyebrow}>Platform Monitoring</p>
                  <h2 className={styles.blockTitle}>플랫폼 사용량</h2>
                </div>
                <p className={styles.blockDescription}>
                  앱 이벤트와 별개로 Vercel/Supabase 쪽 스냅샷을 보여줍니다.
                </p>
              </div>

              <section className={styles.platformGrid}>
                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>Vercel Billing Snapshot</h2>
                      <p className={styles.sectionHint}>
                        현재는 팀/계정 billing API 기준 집계입니다.
                      </p>
                    </div>
                    {vercelPlatform ? (
                      <span className={`${styles.statusPill} ${getPlatformTone(vercelPlatform.status)}`}>
                        {getPlatformStatusLabel(vercelPlatform.status)}
                      </span>
                    ) : null}
                  </div>

                  {vercelPlatform ? (
                    <>
                      <p className={styles.platformMessage}>{vercelPlatform.message}</p>
                      <div className={styles.platformMetrics}>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>이번 달 billed cost</p>
                          <p className={styles.metricValue}>{formatCurrency(vercelPlatform.totalBilledCost)}</p>
                        </div>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>effective cost</p>
                          <p className={styles.metricValue}>{formatCurrency(vercelPlatform.totalEffectiveCost)}</p>
                        </div>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>서비스 항목</p>
                          <p className={styles.metricValue}>{formatNumber(vercelPlatform.services.length)}</p>
                        </div>
                      </div>

                      <div className={styles.metaList}>
                        <p className={styles.metaRow}>범위: {vercelPlatform.scopeLabel || "-"}</p>
                        <p className={styles.metaRow}>
                          기간: {toLocalDateTime(vercelPlatform.periodStart)} ~ {toLocalDateTime(vercelPlatform.periodEnd)}
                        </p>
                        <p className={styles.metaRow}>업데이트: {toLocalDateTime(vercelPlatform.updatedAt)}</p>
                      </div>

                      {vercelPlatform.services.length > 0 ? (
                        <div className={styles.breakdownList}>
                          {vercelPlatform.services.map((service) => (
                            <div key={service.name} className={styles.breakdownItem}>
                              <div>
                                <p className={styles.breakdownTitle}>{service.name}</p>
                                <p className={styles.breakdownMeta}>
                                  {service.usageQuantity !== null
                                    ? `${formatNumber(service.usageQuantity)} ${service.usageUnit ?? ""}`.trim()
                                    : "사용량 단위 정보 없음"}
                                </p>
                              </div>
                              <p className={styles.breakdownValue}>
                                {formatCurrency(service.effectiveCost ?? service.billedCost)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyState}>표시할 billing line item이 아직 없습니다.</p>
                      )}

                      {vercelPlatform.setup.length > 0 ? (
                        <div className={styles.inlineNotice}>
                          <p className={styles.inlineNoticeTitle}>추가 설정 권장</p>
                          <p className={styles.inlineNoticeBody}>{vercelPlatform.setup.join(", ")}</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className={styles.emptyState}>Vercel 플랫폼 스냅샷을 아직 불러오지 못했습니다.</p>
                  )}
                </article>

                <article className={styles.panel}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>Supabase Usage Snapshot</h2>
                      <p className={styles.sectionHint}>
                        storage.objects 기준 저장 용량과 Management API 요청 집계를 함께 표시합니다.
                      </p>
                    </div>
                    {supabasePlatform ? (
                      <span className={`${styles.statusPill} ${getPlatformTone(supabasePlatform.status)}`}>
                        {getPlatformStatusLabel(supabasePlatform.status)}
                      </span>
                    ) : null}
                  </div>

                  {supabasePlatform ? (
                    <>
                      <p className={styles.platformMessage}>{supabasePlatform.message}</p>
                      <div className={styles.platformMetrics}>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>스토리지 크기</p>
                          <p className={styles.metricValue}>{formatBytes(supabasePlatform.approxStorageBytes)}</p>
                        </div>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>오브젝트 수</p>
                          <p className={styles.metricValue}>{formatNumber(supabasePlatform.storageObjectCount)}</p>
                        </div>
                        <div className={styles.metricCard}>
                          <p className={styles.metricLabel}>버킷 수</p>
                          <p className={styles.metricValue}>{formatNumber(supabasePlatform.storageBucketCount)}</p>
                        </div>
                      </div>

                      <div className={styles.metaList}>
                        <p className={styles.metaRow}>프로젝트 ref: {supabasePlatform.projectRef || "-"}</p>
                        <p className={styles.metaRow}>업데이트: {toLocalDateTime(supabasePlatform.updatedAt)}</p>
                        {supabasePlatform.storageScanTruncated ? (
                          <p className={styles.metaRow}>스토리지 용량은 표본 스캔 상한 기준 근사치입니다.</p>
                        ) : null}
                      </div>

                      {supabasePlatform.requestBreakdown ? (
                        <div className={styles.breakdownList}>
                          <div className={styles.breakdownItem}>
                            <div>
                              <p className={styles.breakdownTitle}>{supabasePlatform.requestBreakdown.windowLabel} 총 API 요청</p>
                              <p className={styles.breakdownMeta}>Auth / REST / Storage / Realtime 합산</p>
                            </div>
                            <p className={styles.breakdownValue}>
                              {formatNumber(supabasePlatform.requestBreakdown.totalRequests)}
                            </p>
                          </div>
                          <div className={styles.breakdownItem}>
                            <div>
                              <p className={styles.breakdownTitle}>REST / Storage</p>
                              <p className={styles.breakdownMeta}>
                                {formatNumber(supabasePlatform.requestBreakdown.restRequests)} / {formatNumber(supabasePlatform.requestBreakdown.storageRequests)}
                              </p>
                            </div>
                            <p className={styles.breakdownValue}>Data API</p>
                          </div>
                          <div className={styles.breakdownItem}>
                            <div>
                              <p className={styles.breakdownTitle}>Auth / Realtime</p>
                              <p className={styles.breakdownMeta}>
                                {formatNumber(supabasePlatform.requestBreakdown.authRequests)} / {formatNumber(supabasePlatform.requestBreakdown.realtimeRequests)}
                              </p>
                            </div>
                            <p className={styles.breakdownValue}>Infra</p>
                          </div>
                        </div>
                      ) : (
                        <p className={styles.emptyState}>Management API 요청 집계는 아직 연결되지 않았습니다.</p>
                      )}

                      {supabasePlatform.setup.length > 0 ? (
                        <div className={styles.inlineNotice}>
                          <p className={styles.inlineNoticeTitle}>추가 설정 필요</p>
                          <p className={styles.inlineNoticeBody}>{supabasePlatform.setup.join(", ")}</p>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <p className={styles.emptyState}>Supabase 플랫폼 스냅샷을 아직 불러오지 못했습니다.</p>
                  )}
                </article>
              </section>

              {summary.platform.notes.length > 0 ? (
                <section className={styles.noteList}>
                  {summary.platform.notes.map((note) => (
                    <p key={note} className={styles.noteItem}>
                      {note}
                    </p>
                  ))}
                </section>
              ) : null}
            </section>
          </>
        ) : (
          <section className={styles.panel}>
            <p className={styles.emptyState}>
              관리자 비밀키를 입력한 뒤 요약을 불러오면 대시보드가 표시됩니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
