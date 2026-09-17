"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Notifications — Realtime via Phase 1 useChannel
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { channels, useChannel } from "@/lib/realtime/universal";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  redirectUrl?: string | null;
  read: boolean;
  createdAt: string;
}

interface NotificationPayload {
  id?: string;
  type?: string;
  message?: string;
  redirectUrl?: string | null;
  createdAt?: string;
}

interface MeResponse {
  user?: { id: string };
}

type Filter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  // Initial fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/users/me/profile", { cache: "no-store" });
        if (!cancelled && meRes.ok) {
          const me = (await meRes.json()) as MeResponse;
          if (me.user?.id) setUserId(me.user.id);
        }

        const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { items?: NotificationItem[] };
          setItems(data.items ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Realtime
  useChannel<NotificationPayload>({
    channel: userId ? channels.userNotifications(userId) : null,
    event: "notification",
    onMessage: (payload) => {
      if (!payload?.message) return;
      const id = payload.id ?? `notif-${Date.now()}`;
      setItems((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        return [
          {
            id,
            type: payload.type ?? "system",
            message: payload.message as string,
            redirectUrl: payload.redirectUrl ?? null,
            read: false,
            createdAt: payload.createdAt ?? new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
  });

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try { await fetch(`/api/notifications/${id}/read`, { method: "POST" }); } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await fetch("/api/notifications", { method: "PUT" }); } catch {}
  }, []);

  const filtered = items.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 py-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
          {unreadCount > 0 && (
            <span className="bg-[#9D7DC5] text-white rounded-full px-2.5 py-0.5 text-xs">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#9D7DC5] hover:bg-white/10"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              filter === f
                ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white"
                : "bg-white/5 border border-white/10 text-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] text-center">
          <div className="p-4 rounded-full bg-[#9D7DC5]/10 mb-4">
            <Bell className="w-8 h-8 text-[#9D7DC5]" />
          </div>
          <h3 className="text-lg font-semibold text-white">No notifications</h3>
          <p className="text-sm text-slate-400 mt-1">
            {filter === "unread" ? "All caught up!" : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  !n.read
                    ? "bg-[#9D7DC5]/10 border-[#9D7DC5]/30 border-l-4 border-l-[#9D7DC5]"
                    : "bg-slate-900/60 border-white/5"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-[#9D7DC5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{n.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-1 rounded-full hover:bg-white/10"
                    aria-label="Mark read"
                  >
                    <Check className="w-4 h-4 text-[#9D7DC5]" />
                  </button>
                )}
                {n.redirectUrl && (
                  <Link
                    href={n.redirectUrl}
                    className="text-xs text-[#9D7DC5] hover:underline ml-2 self-center"
                  >
                    View
                  </Link>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}