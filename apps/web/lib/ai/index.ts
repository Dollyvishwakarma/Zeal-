// apps/web/lib/ai/index.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Unified AI Module
// ═══════════════════════════════════════════════════════════════════════════════
// Single module replaces:
//   • lib/ai/groq-client.ts        (kept for backward compat)
//   • lib/ai/agnes-client.ts       (never created)
//   • lib/ai/router.ts             (kept for backward compat)
//
// Public API:
//   callAI(opts)      → Promise<Response>  (streaming or non-streaming)
//   callAIJson(opts)  → Promise<string>    (convenience: extract text)
//   withAICache(...)  → cached wrapper
//
// Fallback chain: Agnes → Groq Pro (70B) → Groq Fast (8B)
// Each provider is retried twice with exponential backoff + jitter.
// Honors Retry-After on 429.
// ═══════════════════════════════════════════════════════════════════════════════

import "server-only";
import crypto from "crypto";
import { redis } from "@/lib/cache";

// ─── Provider config ────────────────────────────────────────────────────────
const PROVIDERS = {
  agnes: {
    url: "https://apihub.agnes-ai.com/v1/chat/completions",
    key: () => process.env.AGNES_API_KEY,
    model: "agnes-2.5-flash",
  },
  groqPro: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
  },
  groqFast: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: () => process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** Prompt caching hint (Groq / OpenAI-compatible). */
  cache_control?: { type: "ephemeral" };
}

export interface CallAIOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  preferProvider?: ProviderName;
  maxRetriesPerProvider?: number;
}

// ─── Backoff helpers ────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt: number, base = 500): number {
  const cap = Math.min(base * Math.pow(2, attempt), 30_000);
  const jitter = cap * 0.3 * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(cap + jitter));
}

// ─── Single provider call ───────────────────────────────────────────────────
async function callProvider(
  name: ProviderName,
  opts: CallAIOptions
): Promise<Response> {
  const provider = PROVIDERS[name];
  const apiKey = provider.key();
  if (!apiKey) throw new Error(`[ai] ${name}: API key missing`);

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1500,
  };
  if (opts.stream) body.stream = true;

  return fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ─── Main call with fallback chain ──────────────────────────────────────────
const FALLBACK_CHAIN: ProviderName[] = ["agnes", "groqPro", "groqFast"];

export async function callAI(opts: CallAIOptions): Promise<Response> {
  const chain: ProviderName[] = opts.preferProvider
    ? [opts.preferProvider, ...FALLBACK_CHAIN.filter((p) => p !== opts.preferProvider)]
    : FALLBACK_CHAIN;

  const maxRetries = opts.maxRetriesPerProvider ?? 2;
  let lastErr: Error | null = null;

  for (const provider of chain) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await callProvider(provider, opts);
        if (res.ok) return res;

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after")) || 0;
          const delay = retryAfter > 0 ? retryAfter * 1000 : backoffDelay(attempt);
          console.warn(`[ai] ${provider} 429 — waiting ${delay}ms`);
          if (attempt < maxRetries) { await sleep(delay); continue; }
          break; // move to next provider
        }

        if (res.status >= 500) {
          if (attempt < maxRetries) { await sleep(backoffDelay(attempt)); continue; }
          lastErr = new Error(`${provider} ${res.status}: ${res.statusText}`);
          break;
        }

        // 4xx (except 429) — not retryable, but try next provider anyway
        const text = await res.text().catch(() => "");
        lastErr = new Error(`${provider} ${res.status}: ${text.slice(0, 200)}`);
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) { await sleep(backoffDelay(attempt)); continue; }
      }
    }
  }

  throw lastErr ?? new Error("[ai] all providers failed");
}

// ─── Convenience: extract text from non-streaming response ──────────────────
export async function callAIJson(opts: CallAIOptions): Promise<string> {
  const res = await callAI({ ...opts, stream: false });
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("[ai] empty response");
  return content as string;
}

// ─── Response cache (SHA-256 keyed) ─────────────────────────────────────────
export async function withAICache<T>(
  namespace: string,
  payload: unknown,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<{ value: T; cached: boolean }> {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 32);
  const key = `zeal:ai:${namespace}:${hash}`;

  try {
    const hit = await redis.get<string>(key);
    if (hit) {
      return { value: JSON.parse(hit) as T, cached: true };
    }
  } catch (err) {
    console.warn("[ai-cache] read failed:", err);
  }

  const value = await producer();
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (err) {
    console.warn("[ai-cache] write failed:", err);
  }
  return { value, cached: false };
}