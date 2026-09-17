"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Global Call Listener
// ─────────────────────────────────────────────────────────────────────────────
// Mounts a Supabase Realtime subscription for incoming session alerts.
// Renders a lightweight overlay when a consultant requests a session.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Calendar, X } from "lucide-react";
import { getBrowserClient } from "@zeal/database";

interface IncomingAlert {
  id: string;
  type: "chat" | "call" | "booking";
  message: string;
  redirectUrl?: string;
  createdAt: string;
}

export function GlobalCallListener({ userId }: { userId: string }) {
  const [alert, setAlert] = useState<IncomingAlert | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    let supabase;
    try {
      supabase = getBrowserClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`user:${userId}:alerts`)
      .on("broadcast", { event: "incoming_alert" }, (payload: any) => {
        const data = payload.payload as IncomingAlert;
        if (data?.id && data?.message) setAlert(data);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [userId]);

  if (!alert) return null;

  const Icon = alert.type === "chat" ? MessageCircle
    : alert.type === "call" ? Phone
    : Calendar;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-card-3d max-w-md w-full p-8 text-center border border-white/20">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center animate-pulse">
            <Icon className="w-12 h-12 text-[#9D7DC5]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">
          {alert.type === "chat" ? "New Chat Request"
            : alert.type === "call" ? "Incoming Call"
            : "New Booking Request"}
        </h2>
        <p className="text-white/70 mt-1">{alert.message}</p>

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setAlert(null)}
            className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-all"
          >
            <X className="w-5 h-5 inline mr-2" /> Dismiss
          </button>
          <button
            onClick={() => {
              const url = alert.redirectUrl || "/chat";
              setAlert(null);
              router.push(url);
            }}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}