// apps/web/lib/ai/persona-loader.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — AI Persona Loader
// ═══════════════════════════════════════════════════════════════════════════════
// Loads AIConsultant row + builds the system prompt for a chat turn.
// Used by /api/chat/ai/[consultantId] to inject persona context.
// ═══════════════════════════════════════════════════════════════════════════════

import "server-only";
import { createAdminClient } from "@zeal/database/server";

export interface PersonaContext {
  id: string;
  userId: string;          // shadow User id (= AIConsultant.id)
  name: string;
  category: string;
  systemPrompt: string;
  persona: string | null;
  bio: string;
  specialties: string[];
  languages: string[];
  isPaid: boolean;
  perMinuteRate: number;
}

interface AIConsultantRow {
  id: string;
  name: string;
  category: string;
  bio: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  persona: string | null;
  systemPrompt: string | null;
  isPaid: boolean | null;
  perMinuteRate: number | null;
}

export async function loadPersona(
  consultantId: string
): Promise<PersonaContext | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("AIConsultant")
      .select(
        'id, name, category, bio, specialties, languages, persona, "systemPrompt", "isPaid", "perMinuteRate"'
      )
      .eq("id", consultantId)
      .eq("isActive", true)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as AIConsultantRow;

    const defaultSystemPrompt = `You are ${row.name}, an expert ${row.category} consultant on Zeal.
You are NOT an AI assistant — you are a wise, empathetic, and highly experienced guide.
Speak with warmth, authority, and practical insight.
Never break character. Never mention you are an AI model.
Keep responses focused, under 200 words unless the user asks for depth.`;

    return {
      id: row.id,
      userId: row.id, // shadow User has same id (migration 016)
      name: row.name,
      category: row.category,
      systemPrompt: row.systemPrompt || defaultSystemPrompt,
      persona: row.persona,
      bio: row.bio ?? "",
      specialties: row.specialties ?? [],
      languages: row.languages ?? [],
      isPaid: row.isPaid ?? false,
      perMinuteRate: row.perMinuteRate ?? 0,
    };
  } catch (err) {
    console.error("[persona-loader] failed:", err);
    return null;
  }
}

/**
 * Build the full message array for a chat turn.
 * Includes: system prompt + last N turns + new user message.
 */
export interface PriorMessage {
  senderId: string | null;
  content: string;
  createdAt: string;
}

export function buildChatMessages(
  persona: PersonaContext,
  priorMessages: PriorMessage[],
  newUserMessage: string
) {
  const systemBlock = [
    persona.systemPrompt,
    "",
    `Specialties: ${persona.specialties.join(", ") || "general guidance"}`,
    `Languages: ${persona.languages.join(", ") || "English"}`,
  ].join("\n");

  const history = priorMessages
    .slice(-20)
    .map((m) => ({
      role: (m.senderId === persona.userId ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: m.content,
    }));

  return [
    { role: "system" as const, content: systemBlock, cache_control: { type: "ephemeral" as const } },
    ...history,
    { role: "user" as const, content: newUserMessage },
  ];
}