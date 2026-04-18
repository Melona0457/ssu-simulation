import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PlatformMonitoringStatus = "ready" | "partial" | "setup_required" | "error";

export type VercelServiceCharge = {
  name: string;
  billedCost: number | null;
  effectiveCost: number | null;
  usageQuantity: number | null;
  usageUnit: string | null;
};

export type VercelPlatformSummary = {
  status: PlatformMonitoringStatus;
  message: string;
  scopeLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalBilledCost: number | null;
  totalEffectiveCost: number | null;
  services: VercelServiceCharge[];
  rawLineCount: number;
  updatedAt: string;
  setup: string[];
};

export type SupabaseRequestBreakdown = {
  totalRequests: number | null;
  authRequests: number | null;
  realtimeRequests: number | null;
  restRequests: number | null;
  storageRequests: number | null;
  windowLabel: string;
};

export type SupabasePlatformSummary = {
  status: PlatformMonitoringStatus;
  message: string;
  projectRef: string | null;
  storageObjectCount: number | null;
  storageBucketCount: number | null;
  approxStorageBytes: number | null;
  storageScanTruncated: boolean;
  requestBreakdown: SupabaseRequestBreakdown | null;
  updatedAt: string;
  setup: string[];
};

export type PlatformMonitoringSummary = {
  generatedAt: string;
  notes: string[];
  vercel: VercelPlatformSummary;
  supabase: SupabasePlatformSummary;
};

type SupabaseUsageApiResult = {
  result?: Array<{
    timestamp?: string;
    total_auth_requests?: number;
    total_realtime_requests?: number;
    total_rest_requests?: number;
    total_storage_requests?: number;
  }>;
  error?: string | null;
};

const EXTERNAL_API_TIMEOUT_MS = 6_000;
const SUPABASE_STORAGE_SCAN_PAGE_SIZE = 500;
const SUPABASE_STORAGE_SCAN_MAX_PAGES = 20;

function nowIso() {
  return new Date().toISOString();
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toSafeInteger(value: unknown) {
  const numeric = toFiniteNumber(value);
  return numeric === null ? null : Math.max(0, Math.round(numeric));
}

function readObjectValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  const normalizedKeyMap = new Map(
    Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const key of keys) {
    const matched = normalizedKeyMap.get(key.toLowerCase());
    if (matched !== undefined) {
      return matched;
    }
  }

  return undefined;
}

function readStringValue(record: Record<string, unknown>, keys: string[]) {
  const value = readObjectValue(record, keys);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumberValue(record: Record<string, unknown>, keys: string[]) {
  return toFiniteNumber(readObjectValue(record, keys));
}

function readJsonLines(text: string) {
  const rows: Record<string, unknown>[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        rows.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Ignore malformed JSONL rows and continue aggregating what we can parse.
    }
  }

  return rows;
}

function withTimeoutSignal(timeoutMs = EXTERNAL_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    release() {
      clearTimeout(timeout);
    },
  };
}

function parseSupabaseProjectRef() {
  const explicitRef = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicitRef) {
    return explicitRef;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(supabaseUrl);
    const hostnameParts = parsed.hostname.split(".");
    return hostnameParts.length > 0 ? hostnameParts[0] || null : null;
  } catch {
    return null;
  }
}

function startOfCurrentUtcMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function fetchVercelPlatformSummary(): Promise<VercelPlatformSummary> {
  const updatedAt = nowIso();
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim();

  if (!token) {
    return {
      status: "setup_required",
      message: "VERCEL_API_TOKEN이 없어 Vercel billing 스냅샷을 불러오지 않았습니다.",
      scopeLabel: null,
      periodStart: null,
      periodEnd: null,
      totalBilledCost: null,
      totalEffectiveCost: null,
      services: [],
      rawLineCount: 0,
      updatedAt,
      setup: ["VERCEL_API_TOKEN", "VERCEL_TEAM_ID 또는 VERCEL_TEAM_SLUG(팀 프로젝트면 권장)"],
    };
  }

  const from = startOfCurrentUtcMonth();
  const to = new Date();
  const url = new URL("https://api.vercel.com/v1/billing/charges");
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("to", to.toISOString());

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  } else if (teamSlug) {
    url.searchParams.set("slug", teamSlug);
  }

  const timeout = withTimeoutSignal();

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/x-ndjson, application/json, text/plain",
      },
      cache: "no-store",
      signal: timeout.signal,
    });

    if (!response.ok) {
      const text = (await response.text()).slice(0, 220);
      return {
        status: "error",
        message: `Vercel API 응답 오류 (${response.status}): ${text || "본문 없음"}`,
        scopeLabel: teamId || teamSlug || "personal",
        periodStart: from.toISOString(),
        periodEnd: to.toISOString(),
        totalBilledCost: null,
        totalEffectiveCost: null,
        services: [],
        rawLineCount: 0,
        updatedAt,
        setup: [],
      };
    }

    const payload = await response.text();
    const rows = readJsonLines(payload);
    const services = new Map<string, VercelServiceCharge>();
    let totalBilledCost = 0;
    let totalEffectiveCost = 0;

    for (const row of rows) {
      const serviceName =
        readStringValue(row, ["serviceName", "ServiceName", "subAccountName", "SubAccountName"]) ||
        "기타";
      const billedCost = readNumberValue(row, [
        "billedCost",
        "BilledCost",
        "amount",
        "Amount",
      ]);
      const effectiveCost = readNumberValue(row, [
        "effectiveCost",
        "EffectiveCost",
        "cost",
        "Cost",
      ]);
      const usageQuantity = readNumberValue(row, [
        "usageQuantity",
        "UsageQuantity",
        "consumedQuantity",
        "ConsumedQuantity",
        "quantity",
        "Quantity",
      ]);
      const usageUnit = readStringValue(row, [
        "usageUnit",
        "UsageUnit",
        "pricingUnit",
        "PricingUnit",
        "unit",
        "Unit",
      ]);

      totalBilledCost += billedCost ?? 0;
      totalEffectiveCost += effectiveCost ?? billedCost ?? 0;

      const current = services.get(serviceName);
      if (current) {
        current.billedCost = (current.billedCost ?? 0) + (billedCost ?? 0);
        current.effectiveCost = (current.effectiveCost ?? 0) + (effectiveCost ?? billedCost ?? 0);
        current.usageQuantity =
          current.usageQuantity === null && usageQuantity === null
            ? null
            : (current.usageQuantity ?? 0) + (usageQuantity ?? 0);
        current.usageUnit = current.usageUnit || usageUnit;
      } else {
        services.set(serviceName, {
          name: serviceName,
          billedCost,
          effectiveCost: effectiveCost ?? billedCost,
          usageQuantity,
          usageUnit,
        });
      }
    }

    const serviceList = Array.from(services.values())
      .sort(
        (left, right) =>
          (right.effectiveCost ?? right.billedCost ?? 0) -
          (left.effectiveCost ?? left.billedCost ?? 0),
      )
      .slice(0, 8);

    const hasScopeHint = !teamId && !teamSlug;

    return {
      status: hasScopeHint ? "partial" : "ready",
      message:
        rows.length > 0
          ? hasScopeHint
            ? "Vercel billing API를 개인 기본 범위로 조회했습니다. 팀 프로젝트면 team 설정을 추가하는 편이 안전합니다."
            : "Vercel billing 스냅샷을 불러왔습니다."
          : "이번 달 Vercel billing charge 항목이 아직 없습니다.",
      scopeLabel: teamId || teamSlug || "personal",
      periodStart: from.toISOString(),
      periodEnd: to.toISOString(),
      totalBilledCost,
      totalEffectiveCost,
      services: serviceList,
      rawLineCount: rows.length,
      updatedAt,
      setup: hasScopeHint ? ["VERCEL_TEAM_ID 또는 VERCEL_TEAM_SLUG"] : [],
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? `Vercel billing 스냅샷 조회 실패: ${error.message}`
          : "Vercel billing 스냅샷 조회 실패",
      scopeLabel: teamId || teamSlug || "personal",
      periodStart: from.toISOString(),
      periodEnd: to.toISOString(),
      totalBilledCost: null,
      totalEffectiveCost: null,
      services: [],
      rawLineCount: 0,
      updatedAt,
      setup: [],
    };
  } finally {
    timeout.release();
  }
}

