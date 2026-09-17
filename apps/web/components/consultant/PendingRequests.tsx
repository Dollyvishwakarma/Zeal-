"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ChevronRight } from "lucide-react";

interface PendingRequestsProps {
  count: number;
  loading?: boolean;
}

export function PendingRequests({ count, loading }: PendingRequestsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 22 }}
      className="glass-card-3d p-4 md:p-5"
    >
      <h2 className="text-base md:text-lg font-semibold text-[#5E4B8B] dark:text-white flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-amber-500" /> Pending Requests
      </h2>

      {loading ? (
        <div className="h-16 rounded-xl bg-[#F4E8F7] dark:bg-gray-800 animate-pulse" />
      ) : count === 0 ? (
        <p className="text-sm text-[#B8A1D9] dark:text-gray-400 text-center py-6">
          You're all caught up ✨
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 mb-3">
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {count}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500">
                {count === 1 ? "request waiting" : "requests waiting"}
              </p>
            </div>
          </div>

          <Link
            href="/consultant/bookings?filter=pending"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F4E8F7] dark:bg-gray-800 hover:bg-[#E1C5E7] dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-sm font-medium text-[#5E4B8B] dark:text-white">
              Review requests
            </span>
            <ChevronRight className="w-4 h-4 text-[#9D7DC5]" />
          </Link>
        </>
      )}
    </motion.div>
  );
}

// BATCH_F3_APPLIED
