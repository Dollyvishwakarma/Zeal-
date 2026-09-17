"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Consultant Command Center — Admin app view for consultants
// Uses: PulseGrid + useConsultantRealtime + RevenueChart
// ═══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useAdminStore } from "@/lib/store/adminStore";
import { PulseGrid } from "@/components/shared/PulseGrid";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { useConsultantRealtime } from "@/hooks/useConsultantRealtime";
import {
  Calendar, Clock, Power, Video, MessageSquare, Loader2, ArrowRight,
} from "lucide-react";

export default function ConsultantDashboard() {
  const { profile } = useAdminStore();
  const consultantId = profile?.consultantId ?? null;
  const { pulse, alerts, isLive } = useConsultantRealtime(consultantId);
  const [isOnline, setIsOnline] = useState(true);
  const [toggling, setToggling] = useState(false);

  const stats = pulse ?? {
    sessions: 0,
    earnings: 0,
    rating: 0,
    sparkScore: 0,
    liveSessions: 0,
    pendingBookings: 0,
  };

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      await fetch("/api/consultant/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: !isOnline }),
      });
      setIsOnline((v) => !v);
    } catch (err) {
      console.error("[toggle online]", err);
    } finally {
      setToggling(false);
    }
  };

  if (!consultantId) {
    return (
      <div className="glass-card-3d p-8 text-center">
        <p className="text-slate-400">Consultant profile not linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white">
            Welcome back, {profile?.name || "Consultant"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your practice at a glance</p>
        </div>

        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
            isOnline
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          {toggling ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Power size={18} className={isOnline ? "animate-pulse" : ""} />
          )}
          <span className="text-sm font-bold uppercase tracking-wider">
            {toggling ? "Updating..." : isOnline ? "Accepting Sessions" : "Currently Offline"}
          </span>
        </button>
      </div>

      {/* Pulse grid */}
      <PulseGrid stats={stats} isLive={isLive} showPendingAlert />

      {/* Incoming alerts */}
      {alerts.length > 0 && (
        <div className="glass-card-3d p-5 border border-[#9D7DC5]/30">
          <h2 className="text-sm font-bold text-[#9D7DC5] uppercase tracking-wider mb-3">
            Live Requests ({alerts.length})
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a) => (
              <a
                key={a.id}
                href={a.redirectUrl || "/consultant/bookings"}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center text-[#9D7DC5]">
                  {a.type === "chat" ? <MessageSquare size={14} /> :
                   a.type === "call" ? <Video size={14} /> : <Calendar size={14} />}
                </div>
                <p className="text-sm text-slate-200 flex-1">{a.message}</p>
                <span className="text-xs text-[#9D7DC5]">View →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Revenue + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div className="glass-card-3d p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionLink href="/consultant/bookings" icon={Calendar} label="Manage Bookings" />
            <QuickActionLink href="/consultant/earnings" icon={Clock} label="View Earnings" />
            <QuickActionLink href="/consultant/settings" icon={Power} label="Profile Settings" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Calendar;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
    >
      <Icon size={16} className="text-[#9D7DC5]" />
      <span className="text-sm text-slate-200 flex-1">{label}</span>
      <ArrowRight size={12} className="text-slate-500 group-hover:text-[#9D7DC5] transition-colors" />
    </a>
  );
}