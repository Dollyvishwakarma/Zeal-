"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, IndianRupee, ArrowUpRight, Loader2 } from "lucide-react";
import { getBrowserClient } from "@zeal/database";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export default function ConsultantEarningsPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/consultant/earnings")
      .then((r) => r.ok ? r.json() : { balance: 0, transactions: [] })
      .then((data) => {
        if (cancelled) return;
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
      })
      .finally(() => !cancelled && setLoading(false));

    const supabase = supabaseRef.current;
    if (supabase) {
      const channel = supabase
        .channel("consultant_earnings")
        .on("broadcast", { event: "wallet_updated" }, (payload: any) => {
          const data = payload.payload as { balance?: number };
          if (typeof data?.balance === "number") setBalance(data.balance);
        })
        .subscribe();

      return () => {
        cancelled = true;
        try { supabase.removeChannel(channel); } catch { /* ignore */ }
      };
    }

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-white">Earnings</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time wallet updates</p>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden p-6 lg:p-8 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Available Balance
            </span>
          </div>
          <div className="flex items-center gap-2 text-white">
            <IndianRupee className="w-8 h-8 text-emerald-400" />
            <span className="text-3xl lg:text-5xl font-black font-mono tracking-tight">
              {Number(balance).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 lg:p-6">
        <h2 className="text-base lg:text-lg font-bold text-white mb-4">Recent Transactions</h2>

        {transactions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 20).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    tx.amount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  }`}>
                    <ArrowUpRight size={14} className={tx.amount < 0 ? "rotate-90" : ""} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold font-mono flex-shrink-0 ${
                  tx.amount > 0 ? "text-emerald-400" : "text-slate-300"
                }`}>
                  {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}