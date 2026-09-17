// apps/web/app/api/chat/ai/[consultantId]/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Streaming AI chat — reads persona from AIConsultant, persists both turns,
// streams via Agnes → Groq Pro → Groq Fast (Phase 1 callAI).
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { checkRateLimit, aiRateLimiter } from "@/lib/rate-limit";
import { loadPersona, buildChatMessages, type PriorMessage } from "@/lib/ai/persona-loader";
import { callAI } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ consultantId: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  const { consultantId } = await params;

  // 1. Auth
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const rl = await checkRateLimit(aiRateLimiter, `aichat:${user.id}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait." },
      { status: 429, headers: rl.headers }
    );
  }

  // 3. Load persona
  const persona = await loadPersona(consultantId);
  if (!persona) {
    return NextResponse.json({ error: "AI consultant not found" }, { status: 404 });
  }

  // 4. Parse + validate
  let body: { conversationId?: string; content?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const conversationId = body.conversationId;
  const content = (body.content ?? "").trim();

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and content required" },
      { status: 400 }
    );
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  // 5. Verify participant
  const { data: participant } = await supabase
    .from("ConversationParticipant")
    .select("userId")
    .eq("conversationId", conversationId)
    .eq("userId", user.id)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // 6. Persist user message (broadcast trigger fires → inbox updates)
  await supabase.from("Message").insert({
    conversationId,
    senderId: user.id,
    content,
    type: "text",
  });

  // 7. Load history (last 20 turns)
  const { data: historyRaw } = await supabase
    .from("Message")
    .select("senderId, content, createdAt")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: false })
    .limit(20);

  const history = ((historyRaw ?? []) as PriorMessage[]).slice().reverse();

  // 8. Build message chain with persona
  const messages = buildChatMessages(persona, history, content);

  // 9. Stream from AI
  let upstream: Response;
  try {
    upstream = await callAI({ messages, stream: true, maxTokens: 1500 });
  } catch (err) {
    console.error("[ai-chat] callAI failed:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
  }

  if (!upstream.body) {
    return NextResponse.json({ error: "No stream" }, { status: 502 });
  }

  // 10. Tee: forward to client, collect for persistence in background
  const [toClient, toPersist] = upstream.body.tee();

  (async () => {
    try {
      const reader = toPersist.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullText += delta;
          } catch { /* skip malformed */ }
        }
      }

      if (fullText) {
        await supabase.from("Message").insert({
          conversationId,
          senderId: persona.userId,
          content: fullText,
          type: "text",
        });
      }
    } catch (err) {
      console.error("[ai-chat] persist failed:", err);
    }
  })();

  return new Response(toClient, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...rl.headers,
    },
  });
}