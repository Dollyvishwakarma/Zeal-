import { z } from "zod";

const AI_RESPONSE_SCHEMA = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

type AIResponse = z.infer<typeof AI_RESPONSE_SCHEMA>;

export async function getAIResponse(
  prompt: string,
  context?: string,
  systemPrompt?: string,
): Promise<AIResponse> {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.warn("GROQ_API_KEY not set, using fallback responses.");
      return getFallbackResponse(prompt);
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt || "You are a helpful assistant for wellness and astrology." },
          { role: "user", content: context ? `${context}\n\n${prompt}` : prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.warn(`Groq API error: ${response.status} ${response.statusText}`);
      return getFallbackResponse(prompt);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";

    return AI_RESPONSE_SCHEMA.parse({
      content,
      confidence: 0.85,
    });
  } catch (error) {
    console.error("AI request failed:", error);
    return getFallbackResponse(prompt);
  }
}

function getFallbackResponse(prompt: string): AIResponse {
  const fallbacks: string[] = [
    "Thank you for your question. I'm here to help guide you on your journey.",
    "That's a thoughtful question. Let me reflect on that for you.",
    "I appreciate your openness. Here's what I sense about your situation.",
    "I can feel the depth of your inquiry. Let me offer some perspective.",
  ];
  const content = fallbacks[Math.floor(Math.random() * fallbacks.length)] ?? "I'm here to help. Please try again.";
  return { content, confidence: 0.6 };
}

export async function getTarotReading(question?: string): Promise<string> {
  const prompt = question ? `Provide a tarot reading for this question: ${question}` : "Provide a general 3-card tarot reading.";
  const response = await getAIResponse(prompt, "", "You are an expert tarot reader.");
  return response.content;
}
