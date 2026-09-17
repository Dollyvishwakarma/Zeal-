"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useNotifications — Supabase Realtime based
// Uses `useRealtime` (from RealtimeProvider) instead of a socket.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useRealtime } from "./useRealtime";

interface NotificationPayload {
  id?: string;
  type?: string;
  message?: string;
  redirectUrl?: string | null;
  actorId?: string;
  actorName?: string | null;
  actorAvatar?: string | null;
}

export function useNotifications() {
  const user = useAppStore((s) => s.user);
  const addNotification = useAppStore((s) => s.addNotification);
  const markAllRead = useAppStore((s) => s.markAllRead);
  const unreadCount = useAppStore((s) => s.unreadCount);

  useRealtime<NotificationPayload>(
    user?.id ? `user:${user.id}:notifications` : null,
    "notification",
    (payload) => {
      if (!payload?.message) return;
      addNotification({
        id: payload.id || `notif-${Date.now()}`,
        type: (payload.type as never) || "system",
        message: payload.message,
        redirectUrl: payload.redirectUrl ?? null,
        read: false,
        actorId: payload.actorId || "system",
        actorName: payload.actorName ?? undefined,
        actorAvatar: payload.actorAvatar ?? undefined,
      });
    }
  );

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  }, []);

  return { unreadCount, markAllRead, markAsRead };
}