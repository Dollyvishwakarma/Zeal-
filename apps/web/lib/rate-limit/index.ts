// apps/web/lib/rate-limit/index.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Rate Limiting (Upstash Redis)
// ─────────────────────────────────────────────────────────────────────────────
// Design decisions from research:
//   • Rate-limit by user ID (not IP) for authenticated routes [reference:8]
//   • Use sliding window for fairness [reference:9]
//   • Tiered limits by plan: anonymous < user < premium [reference:10]
//   • Graceful bypass when Redis unavailable (dev/preview) [reference:11]
// ═══════════════════════════════════════════════════════════════════════════════

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─── Redis client (graceful fallback) ────────────────────────────────────────
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  console.warn("[rate-limit] Redis env invalid — rate limiting disabled");
}

// ─── No-op fallback when Redis is absent ─────────────────────────────────────
const noopResult = {
  success: true,
  limit: 0,
  remaining: 0,
  reset: Date.now(),
  pending: Promise.resolve(),
} as const;

type LimiterResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

function createLimiter(
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
  prefix: string
) {
  if (!redis) {
    return { limit: async (): Promise<LimiterResult> => noopResult };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: `@zeal/${prefix}`,
  });
}

// ─── Pre-configured limiters (tiered by use case) ────────────────────────────

/** General API: 60 requests / minute */
export const generalLimiter = createLimiter(60, "1 m", "general");

/** Auth endpoints: 5 requests / minute (brute-force protection) */
export const authLimiter = createLimiter(5, "1 m", "auth");

/** AI endpoints: 10 requests / minute per user */
export const aiRateLimiter = createLimiter(10, "1 m", "ai");

/** Expensive AI (Kundali, Matchmaking): 3 requests / minute per user */
export const aiStrictLimiter = createLimiter(3, "1 m", "ai-strict");

/** Token budget: 20,000 tokens / hour per user (cost control) */
export const aiTokenBudget = createLimiter(20_000, "1 h", "ai-budget");

// ─── Helper: enforce rate limit in API routes ────────────────────────────────
export interface RateLimitCheck {
  ok: boolean;
  headers?: Record<string, string>;
  retryAfter?: number;
}

export async function checkRateLimit(
  limiter: { limit: (id: string) => Promise<LimiterResult> },
  identifier: string
): Promise<RateLimitCheck> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    const headers = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(reset),
    };
    if (!success) {
      return {
        ok: false,
        headers: {
          ...headers,
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      };
    }
    return { ok: true, headers };
  } catch (err) {
    console.warn("[rate-limit] check failed:", err);
    return { ok: true };  // fail-open
  }
}

// ─── Legacy compatibility (used by existing code) ────────────────────────────
export const enforceRateLimit = async (identifier?: unknown) => {
  const id = typeof identifier === "string" ? identifier : "anonymous";
  return generalLimiter.limit(id);
};