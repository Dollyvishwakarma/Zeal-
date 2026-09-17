"use client";

import { useEffect, useState } from "react";
import { subscribeToPresence } from "@/lib/realtime/supabase-realtime";

interface PresenceState {
  [key: string]: Array<{ online_at: string }>;
}

export interface PresenceInfo {
  onlineUsers: Set<string>;
  isOnline: (id: string) => boolean;
  count: number;
}

export function usePresence(
  roomId: string | null,
  userId: string | undefined,
): PresenceInfo {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId || !userId) return;

    const unsub = subscribeToPresence<PresenceState>(
      `presence:${roomId}`,
      userId,
      (state) => {
        try {
          const ids = new Set(Object.keys(state || {}));
          setOnlineUsers(ids);
        } catch (e) {
          console.warn("[Presence] state parse failed", e);
        }
      },
    );

    return unsub;
  }, [roomId, userId]);

  return {
    onlineUsers,
    isOnline: (id: string) => onlineUsers.has(id),
    count: onlineUsers.size,
  };
}
