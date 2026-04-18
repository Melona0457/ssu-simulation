"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./monitoring.module.css";

type MonitoringStatus = "success" | "warning" | "error";
type MonitoringEventType =
  | "professor_image_generation"
  | "bg_health_check"
  | "monitoring_alert";

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

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Admin Monitoring</p>
          <h1 className={styles.title}>실시간 운영 상태 대시보드</h1>
          <p className={styles.description}>
            이미지 생성, 배경 제거 서버 상태, 최근 경고를 브라우저에서 바로 확인할 수 있습니다.
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
                <p className={styles.cardMeta}>
                  총 이벤트 {summary.totals.allEvents}건
                </p>
              </article>
            </section>

            <section className={styles.chartGrid}>
              <article className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>시간대별 이미지 생성</h2>
                  <p className={styles.sectionHint}>성공/경고/오류를 한눈에 확인</p>
                </div>
                {generationSeries.length > 0 ? (
                  <div className={styles.chartFrame}>
                    {generationSeries.map((bucket) => {
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

                      return (
                        <div key={bucket.isoHour} className={styles.chartColumn}>
                          <div
                            className={styles.stackedBar}
                            title={`${bucket.label} / 전체 ${bucket.generationTotal}건 / 성공 ${bucket.generationSuccess} / 경고 ${bucket.generationWarning} / 오류 ${bucket.generationError}`}
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
                          <span className={styles.chartLabel}>{bucket.label}</span>
                        </div>
                      );
                    })}
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
                {generationSeries.length > 0 ? (
                  <div className={styles.chartFrame}>
                    {generationSeries.map((bucket) => {
                      const durationHeight = bucket.averageGenerationDurationMs
                        ? `${Math.max((bucket.averageGenerationDurationMs / durationMax) * 100, 6)}%`
                        : "0%";
                      const incidentHeight =
                        bucket.bgHealthErrors + bucket.alertTotal > 0
                          ? `${Math.max(((bucket.bgHealthErrors + bucket.alertTotal) / incidentMax) * 100, 6)}%`
                          : "0%";

                      return (
                        <div key={`${bucket.isoHour}-latency`} className={styles.dualColumn}>
                          <div className={styles.dualBars}>
                            <div
                              className={`${styles.slimBar} ${styles.barLatency}`}
                              title={`${bucket.label} / 평균 생성 시간 ${formatDuration(bucket.averageGenerationDurationMs)}`}
                              style={{ height: durationHeight }}
                            />
                            <div
                              className={`${styles.slimBar} ${styles.barIncident}`}
                              title={`${bucket.label} / BG 오류 ${bucket.bgHealthErrors} / 경고 ${bucket.alertTotal}`}
                              style={{ height: incidentHeight }}
                            />
                          </div>
                          <span className={styles.chartLabel}>{bucket.label}</span>
                        </div>
                      );
                    })}
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
