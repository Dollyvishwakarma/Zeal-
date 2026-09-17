"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useTyping — Presence-based typing indicator
// No DB writes. Uses Supabase Presence (CRDT-backed, ephemeral).
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

export function useTyping(conversationId: string | null, currentUserId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getBrowserClient>["channel"]> | null>(null);
  const timeoutRef = useRef<number | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase || !conversationId) return;

    const channel = supabase.channel(`room:${conversationId}:typing`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ typing?: boolean }>>;
        const next = new Set<string>();
        for (const key of Object.keys(state)) {
          if (key === currentUserId) continue;
          const entries = state[key];
          if (entries && entries.length > 0 && entries[0]?.typing) {
            next.add(key);
          }
        }
        setTypingUsers(next);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [conversationId, currentUserId]);

  const setTyping = useCallback((isTyping: boolean) => {
    const channel = channelRef.current;
    if (!channel) return;
    try { channel.track({ typing: isTyping }); } catch { /* ignore */ }
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (isTyping) {
      timeoutRef.current = window.setTimeout(() => {
        try { channelRef.current?.track({ typing: false }); } catch { /* ignore */ }
      }, 2000);
    }
  }, []);

  return { typingUsers, setTyping };
}