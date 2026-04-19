type RateLimitOptions = {
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitAllowed = {
  ok: true;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RateLimitBlocked = {
  ok: false;
  limit: number;
  remaining: 0;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();
let cleanupCounter = 0;

function cleanupExpiredBuckets(now: number) {
  cleanupCounter += 1;
  if (cleanupCounter % 50 !== 0) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function checkRateLimit(options: RateLimitOptions): RateLimitAllowed | RateLimitBlocked {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const current = buckets.get(options.key);
  if (!current || current.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      ok: true,
      limit: options.max,
      remaining: Math.max(0, options.max - 1),
      resetAt: now + options.windowMs,
    };
  }

  if (current.count >= options.max) {
    return {
      ok: false,
      limit: options.max,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(options.key, current);

  return {
    ok: true,
    limit: options.max,
    remaining: Math.max(0, options.max - current.count),
    resetAt: current.resetAt,
  };
}
