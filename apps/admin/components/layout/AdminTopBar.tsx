"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useAdminStore } from "@/lib/store/adminStore";

export function AdminTopBar() {
  const { theme, setTheme } = useTheme();
  const connectionState = useAdminStore((s) => s.isSocketConnected);
  const profile = useAdminStore((s) => s.profile);

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-[#E1C5E7] dark:border-gray-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <h1 className="text-base font-semibold text-[#5E4B8B] dark:text-white">
          {profile?.role ? profile.role.replace("_", " ") + " Console" : "Console"}
        </h1>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full",
              connectionState
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
            )}
            aria-label={connectionState ? "Realtime connected" : "Realtime offline"}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", connectionState ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
            {connectionState ? "Live" : "Offline"}
          </span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-[#F4E8F7] dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-[#9D7DC5]" /> : <Moon className="w-5 h-5 text-[#9D7DC5]" />}
          </button>
        </div>
      </div>
    </header>
  );
}

import { cn } from "@zeal/ui";

