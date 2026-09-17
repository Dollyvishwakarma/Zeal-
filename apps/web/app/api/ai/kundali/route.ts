// apps/web/app/api/ai/kundali/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { checkRateLimit, aiStrictLimiter } from "@/lib/rate-limit";
import { withCache } from "@/lib/ai/response-cache";
import { fetchKundali } from "@/lib/ai/astroask-client";
import { runAI } from "@/lib/ai/router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1. Auth
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Strict rate limit (expensive operation)
  const identifier = user ? `kundali:${user.id}` : `kundali:ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
  const rl = await checkRateLimit(aiStrictLimiter, identifier);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded — 3 kundali/minute" },
      { status: 429, headers: rl.headers }
    );
  }

  // 3. Validate
  let body: { name?: string; dob?: string; tob?: string; pob?: string; lat?: number; lng?: number; lang?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, dob, tob, pob, lat, lng } = body;
  if (!name || !dob || !tob || !pob) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 4. Cache by birth details (charts are static per person)
  const { value, cached } = await withCache(
    { namespace: "kundali", ttl: 24 * 60 * 60 },  // 24h
    { name, dob, tob, pob },
    async () => {
      // Try AstroAsk first (precise Vedic computation)
      const astroResult = await fetchKundali({
        date: `${dob}T${tob}:00`,
        lat: lat ?? 28.6139,
        lng: lng ?? 77.2090,
        lang: "en",
      });

      if (astroResult.source === "astroask" && astroResult.chart) {
        return {
          source: "astroask" as const,
          chart: astroResult.chart,
          svg: astroResult.svg,
          analysis: null,
        };
      }

      // Fallback: Groq-generated analysis
      const fallback = await runAI({
        task: "kundali",
        systemPrompt: "You are an expert Vedic astrologer (Jyotishi) with mastery over Janam Kundali, planetary houses, nakshatras, and Vimshottari Dashas.",
        userPrompt: `Generate a detailed Vedic Janam Kundali analysis for:\nName: ${name}\nDate: ${dob}\nTime: ${tob}\nPlace: ${pob}\n\nInclude Lagna, planetary strengths, house placements, and current Dasha overview.`,
        temperature: 0.7,
        maxTokens: 1500,
      });
      return {
        source: "fallback" as const,
        chart: null,
        svg: null,
        analysis: fallback.content,
      };
    }
  );

  return NextResponse.json({
    success: true,
    ...value,
    cached,
  }, { headers: { ...rl.headers, "X-Cache": cached ? "HIT" : "MISS" } });
}