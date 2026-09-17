'use client';
import { useState } from 'react';
import { Bell, BellDot, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAdminStore } from '@/lib/store/adminStore';

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useAdminStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 transition-colors relative"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="w-5 h-5 text-[#9D7DC5]" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
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
            className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-y-auto glass-card-3d z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10 dark:border-gray-700/30">
              <h3 className="font-semibold text-[#5E4B8B] dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#9D7DC5] hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="divide-y divide-white/10 dark:divide-gray-700/30">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[#B8A1D9] dark:text-gray-400">No notifications</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-white/10 dark:hover:bg-gray-800/50 transition-colors ${!n.read ? 'bg-[#9D7DC5]/10' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#9D7DC5]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg">
                        {n.type === 'chat' ? '💬' : n.type === 'call' ? '📞' : n.type === 'booking' ? '📅' : '🔔'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#5E4B8B] dark:text-white">{n.message}</p>
                      <p className="text-xs text-[#B8A1D9] dark:text-gray-400">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && (
                      <button className="p-1 rounded-full hover:bg-white/20 transition-colors">
                        <Check className="w-4 h-4 text-[#9D7DC5]" />
                      </button>
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
