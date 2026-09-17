"use client";

import { useEffect, useState, useCallback } from "react";
import { useRealtime } from "./useRealtime";

export interface RealtimeNotification {
  id: string;
  type: string;
  message: string;
  redirectUrl?: string | null;
  read: boolean;
  createdAt: Date;
}

interface IncomingNotification {
  id?: string;
  type?: string;
  message?: string;
  redirectUrl?: string | null;
  createdAt?: string;
}

export function useRealtimeNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch("/api/notifications?limit=50")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const items = (data.items || []) as RealtimeNotification[];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [userId]);

  // Realtime — dedupe by id
  const handleIncoming = useCallback((payload: IncomingNotification) => {
    if (!payload?.message) return;
    const id = payload.id || `notif-${Date.now()}`;

    setNotifications((prev) => {
      if (prev.some((n) => n.id === id)) return prev;
      const notif: RealtimeNotification = {
        id,
        type: payload.type || "system",
        message: payload.message as string,
        redirectUrl: payload.redirectUrl || null,
        read: false,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
      };
      return [notif, ...prev];
    });
    setUnreadCount((prev) => prev + 1);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState !== "visible"
    ) {
      try { new Notification("Zeal", { body: payload.message }); } catch { /* ignore */ }
    }
  }, []);

  useRealtime<IncomingNotification>(
    userId ? `user:${userId}` : null,
    "notification",
    handleIncoming,
  );

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch (err) {
      console.warn("[Notifications] markAsRead failed", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", { method: "PUT" });
    } catch (err) {
      console.warn("[Notifications] markAllAsRead failed", err);
    }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
