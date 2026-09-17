"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Wallet Page — Real-time balance + top-up
// Theme: dark slate + Zeal purple. Mobile-first.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  IndianRupee, ShieldCheck, Loader2, ArrowUpRight,
  Plus, Wallet as WalletIcon, ArrowDownRight,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { topUpWalletAction } from "@/actions/wallet";

export default function WalletPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("500");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me/profile", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.user?.id) setUserId(data.user.id); })
      .catch(() => {});
  }, []);

  const { balance, transactions, loading, refresh } = useWallet(userId);

  const handleTopUp = async (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Invalid amount");
      return;
    }
    setProcessing(true);
    setMessage(null);
    try {
      const res = await topUpWalletAction(amount);
      if (res.success) {
        setMessage(`✅ Added ₹${amount} to your wallet`);
        await refresh();
      } else {
        setMessage(res.error || "Top-up failed");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-app bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 px-4 py-6 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-1/3 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
              <ShieldCheck size={14} /> Secure Vault
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              Zeal Credits
            </h1>
          </div>

          {/* Balance */}
          <div className="relative z-10 p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 mb-6">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
              Available Balance
            </p>
            <div className="flex items-center gap-2">
              <IndianRupee size={32} className="text-emerald-400" />
              <span className="text-3xl md:text-4xl font-black text-white font-mono tracking-tight">
                {Number(balance).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-2xl text-xs font-bold text-center animate-in fade-in ${
              message.startsWith("✅")
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}>
              {message}
            </div>
          )}

          {/* Preset top-ups */}
          <div className="relative z-10 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Quick Top-Up
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    disabled={processing}
                    onClick={() => handleTopUp(amt)}
                    className="p-4 rounded-2xl bg-slate-950 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 text-center transition-all active:scale-95 disabled:opacity-50 group"
                  >
                    <span className="block text-lg font-black text-white group-hover:text-emerald-400">
                      ₹{amt}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">
                      Instant
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Custom Amount (₹)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="1"
                  max="100000"
                  className="flex-1 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  disabled={processing}
                  onClick={() => handleTopUp(Number(customAmount))}
                  className="px-5 md:px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Add</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-6 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <WalletIcon size={18} className="text-[#9D7DC5]" />
            <h2 className="text-base md:text-lg font-bold text-white">Recent Transactions</h2>
          </div>

          {transactions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((tx) => {
                const isCredit = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCredit ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {isCredit ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{tx.description}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(tx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold font-mono flex-shrink-0 ${
                      isCredit ? "text-emerald-400" : "text-slate-300"
                    }`}>
                      {isCredit ? "+" : "-"}₹{Math.abs(tx.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}