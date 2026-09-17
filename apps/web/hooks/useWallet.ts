"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useWallet — Real-time wallet + transactions
// Subscribes to user:{id}:wallet for live balance updates
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export function useWallet(userId: string | null) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.wallet?.balance === "number") setBalance(data.wallet.balance);
      }
      const txRes = await fetch("/api/wallet/transactions?limit=20", { cache: "no-store" });
      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData?.transactions)) setTransactions(txData.transactions);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    refresh().finally(() => { if (!cancelled) setLoading(false); });

    const supabase = supabaseRef.current;
    if (!supabase) return () => { cancelled = true; };

    const channel = supabase
      .channel(`user:${userId}:wallet`)
      .on("broadcast", { event: "*" }, (payload: any) => {
        const data = payload.payload as { balance?: number; record?: { balance?: number; amount?: number } };
        const nextBalance = data?.balance ?? data?.record?.balance;
        if (typeof nextBalance === "number") {
          setBalance(nextBalance);
          // Refresh transactions on any wallet event
          void refresh();
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [userId, refresh]);

  return { balance, transactions, loading, refresh, setBalance };
}