"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Consultant Studio — Real-Time Command Center
// Subscribes to: consultant:{id}:status, user:{id}:wallet, consultant:{id}:incoming
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Power, Video, MessageSquare, IndianRupee, Star,
  Clock, Users, Loader2, Sparkles, Activity, Bell,
} from "lucide-react";
import { getBrowserClient } from "@zeal/database";

type ConsultantProfile = {
  id: string;
  full_name: string;
  wallet_balance: number;
  is_online: boolean;
};

type IncomingRequest = {
  id: string;
  seekerName: string;
  rate: number;
  modality: string;
  receivedAt: string;
};

export function StudioClient({ initialProfile }: { initialProfile: ConsultantProfile }) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(initialProfile.is_online);
  const [toggling, setToggling] = useState(false);
  const [balance, setBalance] = useState(initialProfile.wallet_balance);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  // Lazy-init browser client
  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  // ─── Realtime: incoming requests + wallet ─────────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const incomingChannel = supabase
      .channel(`consultant:${initialProfile.id}:incoming`)
      .on("broadcast", { event: "incoming_request" }, (payload: any) => {
        const req = payload.payload as IncomingRequest;
        if (req?.id) {
          setIncoming((prev) => [req, ...prev].slice(0, 10));
          // Vibrate if supported
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.([100, 50, 100]);
          }
        }
      })
      .subscribe();

    const walletChannel = supabase
      .channel(`user:${initialProfile.id}:wallet`)
      .on("broadcast", { event: "wallet_updated" }, (payload: any) => {
        const data = payload.payload as { balance?: number };
        if (typeof data?.balance === "number") setBalance(data.balance);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(incomingChannel); } catch { /* ignore */ }
      try { supabase.removeChannel(walletChannel); } catch { /* ignore */ }
    };
  }, [initialProfile.id]);

  // ─── Online toggle ────────────────────────────────────────────────────────
  const handleToggle = useCallback(async () => {
    setToggling(true);
    const next = !isOnline;
    try {
      const res = await fetch("/api/consultant/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setIsOnline(next);

      // Broadcast to seekers
      const supabase = supabaseRef.current;
      if (supabase) {
        const ch = supabase.channel(`consultant:${initialProfile.id}:status`);
        await ch.subscribe();
        await ch.send({
          type: "broadcast",
          event: "status_updated",
          payload: { consultantId: initialProfile.id, is_online: next },
        });
        await supabase.removeChannel(ch);
      }
    } catch (err) {
      console.error("[Studio] toggle failed", err);
    } finally {
      setToggling(false);
    }
  }, [isOnline, initialProfile.id]);

  const acceptRequest = (req: IncomingRequest) => {
    setIncoming((prev) => prev.filter((r) => r.id !== req.id));
    router.push(`/chat/${req.id}`);
  };

  const dismissRequest = (id: string) => {
    setIncoming((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col relative">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-8 border-b border-white/5 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#9D7DC5]/10 border border-[#9D7DC5]/20 text-[#9D7DC5] text-xs font-bold mb-4">
            <Sparkles size={14} /> Consultant Studio
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
            Welcome back, <strong className="text-slate-200">{initialProfile.full_name}</strong>.
          </p>
        </div>

        {/* Master Power Switch */}
        <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-xl w-full lg:w-auto">
          <div className="px-4 flex-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? "text-emerald-400" : "text-slate-500"}`}>
              {isOnline ? "Accepting Sessions" : "Currently Offline"}
            </span>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-label="Toggle online status"
            className={`relative w-16 h-10 rounded-full transition-colors duration-300 flex items-center p-1 ${
              isOnline
                ? "bg-emerald-500/20 border border-emerald-500/50"
                : "bg-slate-800 border border-slate-700"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 transform ${
                isOnline
                  ? "translate-x-6 bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                  : "translate-x-0 bg-slate-600 text-slate-300"
              }`}
            >
              {toggling ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
            </div>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        <MetricCard
          label="Balance"
          value={`₹${Number(balance).toFixed(0)}`}
          icon={IndianRupee}
          accent="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MetricCard
          label="Rating"
          value="5.0"
          icon={Star}
          accent="text-amber-400"
          bg="bg-amber-500/10"
        />
        <MetricCard
          label="Sessions"
          value="0"
          icon={Video}
          accent="text-indigo-400"
          bg="bg-indigo-500/10"
        />
        <MetricCard
          label="Hours"
          value="0h"
          icon={Clock}
          accent="text-purple-400"
          bg="bg-purple-500/10"
        />
      </div>

      {/* ─── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 flex-1">
        {/* Incoming Queue */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 rounded-3xl p-6 lg:p-8 shadow-2xl flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg lg:text-xl font-black flex items-center gap-3 text-white">
                <Activity className="text-indigo-400 w-5 h-5" /> Live Seeker Queue
              </h3>
              {isOnline && (
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Searching...
                </span>
              )}
            </div>

            {/* Incoming Requests */}
            {incoming.length > 0 ? (
              <div className="space-y-3 relative z-10">
                {incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
                        <Bell size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{req.seekerName}</p>
                        <p className="text-xs text-slate-400">
                          ₹{req.rate}/min · {req.modality}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => dismissRequest(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => acceptRequest(req)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-3xl p-8 relative z-10 transition-colors ${
                isOnline ? "border-indigo-500/30 bg-indigo-950/20" : "border-white/5 bg-slate-950/50"
              }`}>
                <div className="text-center">
                  <div className={`w-16 lg:w-20 h-16 lg:h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${
                    isOnline ? "bg-indigo-500/20 text-indigo-400 animate-pulse" : "bg-white/5 text-slate-500"
                  }`}>
                    {isOnline ? <Users size={28} /> : <Power size={28} />}
                  </div>
                  <h4 className="text-base lg:text-xl font-bold text-slate-200 mb-2">
                    {isOnline ? "Waiting for connections..." : "Studio is Offline"}
                  </h4>
                  <p className="text-xs lg:text-sm text-slate-500 max-w-sm mx-auto">
                    {isOnline
                      ? "Your profile is visible to seekers. Incoming requests will appear here instantly."
                      : "Toggle your power switch to online to start receiving consultations."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Communication sidebar (desktop only) */}
        <div className="hidden lg:flex bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex-col">
          <h3 className="text-lg font-black mb-6 flex items-center gap-3 text-white">
            <MessageSquare className="text-slate-400" size={20} /> Quick Actions
          </h3>

          <div className="space-y-3 flex-1">
            <QuickAction icon={Video} label="Video Gateway" subtitle="Requires active session" />
            <QuickAction icon={MessageSquare} label="Live Chat Bridge" subtitle="Requires active session" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon: Icon, accent, bg,
}: {
  label: string; value: string; icon: typeof IndianRupee; accent: string; bg: string;
}) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl transition-all duration-300 hover:border-white/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg lg:rounded-xl ${bg} ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-xl lg:text-3xl font-black font-mono tracking-tight text-white">{value}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon, label, subtitle,
}: {
  icon: typeof Video; label: string; subtitle: string;
}) {
  return (
    <div className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl opacity-50 cursor-not-allowed">
      <div className="flex items-center gap-3 mb-1">
        <Icon size={16} className="text-slate-400" />
        <div className="text-sm font-bold text-slate-200">{label}</div>
      </div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}