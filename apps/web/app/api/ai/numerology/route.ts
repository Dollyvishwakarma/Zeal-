// apps/web/app/api/ai/numerology/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { checkRateLimit, aiRateLimiter } from "@/lib/rate-limit";
import { withCache } from "@/lib/ai/response-cache";
import { runAI } from "@/lib/ai/router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();

  const identifier = user ? `numerology:${user.id}` : `numerology:ip:${req.headers.get("x-forwarded-for") ?? "anon"}`;
  const rl = await checkRateLimit(aiRateLimiter, identifier);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  let body: { fullName?: string; dob?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fullName, dob } = body;
  if (!fullName || !dob) {
    return NextResponse.json({ error: "Name and DOB required" }, { status: 400 });
  }

  const { value, cached } = await withCache(
    { namespace: "numerology", ttl: 24 * 60 * 60 },
    { fullName, dob },
    async () => {
      const result = await runAI({
        task: "numerology",
        systemPrompt: "You are a master numerologist with deep knowledge of Pythagorean and Chaldean systems. Calculate accurately and interpret meaningfully.",
        userPrompt: `Calculate Life Path, Destiny, and Soul Urge numbers for:\nName: ${fullName}\nDOB: ${dob}\n\nProvide an extensive, grounded reading.`,
        temperature: 0.7,
        maxTokens: 1200,
      });
      return { analysis: result.content, model: result.model };
    }
  );

  return NextResponse.json({
    success: true,
    fullName,
    dob,
    analysis: value.analysis,
    cached,
  }, { headers: { ...rl.headers, "X-Cache": cached ? "HIT" : "MISS" } });
}