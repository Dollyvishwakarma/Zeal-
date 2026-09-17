import { generateFaultTolerantStream } from "@/lib/ai/router";
import { aiRateLimiter } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = await aiRateLimiter.limit(req.headers.get("x-forwarded-for") || "127.0.0.1");
    if (!success) return new Response("Rate limit exceeded.", { status: 429 });

    const { handSide, primaryFocus } = await req.json();

    const systemPrompt = `You are an expert Palmistry reader combining ancient chiromancy with modern psychological framing. Analyze the user's ${handSide || "Right"} hand palm scan with a focus on '${primaryFocus || "Life and Career"}'. Describe the main lines (Heart line, Head line, Life line, Fate line) with depth, nuance, and inspiring clarity.`;
    const userPrompt = "Provide my digital palm reading based on my hand analysis.";

    return await generateFaultTolerantStream(systemPrompt, userPrompt);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
