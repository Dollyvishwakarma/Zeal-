"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw, Trash2, Filter, Wifi } from "lucide-react";
import { getRecentLogs, clearLogs, type LogEntry, type LogChannel } from "@/lib/logger";

const CHANNEL_COLORS: Record<string, string> = {
  api: "text-purple-500",
  page: "text-blue-500",
  realtime: "text-cyan-500",
  db: "text-indigo-500",
  ai: "text-pink-500",
  auth: "text-amber-500",
  wallet: "text-green-500",
  booking: "text-yellow-500",
  call: "text-teal-500",
  admin: "text-red-500",
  system: "text-gray-500",
};

const LEVEL_BG: Record<string, string> = {
  debug: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  info: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warn: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterChannel, setFilterChannel] = useState<LogChannel | "all">("all");
  const [filterLevel, setFilterLevel] = useState<"all" | "debug" | "info" | "warn" | "error">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [realtime, setRealtime] = useState(false);

  // Poll in-memory buffer every second
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLogs(getRecentLogs().reverse());
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    setLogs(getRecentLogs().reverse());
  }, []);

  // Realtime indicator
  useEffect(() => {
    try {
      import("@/lib/realtime/supabase-realtime").then(({ getSupabaseRealtimeClient }) => {
        const sb = getSupabaseRealtimeClient();
        setRealtime(!!sb);
      });
    } catch {
      setRealtime(false);
    }
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterChannel !== "all" && l.channel !== filterChannel) return false;
      if (filterLevel !== "all" && l.level !== filterLevel) return false;
      return true;
    });
  }, [logs, filterChannel, filterLevel]);

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of logs) {
      counts[l.channel] = (counts[l.channel] || 0) + 1;
    }
    return counts;
  }, [logs]);

  const levelCounts = useMemo(() => {
    const counts = { debug: 0, info: 0, warn: 0, error: 0 };
    for (const l of logs) {
      counts[l.level]++;
    }
    return counts;
  }, [logs]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-[#9D7DC5]" />
          <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">
            Live Debug Logs
          </h1>
          {realtime && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Wifi className="w-3 h-3" /> Realtime Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              autoRefresh
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {autoRefresh ? "● Auto-refresh ON" : "○ Auto-refresh OFF"}
          </button>
          <button
            onClick={() => setLogs(getRecentLogs().reverse())}
            className="p-2 rounded-lg hover:bg-[#F4E8F7] dark:hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              clearLogs();
              setLogs([]);
            }}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card-3d p-3">
          <p className="text-xs text-[#B8A1D9]">Total logs</p>
          <p className="text-xl font-bold text-[#5E4B8B] dark:text-white">{logs.length}</p>
        </div>
        <div className="glass-card-3d p-3">
          <p className="text-xs text-[#B8A1D9]">Errors</p>
          <p className="text-xl font-bold text-red-500">{levelCounts.error}</p>
        </div>
        <div className="glass-card-3d p-3">
          <p className="text-xs text-[#B8A1D9]">Warnings</p>
          <p className="text-xl font-bold text-yellow-500">{levelCounts.warn}</p>
        </div>
        <div className="glass-card-3d p-3">
          <p className="text-xs text-[#B8A1D9]">Channels</p>
          <p className="text-xl font-bold text-[#9D7DC5]">{Object.keys(channelCounts).length}</p>
        </div>
      </div>

      {/* Channel pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterChannel("all")}
          className={`px-3 py-1 rounded-lg text-xs font-medium ${
            filterChannel === "all"
              ? "bg-[#9D7DC5] text-white"
              : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700"
          }`}
        >
          All ({logs.length})
        </button>
        {Object.entries(channelCounts).map(([ch, count]) => (
          <button
            key={ch}
            onClick={() => setFilterChannel(ch as LogChannel)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              filterChannel === ch
                ? "bg-[#9D7DC5] text-white"
                : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700"
            }`}
          >
            <span className={CHANNEL_COLORS[ch] || "text-gray-500"}>[{ch}]</span> {count}
          </button>
        ))}
      </div>

      {/* Level filter */}
      <div className="flex gap-2">
        {(["all", "debug", "info", "warn", "error"] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilterLevel(lvl)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              filterLevel === lvl
                ? "bg-[#9D7DC5] text-white"
                : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700"
            }`}
          >
            {lvl === "all" ? "All levels" : lvl.toUpperCase()}
            {lvl !== "all" && ` (${levelCounts[lvl]})`}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="glass-card-3d p-0 overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[#B8A1D9]">
              No logs yet. Interact with the app to generate logs.
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.005, 0.3) }}
                className="border-b border-[#E1C5E7] dark:border-gray-800 p-3 hover:bg-[#F4E8F7] dark:hover:bg-gray-800/50"
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-[#B8A1D9]">
                    {new Date(entry.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${LEVEL_BG[entry.level]}`}>
                    {entry.level.toUpperCase()}
                  </span>
                  <span className={`font-bold ${CHANNEL_COLORS[entry.channel] || "text-gray-500"}`}>
                    [{entry.channel}]
                  </span>
                  <span className="text-[#5E4B8B] dark:text-white font-medium">
                    {entry.event}
                  </span>
                  {entry.durationMs !== undefined && (
                    <span className="text-[#9D7DC5]">{entry.durationMs}ms</span>
                  )}
                  {entry.requestId && (
                    <span className="text-[#B8A1D9]">req={entry.requestId.slice(0, 8)}</span>
                  )}
                </div>

                {entry.message && (
                  <p className="mt-1 text-[#5E4B8B] dark:text-white">{entry.message}</p>
                )}

                {entry.data && (
                  <pre className="mt-1 text-[10px] text-[#B8A1D9] whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}

                {entry.error && (
                  <div className="mt-1 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    <span className="font-bold">{entry.error.name}:</span> {entry.error.message}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
