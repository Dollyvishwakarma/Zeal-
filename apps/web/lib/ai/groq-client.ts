// apps/web/lib/ai/groq-client.ts
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqOptions {
  messages: GroqMessage[];
  model?: "openai/gpt-oss-120b" | "llama-3.1-8b-instant" | "llama-3.3-70b-versatile";
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
}

export interface GroqResult {
  content: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  cached: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelay(attempt: number, baseMs = 500): number {
  const cap = Math.min(baseMs * Math.pow(2, attempt), 30_000);
  const jitter = cap * 0.3 * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(cap + jitter));
}

// ─── Extract content from Groq response (handles gpt-oss structure) ────────
function extractContent(data: any): string {
  const choice = data?.choices?.[0];
  if (!choice) return "";

  // Standard path
  let content = choice?.message?.content;

  // gpt-oss-120b: content might be in different fields
  if (!content || content.trim() === "") {
    content =
      choice?.message?.reasoning ||
      choice?.text ||
      choice?.delta?.content ||
      "";
  }

  // If content is an array (some models), join it
  if (Array.isArray(content)) {
    content = content
      .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
      .join("");
  }

  return typeof content === "string" ? content.trim() : "";
}

export async function callGroq(options: GroqOptions): Promise<GroqResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const models: Array<NonNullable<GroqOptions["model"]>> = options.model
    ? [options.model]
    : ["openai/gpt-oss-120b", "llama-3.1-8b-instant"];

  const maxRetries = options.maxRetries ?? 2;
  let lastError: Error | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const cleanMessages = options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: cleanMessages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1500,
          }),
        });

        if (res.status === 429) {
          const retryAfter = Number(res.headers.get("retry-after")) || 0;
          const delayMs = retryAfter > 0 ? retryAfter * 1000 : backoffDelay(attempt);
          console.warn(`[Groq] 429 on ${model} — waiting ${delayMs}ms`);
          if (attempt < maxRetries) { await sleep(delayMs); continue; }
          break;
        }

        if (res.status >= 500) {
          if (attempt < maxRetries) { await sleep(backoffDelay(attempt)); continue; }
          lastError = new Error(`Groq ${res.status}: ${res.statusText}`);
          break;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Groq ${res.status}: ${text.slice(0, 200)}`);
        }

        const data = await res.json();

        // Debug: log full response structure if content empty
        const content = extractContent(data);
        if (!content) {
          console.warn(`[Groq] Empty content from ${model}. Full response:`, JSON.stringify(data).slice(0, 500));
          if (attempt < maxRetries) { await sleep(backoffDelay(attempt)); continue; }
          lastError = new Error(`Groq ${model}: empty content`);
          break;
        }

        return {
          content,
          model,
          usage: data.usage,
          cached: false,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[Groq] ${model} error:`, lastError.message);
        if (attempt < maxRetries) { await sleep(backoffDelay(attempt)); continue; }
      }
    }
  }

  throw lastError ?? new Error("Groq: all attempts failed");
}

export async function streamGroq(options: GroqOptions): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const cleanMessages = options.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? "openai/gpt-oss-120b",
      messages: cleanMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1500,
      stream: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq stream ${res.status}: ${text.slice(0, 200)}`);
  }

  return res;
}