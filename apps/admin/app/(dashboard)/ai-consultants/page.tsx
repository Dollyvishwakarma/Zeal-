"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Wifi, Search } from "lucide-react";
import { getSupabaseRealtimeClient } from "@/lib/realtime/supabase-realtime";

interface AiConsultant {
  id: string;
  name: string;
  username: string;
  avatar: string;
  category: string;
  isPaid: boolean;
  perMinuteRate: number;
  rating: number;
  isActive: boolean;
  isFeatured: boolean;
}

export default function AdminAiConsultantsPage() {
  const [items, setItems] = useState<AiConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/ai-consultants", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    const sb = getSupabaseRealtimeClient();
    if (!sb) return;

    setIsRealtime(true);

    const channel = sb
      .channel("admin-ai-consultants-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "AIConsultant" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT") {
            setItems((prev) => [newRow as AiConsultant, ...prev]);
          } else if (eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((x) => (x.id === (newRow as AiConsultant).id ? (newRow as AiConsultant) : x)),
            );
          } else if (eventType === "DELETE") {
            setItems((prev) => prev.filter((x) => x.id !== (oldRow as AiConsultant).id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setIsRealtime(false);
      });

    return () => {
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, []);

  const filtered = items.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        <p>Failed to load: {error}</p>
        <button onClick={load} className="mt-2 text-[#9D7DC5] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#9D7DC5]" /> AI Consultants
        </h1>
        <div className="flex items-center gap-3">
          {isRealtime && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Wifi className="w-3 h-3" /> Live
            </span>
          )}
          <span className="text-sm text-[#B8A1D9]">{items.length} profiles</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8A1D9]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or category..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E1C5E7] dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-[#5E4B8B] dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.03, 0.3) }}
            className="glass-card-3d p-4"
          >
            <div className="flex items-center gap-3">
              <img
                src={c.avatar}
                alt={c.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#5E4B8B] dark:text-white truncate">
                  {c.name}
                </p>
                <p className="text-xs text-[#B8A1D9] capitalize">
                  {c.category.toLowerCase()}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                  c.isActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {c.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-yellow-500">⭐ {c.rating.toFixed(1)}</span>
              <span className="text-[#9D7DC5]">
                {c.isPaid ? `₹${c.perMinuteRate}/min` : "Free"}
              </span>
              {c.isFeatured && (
                <span className="text-amber-500 text-[10px]">Featured</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && items.length > 0 && (
        <p className="text-center py-8 text-[#B8A1D9]">
          No consultants match "{search}"
        </p>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-[#B8A1D9]">
          <p>No AI consultants found in the database.</p>
          <p className="text-xs mt-2">
            Run the seed SQL to populate AI consultants.
          </p>
        </div>
      )}
    </div>
  );
}
