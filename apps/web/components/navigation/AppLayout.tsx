"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { BottomNavBar } from "./BottomNavBar";

export type Profile = {
  id: string;
  role: string;
  name: string;
} | null;

export function AppLayout({
  children,
  user,
  profile,
}: {
  children: React.ReactNode;
  user: any;
  profile: Profile;
}) {
  const pathname = usePathname();
  const hideAppNav = pathname?.startsWith("/consultant");

  return (
    <div className="flex flex-col h-screen-app overflow-hidden bg-white dark:bg-slate-950 w-full relative">
      <Navbar userId={user?.id || null} />

      <main className="flex-1 w-full overflow-y-auto custom-scrollbar pt-20 pb-24">
        {children}
      </main>

      {!hideAppNav && <BottomNavBar />}
    </div>
  );
}