"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TopNavBar } from "./TopNavBar";
import { BottomNavBar } from "./BottomNavBar";

export type Profile = {
  id: string;
  role: string;
  wallet_balance: number;
  full_name: string;
  avatar_url: string | null;
} | null;

export function AppLayout({ children, user, profile }: { children: React.ReactNode, user: any, profile: Profile }) {
  const balance = profile?.wallet_balance || 0;
  const pathname = usePathname();
  const hideAppNav = pathname?.startsWith("/consultant");

  return (
    <div className="flex flex-col h-screen-app overflow-hidden bg-slate-950 w-full relative">
      {/* 1. Fixed Top Bar */}
      <TopNavBar userId={user?.id || null} initialBalance={balance} />
      
      {/* 2. Scrollable Content Area (Padding applied to prevent clipping under fixed bars) */}
      <main className="flex-1 w-full overflow-y-auto custom-scrollbar pt-20 pb-24">
        {children}
      </main>

      {/* 3. Fixed Bottom Bar */}
      {!hideAppNav && <BottomNavBar />}
    </div>
  );
}
