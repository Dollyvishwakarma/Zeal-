// apps/web/lib/chat/fetch-conversations.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Shared typed helper — single source of truth for inbox queries
// Used by: /api/chat/conversations (GET), /chat/layout (server fetch)
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClientFromCookies } from "@zeal/database/server";
import type { ConversationItem } from "@/hooks/useConversations";

// ─── Row types (explicit, since Supabase .from() is `any`) ───────────────────
interface MembershipRow {
  conversationId: string;
}

interface ConversationRow {
  id: string;
  lastMessageAt: string | null;
  lastMessageText: string | null;
}

interface ParticipantRow {
  conversationId: string;
  userId: string;
}

interface PartnerRow {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  is_online: boolean | null;
  role: string | null;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
export async function fetchUserConversations(
  userId: string
): Promise<ConversationItem[]> {
  const supabase = await createServerClientFromCookies();

  // 1. Memberships for this user
  const { data: membershipsRaw } = await supabase
    .from("ConversationParticipant")
    .select("conversationId")
    .eq("userId", userId);

  const memberships = (membershipsRaw ?? []) as MembershipRow[];
  const conversationIds = memberships.map((m) => m.conversationId);
  if (conversationIds.length === 0) return [];

  // 2. Conversation metadata (sorted by last message)
  const { data: conversationsRaw } = await supabase
    .from("Conversation")
    .select("id, lastMessageAt, lastMessageText")
    .in("id", conversationIds)
    .order("lastMessageAt", { ascending: false });

  const conversations = (conversationsRaw ?? []) as ConversationRow[];

  // 3. Partner IDs per conversation (everyone but me)
  const { data: partnersRaw } = await supabase
    .from("ConversationParticipant")
    .select("conversationId, userId")
    .in("conversationId", conversationIds)
    .neq("userId", userId);

  const partners = (partnersRaw ?? []) as ParticipantRow[];
  const partnerIdByConv = new Map<string, string>();
  for (const p of partners) {
    partnerIdByConv.set(p.conversationId, p.userId);
  }

  const partnerIds = Array.from(new Set(partnerIdByConv.values()));

  // 4. Partner user rows
  let users: PartnerRow[] = [];
  if (partnerIds.length > 0) {
    const { data: usersRaw } = await supabase
      .from("User")
      .select("id, name, username, avatar, is_online, role")
      .in("id", partnerIds);
    users = (usersRaw ?? []) as PartnerRow[];
  }

  const userById = new Map<string, PartnerRow>();
  for (const u of users) {
    userById.set(u.id, u);
  }

  // 5. Assemble typed ConversationItem[]
  return conversations.map((c): ConversationItem => {
    const partnerId = partnerIdByConv.get(c.id) ?? "";
    const partner = userById.get(partnerId);
    return {
      sessionId: c.id,
      partnerId,
      partnerName: partner?.name || partner?.username || "Zeal Member",
      partnerAvatar: partner?.avatar ?? null,
      isOnline: Boolean(partner?.is_online),
      isAI: partner?.role === "AI",
      lastMessage: c.lastMessageText ?? null,
      lastMessageTime: c.lastMessageAt ?? null,
      lastMessageSenderId: null,
    };
  });
}