// apps/web/app/api/chat/[id]/messages/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Chat messages API — GET (fetch) + POST (send)
// Uses unified Message table with RLS (participants only)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "50"), 1),
    200
  );

  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify participant (RLS enforces too, but explicit check gives cleaner 404)
  const { data: participant } = await supabase
    .from("ConversationParticipant")
    .select("userId")
    .eq("conversationId", conversationId)
    .eq("userId", user.id)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const { data: messages, error } = await supabase
    .from("Message")
    .select("id, conversationId, senderId, content, type, createdAt, editedAt, deletedAt")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return in chronological order
  const ordered = (messages ?? []).slice().reverse();
  return NextResponse.json({ messages: ordered });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;

  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = (body.content || "").trim();
  if (!content) {
    return NextResponse.json({ error: "Empty content" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("Message")
    .insert({
      conversationId,
      senderId: user.id,
      content,
      type: "text",
    })
    .select("id, conversationId, senderId, content, type, createdAt")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message });
}