async function fetchSupabaseUsageBreakdown(projectRef: string, token: string) {
  const baseUrl = `https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/usage.api-counts`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const attemptUrls = [`${baseUrl}?interval=24h`, baseUrl];

  for (let index = 0; index < attemptUrls.length; index += 1) {
    const timeout = withTimeoutSignal();

    try {
      const response = await fetch(attemptUrls[index], {
        headers,
        cache: "no-store",
        signal: timeout.signal,
      });

      if (!response.ok) {
        if (index === 0 && response.status === 400) {
          continue;
        }

        const text = (await response.text()).slice(0, 220);
        throw new Error(`Supabase Management API 응답 오류 (${response.status}): ${text || "본문 없음"}`);
      }

      const payload = (await response.json()) as SupabaseUsageApiResult;
      const points = Array.isArray(payload.result) ? payload.result : [];

      return {
        totalRequests: points.reduce(
          (sum, point) =>
            sum +
            (point.total_auth_requests ?? 0) +
            (point.total_realtime_requests ?? 0) +
            (point.total_rest_requests ?? 0) +
            (point.total_storage_requests ?? 0),
          0,
        ),
        authRequests: points.reduce((sum, point) => sum + (point.total_auth_requests ?? 0), 0),
        realtimeRequests: points.reduce(
          (sum, point) => sum + (point.total_realtime_requests ?? 0),
          0,
        ),
        restRequests: points.reduce((sum, point) => sum + (point.total_rest_requests ?? 0), 0),
        storageRequests: points.reduce((sum, point) => sum + (point.total_storage_requests ?? 0), 0),
        windowLabel: index === 0 ? "최근 24시간" : "최근 집계",
      } satisfies SupabaseRequestBreakdown;
    } finally {
      timeout.release();
    }
  }

  return null;
}

