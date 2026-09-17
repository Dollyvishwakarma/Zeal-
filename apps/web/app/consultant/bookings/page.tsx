"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, User, IndianRupee, Loader2 } from "lucide-react";
import { getBrowserClient } from "@zeal/database";

interface Booking {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  amount: number;
  userName: string | null;
}

export default function ConsultantBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  useEffect(() => {
    let cancelled = false;

    // Initial fetch
    fetch("/api/consultant/bookings")
      .then((r) => r.ok ? r.json() : { bookings: [] })
      .then((data) => {
        if (!cancelled) setBookings(data.bookings ?? []);
      })
      .finally(() => !cancelled && setLoading(false));

    // Realtime updates
    const supabase = supabaseRef.current;
    if (supabase) {
      const channel = supabase
        .channel("consultant_bookings")
        .on("broadcast", { event: "booking_updated" }, (payload: any) => {
          const updated = payload.payload as Booking;
          if (!updated?.id) return;
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          );
        })
        .subscribe();

      return () => {
        cancelled = true;
        try { supabase.removeChannel(channel); } catch { /* ignore */ }
      };
    }

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#9D7DC5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-black text-white">Bookings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your incoming and upcoming sessions</p>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No bookings yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/chat/${b.id}`}
              className="block p-4 lg:p-5 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl hover:border-[#9D7DC5]/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center text-[#9D7DC5] flex-shrink-0">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {b.userName || "Seeker"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(b.scheduledAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {b.durationMinutes}m
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#9D7DC5] font-bold text-sm flex items-center gap-1">
                    <IndianRupee size={12} />
                    {b.amount}
                  </p>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1 block">
                    {b.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}