"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Consultant Management — premium card grid with realtime
// ═══════════════════════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Sparkles, Star, Flame, Loader2, Filter } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PulseGrid } from "@/components/shared/PulseGrid";

interface ConsultantRow {
  id: string;
  category: string;
  status: string;
  rating: number;
  sparkScore: number;
  perMinuteRate: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    is_online: boolean;
  };
}

interface ConsultantsResponse {
  consultants?: ConsultantRow[];
}

export default function ConsultantsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<ConsultantsResponse>({
    queryKey: ["admin", "consultants", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all"
        ? "/api/admin/consultants"
        : `/api/admin/consultants?status=${statusFilter}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const rows = (data?.consultants ?? []) as ConsultantRow[];
  const q = search.toLowerCase();
  const filtered = rows.filter((c) =>
    !q ||
    (c.user.name ?? "").toLowerCase().includes(q) ||
    c.user.email.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q)
  );

  const totalSparks = filtered.reduce((sum, c) => sum + (c.sparkScore ?? 0), 0);
  const avgRating = filtered.length
    ? filtered.reduce((sum, c) => sum + (c.rating ?? 0), 0) / filtered.length
    : 0;
  const onlineCount = filtered.filter((c) => c.user.is_online).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-white">Consultants</h1>
          <p className="text-sm text-slate-400 mt-1">
            {filtered.length} verified guide{filtered.length !== 1 ? "s" : ""} on the platform
          </p>
        </div>
      </div>

      {/* Aggregate pulse */}
      <PulseGrid
        stats={{
          sessions: filtered.length,
          earnings: 0,
          rating: avgRating,
          sparkScore: totalSparks,
          liveSessions: onlineCount,
          pendingBookings: 0,
        }}
        isLive
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or category..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#9D7DC5]"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-6 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-sm text-white outline-none focus:border-[#9D7DC5] appearance-none"
          >
            <option value="all">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No consultants found"
          description="Try a different filter or search term."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, idx) => (
            <motion.a
              key={c.id}
              href={`/consultants/${c.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-card-3d p-5 block hover:border-[#9D7DC5]/40 transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {c.user.avatar ? (
                      <img src={c.user.avatar} alt={c.user.name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      (c.user.name ?? c.user.email ?? "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  {c.user.is_online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm truncate">
                    {c.user.name || c.user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-slate-400 capitalize truncate">
                    {c.category.toLowerCase().replace(/_/g, " ")}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Star size={11} className="fill-amber-400" />
                      {c.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame size={11} />
                      {(c.sparkScore ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  c.status === "VERIFIED" ? "bg-emerald-500/20 text-emerald-400" :
                  c.status === "PENDING" ? "bg-amber-500/20 text-amber-400" :
                  "bg-slate-500/20 text-slate-400"
                }`}>
                  {c.status}
                </span>
                <span className="text-sm font-bold text-[#9D7DC5]">
                  ₹{c.perMinuteRate}/min
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}