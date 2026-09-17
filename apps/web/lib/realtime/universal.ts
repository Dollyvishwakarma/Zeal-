"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Universal Realtime Primitives
// ═══════════════════════════════════════════════════════════════════════════════
// One module replaces N per-domain hooks.
//
//   channels.*              → typed channel name builders
//   useChannel<T>()         → subscribe to any broadcast channel
//   usePresence<T>()        → subscribe to presence (typing, online)
//
// Consumers compose these primitives instead of writing their own subscriptions.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

// ─── Channel name builders (single source of truth) ─────────────────────────
export const channels = {
  roomMessages:        (convId: string) => `room:${convId}:messages` as const,
  roomTyping:          (convId: string) => `room:${convId}:typing` as const,
  userInbox:           (uid: string)    => `user:${uid}:inbox` as const,
  userWallet:          (uid: string)    => `user:${uid}:wallet` as const,
  userNotifications:   (uid: string)    => `user:${uid}:notifications` as const,
  consultantStatus:    (id: string)     => `consultant:${id}:status` as const,
  consultantSparks:    (id: string)     => `consultant:${id}:sparks` as const,
  consultantIncoming:  (id: string)     => `consultant:${id}:incoming` as const,
  adminBookings:       ()               => `admin:bookings` as const,
  adminVerification:   ()               => `admin:verification` as const,
} as const;

export type ChannelName = ReturnType<(typeof channels)[keyof typeof channels]>;

// ─── useChannel ─────────────────────────────────────────────────────────────
export interface UseChannelOptions<T> {
  channel: string | null;
  event?: string;             // default "*"
  onMessage: (payload: T) => void;
  private?: boolean;          // default true (RLS-enforced)
  enabled?: boolean;          // default true
}

export interface UseChannelResult {
  isLive: boolean;
}

export function useChannel<T = unknown>({
  channel,
  event = "*",
  onMessage,
  private: isPrivate = true,
  enabled = true,
}: UseChannelOptions<T>): UseChannelResult {
  const [isLive, setIsLive] = useState(false);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!channel || !enabled) return;

    let client: ReturnType<typeof getBrowserClient> | null = null;
    try {
      client = getBrowserClient();
    } catch {
      return;
    }

    const ch = client
      .channel(channel, { config: { private: isPrivate } })
      .on("broadcast", { event }, (payload: any) => {
        try {
          handlerRef.current(payload?.payload as T);
        } catch (err) {
          console.warn(`[useChannel] handler error on ${channel}`, err);
        }
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setIsLive(true);
        else if (status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT") {
          setIsLive(false);
        }
      });

    return () => {
      try { client!.removeChannel(ch); } catch { /* ignore */ }
      setIsLive(false);
    };
  }, [channel, event, isPrivate, enabled]);

  return { isLive };
}

// ─── usePresence ────────────────────────────────────────────────────────────
export function usePresence<T = unknown>(
  channelName: string | null,
  key: string,
  onSync: (state: Record<string, T[]>) => void
): void {
  const handlerRef = useRef(onSync);
  handlerRef.current = onSync;

  useEffect(() => {
    if (!channelName) return;

    let client: ReturnType<typeof getBrowserClient> | null = null;
    try {
      client = getBrowserClient();
    } catch {
      return;
    }

    const ch = client
      .channel(channelName, { config: { presence: { key } } })
      .on("presence", { event: "sync" }, () => {
        try {
          handlerRef.current(ch.presenceState() as Record<string, T[]>);
        } catch (err) {
          console.warn(`[usePresence] sync error on ${channelName}`, err);
        }
      })
      .subscribe();

    return () => {
      try { client!.removeChannel(ch); } catch { /* ignore */ }
    };
  }, [channelName, key]);
}

// ─── useTrackPresence (for the tracker side) ────────────────────────────────
export function useTrackPresence<T extends Record<string, unknown>>(
  channelName: string | null,
  key: string
): { track: (state: T) => void; untrack: () => void } {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!channelName) return;

    let client: ReturnType<typeof getBrowserClient> | null = null;
    try {
      client = getBrowserClient();
    } catch {
      return;
    }

    const ch = client
      .channel(channelName, { config: { presence: { key } } })
      .subscribe();
    channelRef.current = ch;

    return () => {
      try { client!.removeChannel(ch); } catch { /* ignore */ }
      channelRef.current = null;
    };
  }, [channelName, key]);

  return {
    track: (state: T) => {
      try { channelRef.current?.track(state); } catch { /* ignore */ }
    },
    untrack: () => {
      try { channelRef.current?.untrack(); } catch { /* ignore */ }
    },
  };
}