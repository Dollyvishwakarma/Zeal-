"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// PulseGrid — Reusable stats grid for consultant + admin aggregate views
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Users, IndianRupee, Star, Flame, Radio } from "lucide-react";

export interface PulseStats {
  sessions: number;
  earnings: number;
  rating: number;
  sparkScore: number;
  liveSessions: number;
  pendingBookings: number;
}

interface PulseGridProps {
  stats: PulseStats;
  isLive?: boolean;
  showPendingAlert?: boolean;
  compact?: boolean;
}

const CARDS = [
  { key: "sessions" as const,       icon: Users,       label: "Sessions",  accent: "text-indigo-400",  bg: "bg-indigo-500/10" },
  { key: "earnings" as const,       icon: IndianRupee, label: "Earnings",  accent: "text-emerald-400", bg: "bg-emerald-500/10", currency: true },
  { key: "rating" as const,         icon: Star,        label: "Rating",    accent: "text-amber-400",   bg: "bg-amber-500/10",   suffix: "★" },
  { key: "sparkScore" as const,     icon: Flame,       label: "Sparks",    accent: "text-orange-400",  bg: "bg-orange-500/10" },
];

export function PulseGrid({ stats, isLive, showPendingAlert, compact }: PulseGridProps) {
  return (
    <div className="space-y-4">
      {isLive && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
          <Radio size={12} className="animate-pulse" /> Live
          {stats.liveSessions > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              {stats.liveSessions} active
            </span>
          )}
        </div>
      )}

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 ${compact ? "lg:gap-2" : ""}`}>
        {CARDS.map((tpl, idx) => {
          const Icon = tpl.icon;
          const raw = stats[tpl.key];
          const value =
            "currency" in tpl && tpl.currency
              ? `₹${raw.toLocaleString("en-IN")}`
              : "suffix" in tpl && tpl.suffix
              ? `${raw.toFixed(1)}${tpl.suffix}`
              : raw.toLocaleString("en-IN");

          return (
            <motion.div
              key={tpl.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card-3d p-4 md:p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {tpl.label}
                </span>
                <div className={`p-2 rounded-xl ${tpl.bg} ${tpl.accent}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-xl md:text-3xl font-black font-mono tracking-tight text-white">
                {value}
              </div>
            </motion.div>
          );
        })}
      </div>

      {showPendingAlert && stats.pendingBookings > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <span className="text-sm font-bold text-amber-400">
            {stats.pendingBookings} pending booking{stats.pendingBookings !== 1 ? "s" : ""}
          </span>
          <a href="/bookings?filter=pending" className="text-xs text-amber-400 hover:underline">
            Review →
          </a>
        </div>
      )}
    </div>
  );
}