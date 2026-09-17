"use client";

import { useState } from "react";
import { Bell, BellDot, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useAppStore } from "@/lib/store/appStore";

export function NotificationBell() {
  const { notifications, markAllRead, unreadCount } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const count = unreadCount;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors relative"
        aria-label="Notifications"
      >
        {count > 0 ? (
          <>
            <BellDot className="w-5 h-5 text-[#9D7DC5]" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {count > 9 ? "9+" : count}
            </motion.span>
          </>
        ) : (
          <Bell className="w-5 h-5 text-[#B8A1D9] dark:text-gray-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-[#E1C5E7] dark:border-gray-700 z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-[#E1C5E7] dark:border-gray-700">
              <h3 className="font-semibold text-[#5E4B8B] dark:text-white text-sm">
                Notifications
              </h3>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#9D7DC5] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-[#E1C5E7] dark:divide-gray-700">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[#B8A1D9] dark:text-gray-400 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors ${
                      !n.read ? "bg-[#F4E8F7]/50 dark:bg-gray-800/50" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E1C5E7] dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm">
                      {n.type === "chat" ? "💬" : n.type === "call" ? "📞" : n.type === "booking" ? "📅" : n.type === "payment" ? "💳" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#5E4B8B] dark:text-white line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-xs text-[#B8A1D9] dark:text-gray-400">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {n.redirectUrl && (
                      <Link
                        href={n.redirectUrl}
                        onClick={() => setIsOpen(false)}
                        className="text-xs text-[#9D7DC5] hover:underline self-center"
                      >
                        View
                      </Link>
                    )}
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#9D7DC5] self-center" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// BATCH_F1_APPLIED