async function fetchSupabasePlatformSummary(): Promise<SupabasePlatformSummary> {
  const updatedAt = nowIso();
  const projectRef = parseSupabaseProjectRef();
  const managementToken = process.env.SUPABASE_MANAGEMENT_API_TOKEN?.trim();
  const supabase = createSupabaseServerClient();
  const setup: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    setup.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    setup.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  let storageObjectCount: number | null = null;
  let storageBucketCount: number | null = null;
  let approxStorageBytes: number | null = null;
  let storageScanTruncated = false;
  let storageMessage = "";

  if (supabase) {
    try {
      const { count: bucketCount, error: bucketError } = await supabase
        .schema("storage")
        .from("buckets")
        .select("id", { count: "exact", head: true });

      if (bucketError) {
        throw new Error(bucketError.message);
      }

      storageBucketCount = bucketCount ?? null;

      let scannedObjects = 0;
      let exactObjectCount: number | null = null;
      let totalBytes = 0;

      for (let pageIndex = 0; pageIndex < SUPABASE_STORAGE_SCAN_MAX_PAGES; pageIndex += 1) {
        const from = pageIndex * SUPABASE_STORAGE_SCAN_PAGE_SIZE;
        const to = from + SUPABASE_STORAGE_SCAN_PAGE_SIZE - 1;
        const query = supabase
          .schema("storage")
          .from("objects")
          .select("bucket_id, metadata", pageIndex === 0 ? { count: "exact" } : undefined)
          .order("id", { ascending: true })
          .range(from, to);

        const { data, error, count } = await query;
        if (error) {
          throw new Error(error.message);
        }

        if (pageIndex === 0) {
          exactObjectCount = count ?? null;
        }

        if (!data || data.length === 0) {
          break;
        }

        scannedObjects += data.length;

        for (const row of data) {
          if (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)) {
            const size = toSafeInteger((row.metadata as Record<string, unknown>).size);
            totalBytes += size ?? 0;
          }
        }

        if (data.length < SUPABASE_STORAGE_SCAN_PAGE_SIZE) {
          break;
        }
      }

      storageObjectCount = exactObjectCount ?? scannedObjects;
      approxStorageBytes = totalBytes;
      storageScanTruncated =
        storageObjectCount !== null && storageObjectCount > SUPABASE_STORAGE_SCAN_PAGE_SIZE * SUPABASE_STORAGE_SCAN_MAX_PAGES;
      storageMessage = storageScanTruncated
        ? "storage.objects 표본 스캔 상한까지 합산한 근사치입니다."
        : "storage.objects 메타데이터 기준으로 합산했습니다.";
    } catch (error) {
      storageMessage =
        error instanceof Error
          ? `스토리지 사용량 집계 실패: ${error.message}`
          : "스토리지 사용량 집계 실패";
    }
  } else {
    storageMessage = "서비스 역할 키가 없어 스토리지 사용량 집계를 건너뛰었습니다.";
  }

  let requestBreakdown: SupabaseRequestBreakdown | null = null;
  let requestMessage = "";

  if (projectRef && managementToken) {
    try {
      requestBreakdown = await fetchSupabaseUsageBreakdown(projectRef, managementToken);
      requestMessage = requestBreakdown
        ? `${requestBreakdown.windowLabel} API 요청 집계를 불러왔습니다.`
        : "최근 API 요청 집계를 불러오지 못했습니다.";
    } catch (error) {
      requestMessage =
        error instanceof Error
          ? `API 요청 집계 실패: ${error.message}`
          : "API 요청 집계 실패";
    }
  } else {
    if (!projectRef) {
      setup.push("SUPABASE_PROJECT_REF 또는 NEXT_PUBLIC_SUPABASE_URL");
    }

    if (!managementToken) {
      setup.push("SUPABASE_MANAGEMENT_API_TOKEN");
    }

    requestMessage = "Management API 토큰이 없어 API 요청 집계는 생략했습니다.";
  }

  const hasStorageData = storageObjectCount !== null || storageBucketCount !== null || approxStorageBytes !== null;
  const hasRequestData = requestBreakdown !== null;

  let status: PlatformMonitoringStatus;
  if (hasStorageData && hasRequestData) {
    status = "ready";
  } else if (hasStorageData || hasRequestData) {
    status = "partial";
  } else if (setup.length > 0) {
    status = "setup_required";
  } else {
    status = "error";
  }

  const message = [storageMessage, requestMessage].filter(Boolean).join(" ");

  return {
    status,
    message,
    projectRef,
    storageObjectCount,
    storageBucketCount,
    approxStorageBytes,
    storageScanTruncated,
    requestBreakdown,
    updatedAt,
    setup,
  };
}

export async function getPlatformMonitoringSummary(): Promise<PlatformMonitoringSummary> {
  const [vercel, supabase] = await Promise.all([
    fetchVercelPlatformSummary(),
    fetchSupabasePlatformSummary(),
  ]);

  return {
    generatedAt: nowIso(),
    notes: [
      "Vercel 공식 billing API는 현재 팀/계정 범위 집계에 가깝고, 프로젝트 단위와 약간 차이가 날 수 있습니다.",
      "Supabase storage 크기는 storage.objects 메타데이터 합산 기준이며, 오브젝트가 매우 많으면 근사치로 표시됩니다.",
    ],
    vercel,
    supabase,
  };
}
