"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, Clock, Video, Phone, MessageCircle, MapPin, Star } from "lucide-react";
import { formatCurrency } from "@zeal/utils";

export interface BookingSummary {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  amount: number;
  meetingLink?: string | null;
  consultant: {
    id: string;
    category: string;
    user: { name?: string | null; username: string; avatar?: string | null };
  };
  user?: { name?: string | null; username: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MISSED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface BookingCardProps {
  booking: BookingSummary;
  role?: "user" | "consultant";
  index?: number;
}

export function BookingCard({ booking, role = "user", index = 0 }: BookingCardProps) {
  const consultant = booking.consultant;
  const otherParty = role === "user" ? consultant.user : booking.user;
  const otherName = otherParty?.name || otherParty?.username || "—";

  const scheduledDate = new Date(booking.scheduledAt);
  const isUpcoming = scheduledDate.getTime() > Date.now();
  const canJoin =
    booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS";
  const canCancel =
    (booking.status === "PENDING" || booking.status === "CONFIRMED") && isUpcoming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), type: "spring", stiffness: 180, damping: 22 }}
      className="glass-card-3d p-4 md:p-5"
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center flex-shrink-0 text-lg font-semibold text-[#9D7DC5]">
          {otherName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="font-semibold text-[#5E4B8B] dark:text-white truncate">
                {otherName}
              </p>
              <p className="text-xs text-[#B8A1D9] dark:text-gray-400 capitalize">
                {consultant.category.toLowerCase()}
              </p>
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                STATUS_STYLES[booking.status] || STATUS_STYLES.COMPLETED
              }`}
            >
              {booking.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#B8A1D9] dark:text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {scheduledDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {scheduledDate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              {booking.durationMinutes} min
            </span>
            <span className="font-medium text-[#9D7DC5]">
              {formatCurrency(booking.amount)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {canJoin && (
              <Link
                href={`/call/${booking.id}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-xs font-medium"
              >
                <Phone className="w-3 h-3" /> Join
              </Link>
            )}
            <Link
              href={`/chat/${consultant.id}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white text-xs font-medium"
            >
              <MessageCircle className="w-3 h-3" /> Chat
            </Link>
            {canCancel && (
              <button
                onClick={async () => {
                  if (!confirm("Cancel this booking? Refunds may apply.")) return;
                  const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
                    method: "POST",
                  });
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    alert("Failed to cancel booking");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium"
              >
                Cancel
              </button>
            )}
            {booking.status === "COMPLETED" && (
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white text-xs font-medium">
                <Star className="w-3 h-3" /> Review
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// BATCH_F2_APPLIED
