// apps/web/lib/ai/response-cache.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — AI Response Cache
// ─────────────────────────────────────────────────────────────────────────────
// Response caching is the only optimization that eliminates the upstream
// API call entirely — and therefore the only one that helps with rate limits.[reference:12]
//
// Cache key = SHA-256(namespace + JSON.stringify(params))
// TTL = 6h for horoscopes (daily), 24h for kundali (birth-chart static)
// ═══════════════════════════════════════════════════════════════════════════════

import crypto from "crypto";
import { redis } from "@/lib/cache";

export interface CacheOptions {
  /** Redis namespace e.g. "horoscope", "kundali", "tarot" */
  namespace: string;
  /** TTL in seconds */
  ttl: number;
}

function cacheKey(namespace: string, payload: unknown): string {
  const raw = JSON.stringify(payload);
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return `zeal:ai:${namespace}:${hash}`;
}

export async function getCached<T>(namespace: string, payload: unknown): Promise<T | null> {
  try {
    const raw = await redis.get<string>(cacheKey(namespace, payload));
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T);
  } catch (err) {
    console.warn("[ai-cache] read failed:", err);
    return null;
  }
}

export async function setCached<T>(
  namespace: string,
  payload: unknown,
  value: T,
  ttl: number
): Promise<void> {
  try {
    await redis.set(cacheKey(namespace, payload), JSON.stringify(value), { ex: ttl });
  } catch (err) {
    console.warn("[ai-cache] write failed:", err);
  }
}

/** Convenience: wrap any async producer with cache */
export async function withCache<T>(
  opts: CacheOptions,
  payload: unknown,
  producer: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
  const hit = await getCached<T>(opts.namespace, payload);
  if (hit !== null) return { value: hit, cached: true };

  const value = await producer();
  await setCached(opts.namespace, payload, value, opts.ttl);
  return { value, cached: false };
}