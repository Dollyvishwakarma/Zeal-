import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler } from "@/lib/errors";
import { getAIResponse } from "@/lib/ai/ai-chat";
import { redis } from "@/lib/cache";

const CATEGORY_MAP: Record<string, string> = {
  relationship: "Relationship & Dating Coaching",
  career: "Life & Career Coaching",
  anxiety: "Mental Health & Therapy",
  depression: "Mental Health & Therapy",
  horoscope: "Astrology & Divination",
  tarot: "Tarot & Oracle",
  numerology: "Numerology",
  palmistry: "Palmistry",
  psychic: "Psychic Mediumship",
  dream: "Dream Analysis",
  angel: "Angel & Spirit Guides",
  aura: "Aura Reading & Cleansing",
  "past life": "Past Life & Soul Purpose",
  shadow: "Shadow Work & Ancestral Healing",
  therapy: "Mental Health & Therapy",
  coaching: "Life & Career Coaching",
  wellness: "Wellness & Holistic Health",
  reiki: "Energy Healing & Reiki",
  legal: "Professional & Expert Advice",
  finance: "Professional & Expert Advice",
  "feng shui": "Feng Shui & Vastu",
  pet: "Pet Psychic & Animal Communication",
  yoga: "Yoga & Movement Therapy",
  meditation: "Meditation & Mindfulness",
  hypnosis: "Hypnotherapy & Hypnosis",
  "sound healing": "Sound Healing & Vibrational Medicine",
  naturopathy: "Naturopathy",
  acupuncture: "Acupuncture & TCM",
  chiropractic: "Chiropractic & Physical Health",
  massage: "Massage Therapy",
  tantra: "Tantra & Sacred Sexuality",
  business: "Business & Entrepreneurship Coaching",
  nutrition: "Health & Nutrition Coaching",
  "functional medicine": "Functional Medicine",
  aromatherapy: "Aromatherapy & Herbal Therapy",
};

export const POST = withErrorHandler(async (req: Request) => {
  const { message, history } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Message is required and must be a string" },
      { status: 400 },
    );
  }

  const cacheKey = `zeal:chat:${message.toLowerCase().slice(0, 50).replace(/\s+/g, "_")}`;

  let cached: string | null = null;
  try {
    const raw = await redis.get(cacheKey);
    if (typeof raw === "string") {
      cached = raw;
    }
  } catch (_) {}

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return NextResponse.json(parsed);
    } catch (_) {}
  }

  const categoriesList = Object.keys(CATEGORY_MAP).join(", ");
  const systemPrompt = `You are Zeal, a warm, empathetic AI concierge for a wellness platform.
Your role is to help users find the right service category based on their needs.
Available categories: ${categoriesList}.
Respond with a JSON object containing "response" (a short, helpful message) and "category" (the best matching category name).
Keep your response under 50 words. Be warm, welcoming, and non-judgmental.
If the user's message doesn't clearly match a category, suggest "Wellness & Holistic Health" as default.`;

  let aiResponse: string;
  let category: string | null = null;

  try {
    const result = await getAIResponse(message, "", systemPrompt);
    aiResponse = result.content;

    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.response && typeof parsed.response === "string") {
        aiResponse = parsed.response;
        if (parsed.category && typeof parsed.category === "string") {
          category = parsed.category;
        }
      }
    } catch (_) {}

    if (!category) {
      const lower = message.toLowerCase();
      for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(key)) {
          category = value;
          break;
        }
      }
      if (!category) category = "Wellness & Holistic Health";
    }
  } catch (error) {
    aiResponse =
      "I'm here to help you find the right wellness service. Could you tell me a bit more about what you're looking for?";
    category = "Wellness & Holistic Health";
  }

  const result = {
    response: aiResponse,
    category,
  };

  try {
    await redis.setex(cacheKey, 3600, JSON.stringify(result));
  } catch (_) {}

  return NextResponse.json(result);
});

// ZEAL_HUB_COMPLETE_APPLIED
