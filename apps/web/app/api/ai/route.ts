// apps/web/app/api/ai/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Unified AI Endpoint
// ═══════════════════════════════════════════════════════════════════════════════
// One route handles every AI task via ?task=<name>.
// Replaces: /api/ai/search, /api/ai/horoscope, /api/ai/tarot, /api/ai/numerology
// Uses: lib/ai (callAI, callAIJson, withAICache) + lib/rate-limit (tiered)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createServerClientFromCookies, createAdminClient } from "@zeal/database/server";
import { checkRateLimit, aiRateLimiter, aiStrictLimiter } from "@/lib/rate-limit";
import { callAIJson, withAICache } from "@/lib/ai";
import { CATEGORY_ID_TO_NAME } from "@/lib/services/slug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Task type ──────────────────────────────────────────────────────────────
type TaskName = "search" | "horoscope" | "tarot" | "numerology" | "chat" | "assist";

const STRICT_TASKS: TaskName[] = ["search"];

interface TaskCtx {
  body: any;
  userId: string | null;
  supabase: any;
}

// ─── Handlers ───────────────────────────────────────────────────────────────
const HANDLERS: Record<TaskName, (ctx: TaskCtx) => Promise<any>> = {
  // ─── SEARCH: classify query → category + top consultants ──────────────────
  search: async ({ body }) => {
    const query = String(body?.query ?? "").trim();
    if (query.length < 3) throw new Error("Query too short");

    const categoryIds = Object.keys(CATEGORY_ID_TO_NAME);
    const catList = categoryIds.map((id) => `${id} (${CATEGORY_ID_TO_NAME[id]})`).join("\n");

    const { value, cached } = await withAICache(
      "search",
      { q: query.toLowerCase(), version: 2 },
      6 * 60 * 60,
      async () => {
        const raw = await callAIJson({
          messages: [
            {
              role: "system",
              content: `You are a wellness query classifier. Given a user query, pick ONE category ID from this list:\n${catList}\n\nReturn ONLY JSON: {"categoryId":"<id>","confidence":0.0-1.0,"mood":"<short>"}. No markdown, no explanation.`,
            },
            { role: "user", content: query },
          ],
          temperature: 0.2,
          maxTokens: 150,
          preferProvider: "groqFast",
        });

        let parsed: { categoryId?: string; confidence?: number; mood?: string };
        try {
          parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
          parsed = { categoryId: "wellness", confidence: 0.3 };
        }

        const categoryId =
          parsed.categoryId && categoryIds.includes(parsed.categoryId)
            ? parsed.categoryId
            : "wellness";

        // Query matching consultants
        const admin = createAdminClient();
        const prismaCategory = categoryId
          .toUpperCase()
          .replace(/-/g, "_");

        const { data: consultants } = await admin
          .from("Consultant")
          .select(`
            id, category, specialties, "perMinuteRate", rating, "sparkScore",
            "isActive", subdomain,
            user:User!Consultant_userId_fkey(id, name, username, avatar, is_online)
          `)
          .eq("category", prismaCategory)
          .eq("status", "VERIFIED")
          .eq("isActive", true)
          .order("sparkScore", { ascending: false })
          .limit(5);

        return {
          intent: {
            categoryId,
            categoryName: CATEGORY_ID_TO_NAME[categoryId] ?? categoryId,
            confidence: parsed.confidence ?? 0.5,
            mood: parsed.mood ?? null,
          },
          consultants: consultants ?? [],
          totalMatches: consultants?.length ?? 0,
        };
      }
    );

    return { ...value, cached };
  },

  // ─── HOROSCOPE ────────────────────────────────────────────────────────────
  horoscope: async ({ body }) => {
    const sign = String(body?.sign ?? "").trim();
    if (!sign) throw new Error("Sign required");
    const today = new Date().toISOString().slice(0, 10);

    const { value, cached } = await withAICache(
      "horoscope",
      { sign, date: today },
      6 * 60 * 60,
      async () => {
        const reading = await callAIJson({
          messages: [
            {
              role: "system",
              content: "You are an expert Vedic astrologer. Provide specific, practical daily horoscopes. Avoid generic fortune-teller clichés.",
              cache_control: { type: "ephemeral" },
            },
            { role: "user", content: `Daily horoscope for ${sign} on ${today}. Career, relationships, health. Under 180 words.` },
          ],
          temperature: 0.7,
          maxTokens: 400,
        });
        return { reading };
      }
    );
    return { sign, ...value, cached };
  },

  // ─── TAROT ────────────────────────────────────────────────────────────────
  tarot: async ({ body }) => {
    const cards: string[] = Array.isArray(body?.cards) ? body.cards : [];
    if (cards.length !== 3) throw new Error("Exactly 3 cards required");

    const { value, cached } = await withAICache(
      "tarot",
      { cards },
      12 * 60 * 60,
      async () => {
        const reading = await callAIJson({
          messages: [
            {
              role: "system",
              content: "You are an expert Tarot reader using Rider-Waite symbolism. Provide grounded, actionable interpretations.",
              cache_control: { type: "ephemeral" },
            },
            { role: "user", content: `3-card spread (Past, Present, Future):\n1. ${cards[0]}\n2. ${cards[1]}\n3. ${cards[2]}\n\nSynthesize the combined narrative.` },
          ],
          temperature: 0.7,
          maxTokens: 700,
        });
        return { reading };
      }
    );
    return { cards, ...value, cached };
  },

  // ─── NUMEROLOGY ───────────────────────────────────────────────────────────
  numerology: async ({ body }) => {
    const fullName = String(body?.fullName ?? "").trim();
    const dob = String(body?.dob ?? "").trim();
    if (!fullName || !dob) throw new Error("Name and DOB required");

    const { value, cached } = await withAICache(
      "numerology",
      { fullName, dob },
      24 * 60 * 60,
      async () => {
        const analysis = await callAIJson({
          messages: [
            {
              role: "system",
              content: "You are a master numerologist. Calculate Life Path, Destiny, Soul Urge accurately. Provide grounded readings.",
              cache_control: { type: "ephemeral" },
            },
            { role: "user", content: `Full numerology profile for ${fullName}, born ${dob}.` },
          ],
          temperature: 0.6,
          maxTokens: 800,
        });
        return { analysis };
      }
    );
    return { fullName, dob, ...value, cached };
  },

  // ─── CHAT (non-streaming fallback) ────────────────────────────────────────
  chat: async ({ body }) => {
    const prompt = String(body?.prompt ?? "").trim();
    if (!prompt) throw new Error("Prompt required");

    const reply = await callAIJson({
      messages: [
        { role: "system", content: body?.system ?? "You are Zeal, an empathetic wellness concierge." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 800,
    });
    return { reply };
  },

  // ─── ASSIST (consultant reply suggestions) ────────────────────────────────
  assist: async ({ body }) => {
    const query = String(body?.query ?? "").trim();
    if (!query) throw new Error("Query required");

    const raw = await callAIJson({
      messages: [
        {
          role: "system",
          content: "You are an AI assistant for wellness consultants. Provide 3 short empathetic reply suggestions. Return only the suggestions, one per line, numbered 1-3.",
        },
        { role: "user", content: query },
      ],
      temperature: 0.6,
      maxTokens: 300,
      preferProvider: "groqFast",
    });

    const suggestions = raw
      .split("\n")
      .map((l) => l.replace(/^\d+[.):]\s*/, "").trim())
      .filter((l) => l.length > 0)
      .slice(0, 3);

    return {
      suggestions:
        suggestions.length > 0
          ? suggestions
          : ["Let me think about that.", "Tell me more.", "Here's my perspective."],
    };
  },
};

// ─── Route handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const task = (url.searchParams.get("task") ?? "chat") as TaskName;

    if (!HANDLERS[task]) {
      return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }

    // 1. Auth
    const supabase = await createServerClientFromCookies();
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Rate limit (tiered)
    const limiter = STRICT_TASKS.includes(task) ? aiStrictLimiter : aiRateLimiter;
    const identifier = user
      ? `ai:${task}:${user.id}`
      : `ai:${task}:ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
    const rl = await checkRateLimit(limiter, identifier);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait." },
        { status: 429, headers: rl.headers }
      );
    }

    // 3. Parse body
    let body: any;
    try { body = await req.json(); } catch { body = {}; }

    // 4. Execute handler
    const result = await HANDLERS[task]({ body, userId: user?.id ?? null, supabase });

    return NextResponse.json(
      { success: true, task, ...result },
      { headers: rl.headers }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    console.error(`[ai/${new URL(req.url).searchParams.get("task")}]`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}