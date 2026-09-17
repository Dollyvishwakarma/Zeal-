"use client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, UserCog, Calendar, DollarSign, Radio, AlertCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Stats {
  users: number;
  consultants: number;
  bookings: number;
  revenueToday: number;
  revenueMonth: number;
  liveSessions: number;
  pendingVerifications: number;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const stats = data || {
    users: 0, consultants: 0, bookings: 0,
    revenueToday: 0, revenueMonth: 0,
    liveSessions: 0, pendingVerifications: 0,
  };

  // Derived chart series (last 7 days, placeholder until time-series endpoint lands)
  const chart = [
    { day: "Mon", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Tue", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Wed", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Thu", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Fri", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Sat", revenue: Math.round(stats.revenueMonth / 30) },
    { day: "Sun", revenue: Math.round(stats.revenueMonth / 30) },
  ];

  const cards = [
    { label: "Users",        value: stats.users,          icon: Users,         color: "text-blue-600" },
    { label: "Consultants",  value: stats.consultants,    icon: UserCog,       color: "text-purple-600" },
    { label: "Bookings",     value: stats.bookings,       icon: Calendar,      color: "text-green-600" },
    { label: "Revenue (mo)", value: "₹" + stats.revenueMonth, icon: DollarSign, color: "text-yellow-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, idx) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="glass-card-3d p-4">
            <div className="flex items-center justify-between mb-2">
              <c.icon className={"w-5 h-5 " + c.color} />
            </div>
            <p className="text-xs text-[#B8A1D9]">{c.label}</p>
            <p className="text-2xl font-bold text-[#5E4B8B] dark:text-white mt-1">
              {isLoading ? "—" : c.value}
            </p>
          </motion.div>
        ))}
      </div>

      {(stats.pendingVerifications > 0 || stats.liveSessions > 0) && (
        <div className="glass-card-3d p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#5E4B8B] dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Action Required
          </h2>
          {stats.pendingVerifications > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <span className="text-sm text-amber-700 dark:text-amber-400">{stats.pendingVerifications} verification(s) pending</span>
              <a href="/verification" className="text-xs text-amber-700 hover:underline font-medium">Review →</a>
            </div>
          )}
          {stats.liveSessions > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Radio className="w-3 h-3 animate-pulse" /> {stats.liveSessions} live session(s)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="glass-card-3d p-5">
        <h2 className="text-base font-semibold text-[#5E4B8B] dark:text-white mb-4">Revenue Overview</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E1C5E7" />
              <XAxis dataKey="day" stroke="#B8A1D9" />
              <YAxis stroke="#B8A1D9" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E1C5E7" }} />
              <Line type="monotone" dataKey="revenue" stroke="#9D7DC5" strokeWidth={2} dot={{ fill: "#9D7DC5" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

