import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client with a type-safe no-op fallback.
 *
 * During Vercel builds or when env vars are missing, returns a stub that
 * matches the real Redis interface exactly. All methods return proper types
 * so downstream TypeScript doesn't complain.
 */

// ─── Public interface (subset of Redis we use) ───────────────────────────────
export interface CacheClient {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<"OK" | null>;
  setex(key: string, ttl: number, value: unknown): Promise<"OK" | null>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget<T = string>(...keys: string[]): Promise<(T | null)[]>;
  hget<T = string>(key: string, field: string): Promise<T | null>;
  hset(key: string, field: string, value: unknown): Promise<number>;
  hgetall<T = Record<string, string>>(key: string): Promise<T | null>;
  publish(channel: string, message: string): Promise<number>;
}

// ─── No-op stub for when Redis is unavailable ────────────────────────────────
const noopStub: CacheClient = {
  get: async () => null,
  set: async () => null,
  setex: async () => null,
  del: async () => 0,
  incr: async () => 0,
  decr: async () => 0,
  expire: async () => 0,
  ttl: async () => -1,
  exists: async () => 0,
  keys: async () => [],
  mget: async () => [],
  hget: async () => null,
  hset: async () => 0,
  hgetall: async () => null,
  publish: async () => 0,
};

// ─── Real Redis instance ─────────────────────────────────────────────────────
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let realClient: Redis | null = null;

if (url && token) {
  try {
    realClient = new Redis({ url, token });
  } catch {
    realClient = null;
  }
}

// ─── Export unified cache (real or stub) ─────────────────────────────────────
export const redis: CacheClient = (realClient as unknown as CacheClient) || noopStub;

export const isRedisConfigured = !!realClient;
