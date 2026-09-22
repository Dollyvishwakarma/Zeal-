// apps/web/lib/ai/groq-client.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Resilient Groq Client
// ─────────────────────────────────────────────────────────────────────────────
// Features (from research):
//   • Exponential backoff with jitter on 429/5xx [reference:13]
//   • Model fallback: 70B → 8B-instant when rate limited [reference:15]
//   • Retry-After header honored [reference:16]
// ═══════════════════════════════════════════════════════════════════════════════

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  messages: GroqMessage[];
  model?: "llama-3.3-70b-versatile" | "llama-3.1-8b-instant";
  temperature?: number;
  maxTokens?: number;
  /** Retry budget for 429 responses */
  maxRetries?: number;
}

export interface GroqResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  cached: boolean;
}

// ─── Sleep helper ────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Exponential backoff with decorrelated jitter ────────────────────────────
function backoffDelay(attempt: number, baseMs = 500): number {
  const cap = Math.min(baseMs * Math.pow(2, attempt), 30_000);
  const jitter = cap * 0.3 * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(cap + jitter));
}

// ─── Main call ───────────────────────────────────────────────────────────────
export async function callGroq(options: GroqOptions): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const models: Array<NonNullable<GroqOptions["model"]>> = options.model
    ? [options.model]
    : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

  const maxRetries = options.maxRetries ?? 2;
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1000,
          }),
        });

        // ─── 429: honor Retry-After, then backoff ─────────────────────────
        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after")) || 0;
          const delayMs = retryAfter > 0 ? retryAfter * 1000 : backoffDelay(attempt);
          console.warn(`[Groq] 429 on ${model} — waiting ${delayMs}ms`);
          if (attempt < maxRetries) {
            await sleep(delayMs);
            continue;
          }
          // Move to next model
          break;
        }

        // ─── 5xx: retry with backoff ──────────────────────────────────────
        if (res.status >= 500) {
          if (attempt < maxRetries) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          lastError = new Error(`Groq ${res.status}: ${res.statusText}`);
          break;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Groq: empty response");

        return {
          content,
          model,
          usage: data.usage,
          cached: false,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }
      }
    }
  }

  throw lastError ?? new Error("Groq: all attempts failed");
}

// ─── Streaming variant (for chat use cases) ──────────────────────────────────
export async function streamGroq(options: GroqOptions): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "llama-3.3-70b-versatile",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq stream ${res.status}: ${text.slice(0, 200)}`);
  }

  return res;
}