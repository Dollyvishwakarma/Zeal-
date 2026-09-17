import { generateFaultTolerantStream } from "@/lib/ai/router";
import { aiRateLimiter } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = await aiRateLimiter.limit(req.headers.get("x-forwarded-for") || "127.0.0.1");
    if (!success) return new Response("Rate limit exceeded.", { status: 429 });

    const { name1, dob1, name2, dob2 } = await req.json();

    const systemPrompt = `You are an expert in Synastry and Vedic Guna Milan compatibility. Analyze the bond between ${name1} (DOB: ${dob1}) and ${name2} (DOB: ${dob2}). Give an honest, constructive, and insightful compatibility score out of 36 Gunas conceptually, followed by emotional, communication, and long-term outlooks.`;
    const userPrompt = "Perform a complete compatibility and relationship synthesis analysis.";

    return await generateFaultTolerantStream(systemPrompt, userPrompt);
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
