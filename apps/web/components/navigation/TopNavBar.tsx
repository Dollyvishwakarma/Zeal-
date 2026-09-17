"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Bell, IndianRupee, Sparkles, UserCircle } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import { usePathname } from "next/navigation";

export function TopNavBar({ userId, initialBalance }: { userId: string | null; initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [isDark, setIsDark] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (!userId) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('wallet_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
        (payload) => {
          if (payload.new && payload.new.wallet_balance !== undefined) setBalance(payload.new.wallet_balance);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 sm:h-20 bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-3 sm:px-8 shadow-sm transition-all">
      
      {/* LEFT: 3D Theme Toggle */}
      <div className="flex-1 flex items-center">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="btn-3d w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center text-slate-300 relative overflow-hidden active:scale-90 transition-transform"
          title="Toggle Theme"
        >
          <div className="absolute inset-0 bg-white/5 rounded-full pointer-events-none" />
          {isDark ? <Moon size={18} className="drop-shadow-lg" /> : <Sun size={18} className="drop-shadow-lg text-amber-400" />}
        </button>
      </div>

      {/* CENTER: Premium 3D Logo */}
      <div className="flex-1 flex justify-center">
        <Link href="/" className="relative flex items-center justify-center group no-tap-highlight hover:scale-105 transition-transform duration-300">
          <div className="absolute w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/20 blur-xl rounded-full group-hover:bg-purple-500/40 transition-all duration-500 pointer-events-none" />
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-purple-600 text-3d relative z-10">
            Zeal
          </h1>
        </Link>
      </div>

      {/* RIGHT: Real-Time Wallet / Auth Gateway */}
      <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4">
        {userId ? (
          <>
            <Link href="/wallet" className="btn-3d hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 border border-emerald-500/50 text-white relative overflow-hidden group active:scale-95 transition-transform">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <IndianRupee size={16} className="drop-shadow-md" />
              <span className="font-black text-sm tracking-wide drop-shadow-md">{Number(balance).toFixed(2)}</span>
            </Link>
            
            <button className="btn-3d w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center text-slate-300 relative active:scale-90 transition-transform">
              <Bell size={18} className="drop-shadow-lg" />
              <span className="absolute top-2 right-2 sm:top-3 sm:right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </button>
          </>
        ) : (
          <Link href={`/login?redirectedFrom=${pathname}`} className="btn-3d flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-500/50 text-white relative overflow-hidden group active:scale-95 transition-transform">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <UserCircle size={16} className="drop-shadow-md" />
            <span className="font-black text-xs sm:text-sm tracking-wide drop-shadow-md">Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
