import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { getAIResponse } from "@/lib/ai/ai-chat";
import { z } from "zod";

const AssistSchema = z.object({
  query: z.string().min(1).max(500),
  astrologerId: z.string().optional(),
});

const FALLBACK = [
  "Thank you for reaching out. Let me look into this for you.",
  "That is a thoughtful question. Here is what I sense.",
  "I understand your concern. Let me offer some guidance.",
];

export const POST = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const body = await req.json();
  const { query } = AssistSchema.parse(body);

  const prompt = "A wellness consultant received this client query: \"" + query + "\". Provide 3 short, empathetic reply suggestions. Return ONLY the suggestions, one per line, prefixed with a number.";

  const systemPrompt = "You are an AI assistant helping wellness consultants respond to their clients. Provide warm, professional, and helpful reply suggestions.";

  try {
    const result = await getAIResponse(prompt, "", systemPrompt);
    const suggestions = result.content
      .split("\n")
      .map((l) => l.replace(/^\d+[.):]\s*/, "").trim())
      .filter((l) => l.length > 0)
      .slice(0, 3);

    if (suggestions.length === 0) {
      return NextResponse.json({ suggestions: FALLBACK });
    }
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.warn("[AI Assist] Falling back to defaults:", err);
    return NextResponse.json({ suggestions: FALLBACK });
  }
});

