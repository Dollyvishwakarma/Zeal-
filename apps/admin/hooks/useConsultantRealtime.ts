"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useConsultantRealtime — admin-side realtime for a specific consultant
// Subscribes to sparks + incoming + wallet channels (private)
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { PulseStats } from "@/components/shared/PulseGrid";

interface IncomingAlert {
  id: string;
  type: "chat" | "call" | "booking";
  message: string;
  redirectUrl?: string;
  createdAt: string;
}

interface SparkRecord {
  sparkScore?: number;
  record?: { sparkScore?: number };
}

interface WalletRecord {
  balance?: number;
  record?: { balance?: number };
}

interface StatsPayload {
  totalBookings?: number;
  totalEarnings?: number;
  rating?: number;
  sparkScore?: number;
  liveSessions?: number;
  pendingBookings?: number;
}

export function useConsultantRealtime(consultantId: string | null) {
  const [pulse, setPulse] = useState<PulseStats | null>(null);
  const [alerts, setAlerts] = useState<IncomingAlert[]>([]);
  const [isLive, setIsLive] = useState(false);
  const clientRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  if (!clientRef.current && typeof window !== "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      try { clientRef.current = createBrowserClient(url, key); } catch { /* noop */ }
    }
  }

  // Initial fetch
  useEffect(() => {
    if (!consultantId) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/admin/consultants/${consultantId}/stats`, { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as StatsPayload;
        if (cancelled) return;
        setPulse({
          sessions: data.totalBookings ?? 0,
          earnings: data.totalEarnings ?? 0,
          rating: data.rating ?? 0,
          sparkScore: data.sparkScore ?? 0,
          liveSessions: data.liveSessions ?? 0,
          pendingBookings: data.pendingBookings ?? 0,
        });
      } catch { /* noop */ }
    })();

    return () => { cancelled = true; };
  }, [consultantId]);

  // Realtime subscriptions
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !consultantId) return;

    const channels: Array<ReturnType<typeof client.channel>> = [];

    // Sparks
    const sparkCh = client
      .channel(`consultant:${consultantId}:sparks`, { config: { private: true } })
      .on("broadcast", { event: "*" }, (payload: unknown) => {
        const data = payload as SparkRecord;
        const next = data?.sparkScore ?? data?.record?.sparkScore;
        if (typeof next === "number") {
          setPulse((p) => (p ? { ...p, sparkScore: next } : p));
        }
      })
      .subscribe((s: string) => { if (s === "SUBSCRIBED") setIsLive(true); });
    channels.push(sparkCh);

    // Incoming requests
    const incomingCh = client
      .channel(`consultant:${consultantId}:incoming`, { config: { private: true } })
      .on("broadcast", { event: "incoming_request" }, (payload: unknown) => {
        const req = (payload as { payload?: IncomingAlert })?.payload;
        if (req?.id) {
          setAlerts((prev) => [req, ...prev].slice(0, 10));
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.([100, 50, 100]);
          }
        }
      })
      .subscribe();
    channels.push(incomingCh);

    // Wallet
    const walletCh = client
      .channel(`user:${consultantId}:wallet`, { config: { private: true } })
      .on("broadcast", { event: "*" }, (payload: unknown) => {
        const data = payload as WalletRecord;
        const next = data?.balance ?? data?.record?.balance;
        if (typeof next === "number") {
          setPulse((p) => (p ? { ...p, earnings: next } : p));
        }
      })
      .subscribe();
    channels.push(walletCh);

    return () => {
      channels.forEach((ch) => { try { client.removeChannel(ch); } catch { /* noop */ } });
      setIsLive(false);
    };
  }, [consultantId]);

  const refresh = useCallback(async () => {
    if (!consultantId) return;
    try {
      const r = await fetch(`/api/admin/consultants/${consultantId}/stats`, { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as StatsPayload;
      setPulse({
        sessions: data.totalBookings ?? 0,
        earnings: data.totalEarnings ?? 0,
        rating: data.rating ?? 0,
        sparkScore: data.sparkScore ?? 0,
        liveSessions: data.liveSessions ?? 0,
        pendingBookings: data.pendingBookings ?? 0,
      });
    } catch { /* noop */ }
  }, [consultantId]);

  return { pulse, alerts, isLive, refresh };
}