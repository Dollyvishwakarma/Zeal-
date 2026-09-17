"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, UserCog, Calendar, DollarSign, Radio, AlertCircle } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const stats = data || {
    users: 0,
    consultants: 0,
    bookings: 0,
    revenueToday: 0,
    liveSessions: 0,
    pendingVerifications: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">
          Platform Pulse
        </h1>
        <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mt-1">
          Real-time overview of the entire platform
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard label="Users" value={stats.users} icon={Users} color="purple" />
        <StatsCard label="Consultants" value={stats.consultants} icon={UserCog} color="blue" />
        <StatsCard label="Bookings" value={stats.bookings} icon={Calendar} color="green" />
        <StatsCard label="Revenue" value={`₹${stats.revenueToday}`} icon={DollarSign} color="gold" />
      </div>

      {(stats.pendingVerifications > 0 || stats.liveSessions > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-3d p-5 space-y-3"
        >
          <h2 className="text-base font-semibold text-[#5E4B8B] dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Action Required
          </h2>

          {stats.pendingVerifications > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {stats.pendingVerifications} verification{stats.pendingVerifications !== 1 ? "s" : ""} pending
              </span>
              <a
                href="/verification"
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                Review →
              </a>
            </div>
          )}

          {stats.liveSessions > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" />
                {stats.liveSessions} live session{stats.liveSessions !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// BATCH_F3_APPLIED
