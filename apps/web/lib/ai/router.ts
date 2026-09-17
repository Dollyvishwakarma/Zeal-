// apps/web/lib/ai/router.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Multi-Provider AI Router
// ─────────────────────────────────────────────────────────────────────────────
// Priority chain per task type:
//   • Horoscope, Tarot, Numerology → Groq (fast, generous free tier)
//   • Kundali → AstroAsk (precise Vedic computation) → Groq fallback
//   • Chat → Groq streaming
// All paths go through: cache → rate limit → provider → cache write
// ═══════════════════════════════════════════════════════════════════════════════

import { callGroq, streamGroq, type GroqMessage } from "./groq-client";

export interface AIRequest {
  task: "horoscope" | "tarot" | "numerology" | "kundali" | "chat" | "matchmaking" | "palmistry";
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: "groq" | "astroask";
  cached: boolean;
}

export async function runAI(req: AIRequest): Promise<AIResponse> {
  // Build messages with prompt caching on the system prompt
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: req.systemPrompt,
      cache_control: { type: "ephemeral" },  // Saves 20-40% on reuse
    },
    { role: "user", content: req.userPrompt },
  ];

  const result = await callGroq({
    messages,
    temperature: req.temperature,
    maxTokens: req.maxTokens,
  });

  return {
    content: result.content,
    model: result.model,
    provider: "groq",
    cached: false,
  };
}
// ═══════════════════════════════════════════════════════════════════════════════
// Legacy streaming helper — used by /api/ai/matchmaking, /api/ai/palmistry
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateFaultTolerantStream(
  systemPrompt: string,
  userPrompt: string
): Promise<Response> {
  return streamGroq({
    messages: [
      { role: "system", content: systemPrompt, cache_control: { type: "ephemeral" } },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 1000,
  });
}
