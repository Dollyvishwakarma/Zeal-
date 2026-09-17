// apps/web/lib/ai/astroask-client.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — AstroAsk Vedic Astrology Client
// ─────────────────────────────────────────────────────────────────────────────
// AstroAsk: complete Kundali in ONE call, 75ms latency, 500 req/month free.[reference:17]
// Fallback chain: AstroAsk → Groq-generated interpretation (when quota exhausted)
// ═══════════════════════════════════════════════════════════════════════════════

const ASTROASK_URL = "https://astroask-vedic-western-astrology-api.p.rapidapi.com/api/v1";
const ASTROASK_HOST = "astroask-vedic-western-astrology-api.p.rapidapi.com";

export interface KundaliInput {
  date: string;    // ISO 8601: "2002-11-11T00:00:00"
  lat: number;
  lng: number;
  lang?: "en" | "hi" | "ta" | "te" | "bn" | "mr" | "gu" | "kn" | "ml" | "pa";
}

export interface KundaliResult {
  source: "astroask" | "fallback";
  chart: unknown;
  svg?: string;
}

export async function fetchKundali(input: KundaliInput): Promise<KundaliResult> {
  const apiKey = process.env.ASTROASK_API_KEY;
  if (!apiKey) {
    return { source: "fallback", chart: null };
  }

  try {
    const res = await fetch(`${ASTROASK_URL}/kundali`, {
      method: "POST",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": ASTROASK_HOST,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: input.date,
        lat: input.lat,
        lng: input.lng,
        lang: input.lang ?? "en",
      }),
    });

    if (!res.ok) {
      console.warn(`[AstroAsk] HTTP ${res.status} — falling back`);
      return { source: "fallback", chart: null };
    }

    const data = await res.json();
    return {
      source: "astroask",
      chart: data,
      svg: data?.svg ?? data?.chart_svg ?? undefined,
    };
  } catch (err) {
    console.warn("[AstroAsk] fetch failed:", err);
    return { source: "fallback", chart: null };
  }
}