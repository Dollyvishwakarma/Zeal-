"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, Video, Phone, MessageCircle } from "lucide-react";

interface Booking {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  user?: { name?: string | null; username: string; avatar?: string | null } | null;
}

interface TodayScheduleProps {
  bookings: Booking[];
  loading?: boolean;
}

export function TodaySchedule({ bookings, loading }: TodayScheduleProps) {
  if (loading) {
    return (
      <div className="glass-card-3d p-5 space-y-3">
        <div className="h-5 w-32 bg-[#E1C5E7] dark:bg-gray-700 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[#F4E8F7] dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 180, damping: 22 }}
      className="glass-card-3d p-4 md:p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#9D7DC5]" /> Today's Schedule
        </h2>
        <Link
          href="/consultant/bookings"
          className="text-xs text-[#9D7DC5] hover:underline"
        >
          View all →
        </Link>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-8 text-[#B8A1D9] dark:text-gray-400 text-sm">
          No bookings scheduled for today
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b, idx) => {
            const time = new Date(b.scheduledAt);
            const canJoin = b.status === "CONFIRMED" || b.status === "IN_PROGRESS";
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#FDFBF7] dark:bg-gray-800/50 hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-center flex-shrink-0">
                  <p className="text-sm font-bold text-[#5E4B8B] dark:text-white">
                    {time.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] text-[#B8A1D9]">{b.durationMinutes}m</p>
                </div>

                <div className="w-px h-8 bg-[#E1C5E7] dark:bg-gray-700 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#5E4B8B] dark:text-white truncate">
                    {b.user?.name || b.user?.username || "Client"}
                  </p>
                  <p className="text-xs text-[#B8A1D9] capitalize">
                    {b.status.toLowerCase()}
                  </p>
                </div>

                {canJoin && (
                  <Link
                    href={`/call/${b.id}`}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-xs font-medium"
                  >
                    Join
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// BATCH_F3_APPLIED
