"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type ConversationItem = {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  isOnline: boolean;
  isAI: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSenderId: string | null;
  status: string;
};

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

export async function getUserConversations(): Promise<{
  success: boolean;
  conversations: ConversationItem[];
  currentUserId: string | null;
  error?: string;
}> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, conversations: [], currentUserId: null, error: "Unauthorized" };
    }

    // 1. Fetch all session requests where user is seeker or consultant
    const { data: sessions, error: sessionsError } = await supabase
      .from("session_requests")
      .select(`
        id,
        status,
        seeker_id,
        consultant_id,
        created_at,
        seeker:profiles!session_requests_seeker_id_fkey(id, full_name, avatar_url, is_online, is_ai),
        consultant:profiles!session_requests_consultant_id_fkey(id, full_name, avatar_url, is_online, is_ai)
      `)
      .or(`seeker_id.eq.${user.id},consultant_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (sessionsError) throw sessionsError;
    if (!sessions || sessions.length === 0) {
      return { success: true, conversations: [], currentUserId: user.id };
    }

    const sessionIds = sessions.map((s) => s.id);

    // 2. Fetch the latest message for these sessions
    const { data: messages, error: messagesError } = await supabase
      .from("session_messages")
      .select("session_id, content, created_at, sender_id")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false });

    if (messagesError) throw messagesError;

    // Group latest message by session_id
    const latestMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    if (messages) {
      for (const msg of messages) {
        if (!latestMessageMap.has(msg.session_id)) {
          latestMessageMap.set(msg.session_id, msg);
        }
      }
    }

    // 3. Assemble Conversation Items with safe type handling
    const conversations: ConversationItem[] = sessions.map((s) => {
      const isSeeker = user.id === s.seeker_id;
      
      const rawPartner = isSeeker ? s.consultant : s.seeker;
      const partner = Array.isArray(rawPartner) ? rawPartner[0] : rawPartner;

      const latestMsg = latestMessageMap.get(s.id);
      let previewText = latestMsg ? latestMsg.content : "Session initiated";
      
      // Clean preview if it was WebRTC internal signaling
      if (previewText.startsWith("[WEBRTC_")) {
        previewText = "📹 Video call";
      }

      return {
        sessionId: s.id,
        partnerId: partner?.id || "",
        partnerName: partner?.full_name || "Zeal Member",
        partnerAvatar: partner?.avatar_url || null,
        isOnline: Boolean(partner?.is_online),
        isAI: Boolean(partner?.is_ai),
        lastMessage: previewText,
        lastMessageTime: latestMsg?.created_at || s.created_at,
        lastMessageSenderId: latestMsg?.sender_id || null,
        status: s.status,
      };
    });

    // Sort by latest message/activity timestamp
    conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

    return { success: true, conversations, currentUserId: user.id };
  } catch (err: any) {
    console.error("[INBOX_FETCH_ERROR]:", err.message);
    return { success: false, conversations: [], currentUserId: null, error: err.message };
  }
}
