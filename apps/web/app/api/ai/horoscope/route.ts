// apps/web/app/api/ai/horoscope/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { checkRateLimit, aiRateLimiter } from "@/lib/rate-limit";
import { withCache } from "@/lib/ai/response-cache";
import { runAI } from "@/lib/ai/router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export async function POST(req: Request) {
  // ─── 1. Auth ────────────────────────────────────────────────────────────
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();

  // ─── 2. Rate limit ──────────────────────────────────────────────────────
  const identifier = user ? `ai:${user.id}` : `ai:ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
  const rl = await checkRateLimit(aiRateLimiter, identifier);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429, headers: rl.headers }
    );
  }

  // ─── 3. Validate ────────────────────────────────────────────────────────
  let body: { sign?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sign = body.sign;
  if (!sign || !SIGNS.includes(sign)) {
    return NextResponse.json({ error: "Invalid zodiac sign" }, { status: 400 });
  }

  // ─── 4. Cache → AI → cache ──────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // cache per-day
  const { value, cached } = await withCache(
    { namespace: "horoscope", ttl: 6 * 60 * 60 },  // 6h
    { sign, date: today },
    async () => {
      const result = await runAI({
        task: "horoscope",
        systemPrompt: "You are an expert Vedic astrologer providing daily horoscopes. Be specific, practical, and grounded — no generic fortune-teller clichés.",
        userPrompt: `Provide a detailed daily astrological horoscope for ${sign} for today (${today}). Include career, relationships, and health insights. Keep it under 200 words.`,
        temperature: 0.7,
        maxTokens: 400,
      });
      return { reading: result.content, model: result.model };
    }
  );

  return NextResponse.json({
    success: true,
    sign,
    reading: value.reading,
    model: value.model,
    cached,
  }, { headers: { ...rl.headers, "X-Cache": cached ? "HIT" : "MISS" } });
}