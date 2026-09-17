// apps/web/app/api/ai/tarot/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { checkRateLimit, aiRateLimiter } from "@/lib/rate-limit";
import { withCache } from "@/lib/ai/response-cache";
import { runAI } from "@/lib/ai/router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();

  const identifier = user ? `tarot:${user.id}` : `tarot:ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
  const rl = await checkRateLimit(aiRateLimiter, identifier);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  let body: { cards?: string[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cards = body.cards;
  if (!cards || cards.length !== 3) {
    return NextResponse.json({ error: "Exactly 3 cards required" }, { status: 400 });
  }

  const { value, cached } = await withCache(
    { namespace: "tarot", ttl: 12 * 60 * 60 },
    { cards },
    async () => {
      const result = await runAI({
        task: "tarot",
        systemPrompt: "You are an expert Tarot reader skilled in Rider-Waite symbolism and psychological archetypes. Provide grounded, actionable interpretations.",
        userPrompt: `Provide a profound 3-card Tarot reading (Past, Present, Future):\n1. ${cards[0]}\n2. ${cards[1]}\n3. ${cards[2]}\n\nSynthesize the combined energetic narrative.`,
        temperature: 0.7,
        maxTokens: 800,
      });
      return { reading: result.content, model: result.model };
    }
  );

  return NextResponse.json({
    success: true,
    cards,
    reading: value.reading,
    cached,
  }, { headers: { ...rl.headers, "X-Cache": cached ? "HIT" : "MISS" } });
}