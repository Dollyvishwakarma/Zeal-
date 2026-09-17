"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useAdminRealtime — Live stats + verification queue for admin dashboard
// Subscribes to admin:broadcast channel and admin:verification:queue
// Falls back to polling if realtime unavailable.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export interface AdminStats {
  users: number;
  consultants: number;
  bookings: number;
  revenueToday: number;
  revenueMonth: number;
  liveSessions: number;
  pendingVerifications: number;
}

export interface PendingConsultant {
  id: string;
  category: string;
  bio: string | null;
  perMinuteRate: number;
  createdAt: string;
  user: { id: string; name: string | null; email: string; username: string; avatar: string | null };
}

export function useAdminRealtime(userId: string | null) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<PendingConsultant[]>([]);
  const [isLive, setIsLive] = useState(false);
  const clientRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  if (!clientRef.current && typeof window !== "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        clientRef.current = createBrowserClient(url, key);
      } catch { /* ignore */ }
    }
  }

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }),
          fetch("/api/admin/verification", { cache: "no-store" }),
        ]);

        if (!cancelled && statsRes.ok) {
          const data = (await statsRes.json()) as AdminStats;
          setStats(data);
        }
        if (!cancelled && pendingRes.ok) {
          const data = (await pendingRes.json()) as { consultants?: PendingConsultant[] };
          setPending(data.consultants ?? []);
        }
      } catch { /* ignore */ }
    };

    void load();

    // Polling fallback every 30s
    const interval = window.setInterval(load, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [userId]);

  // Realtime subscriptions
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !userId) return;

    const channels: Array<ReturnType<typeof client.channel>> = [];

    // Admin broadcast channel
    const broadcastCh = client
      .channel("admin:broadcast")
      .on("broadcast", { event: "verification_queue_updated" }, () => {
        void (async () => {
          try {
            const res = await fetch("/api/admin/verification", { cache: "no-store" });
            if (res.ok) {
              const data = (await res.json()) as { consultants?: PendingConsultant[] };
              setPending(data.consultants ?? []);
            }
          } catch { /* ignore */ }
        })();
      })
      .on("broadcast", { event: "stats_updated" }, (payload: { payload: Partial<AdminStats> }) => {
        const next = payload.payload as Partial<AdminStats>;
        setStats((prev) => (prev ? { ...prev, ...next } : (next as AdminStats)));
      })
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setIsLive(true);
      });
    channels.push(broadcastCh);

    return () => {
      for (const ch of channels) {
        try { client.removeChannel(ch); } catch { /* ignore */ }
      }
      setIsLive(false);
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/verification", { cache: "no-store" }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (pendingRes.ok) {
        const data = (await pendingRes.json()) as { consultants?: PendingConsultant[] };
        setPending(data.consultants ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  return { stats, pending, isLive, refresh };
}