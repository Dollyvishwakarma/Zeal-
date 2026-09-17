"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useConversations — Real-time inbox list
// Subscribes to user:{id}:inbox for live last-message updates.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

export interface ConversationItem {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  isOnline: boolean;
  isAI: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSenderId: string | null;
}

interface RawMessage {
  id?: string;
  conversationId?: string;
  senderId?: string;
  content?: string;
  createdAt?: string;
}

export function useConversations(
  userId: string,
  initial: ConversationItem[] = []
) {
  const [conversations, setConversations] = useState<ConversationItem[]>(initial);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items)) setConversations(data.items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || !userId) return;

    const channel = supabase
      .channel(`user:${userId}:inbox`)
      .on("broadcast", { event: "*" }, (payload: any) => {
        const record = (payload as { payload?: { record?: RawMessage } }).payload?.record;
        if (!record?.conversationId || !record?.content) return;

        setConversations((prev) => {
          const exists = prev.some((c) => c.sessionId === record.conversationId);
          if (!exists) {
            // New conversation — full refresh
            void refresh();
            return prev;
          }
          const updated = prev.map((c) =>
            c.sessionId === record.conversationId
              ? {
                  ...c,
                  lastMessage: record.content ?? c.lastMessage,
                  lastMessageTime: record.createdAt ?? c.lastMessageTime,
                  lastMessageSenderId: record.senderId ?? c.lastMessageSenderId,
                }
              : c
          );
          return updated.sort((a, b) => {
            const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return tb - ta;
          });
        });
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [userId, refresh]);

  return { conversations, setConversations, refresh };
}