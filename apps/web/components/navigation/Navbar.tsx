"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, UserCircle, Menu, X, Home, Users, Bot,
  Calendar, MessageCircle, User, LogOut, Wallet
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const MENU_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/experts", label: "Experts", icon: Users },
  { href: "/experts?tab=ai", label: "AI Consultants", icon: Bot },
  { href: "/bookings", label: "Bookings", icon: Calendar },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navbar({ userId }: { userId: string | null }) {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    const base = href.split("?")[0] || "/";
    if (base === "/") return pathname === "/";
    return pathname.startsWith(base);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
          
          {/* LEFT: Logo */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-purple-600 via-purple-500 to-purple-800 dark:from-white dark:via-purple-200 dark:to-purple-600">
                Zeal
              </h1>
            </Link>
          </div>

          {/* CENTER: Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    active
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT: Auth */}
          <div className="flex items-center gap-2">
            {userId ? (
              <>
                <Link
                  href="/wallet"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold"
                >
                  <Wallet size={14} />
                  0.00
                </Link>
                <button className="relative w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                </button>
                <Link
                  href="/profile"
                  className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white"
                >
                  <UserCircle size={18} />
                </Link>
              </>
            ) : (
              <Link
                href={`/login?redirectedFrom=${pathname}`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white text-sm font-bold"
              >
                <UserCircle size={15} />
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <nav
        className={`fixed top-16 right-0 bottom-0 z-50 w-64 max-w-[80vw] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-white/10 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  active
                    ? "bg-purple-600 text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

          {userId && (
            <form action="/auth/signout" method="post" className="pt-4 border-t border-slate-200 dark:border-white/10 mt-4">
              <button
                type="submit"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 w-full"
              >
                <LogOut size={18} />
                Logout
              </button>
            </form>
          )}
        </div>
      </nav>
    </>
  );
}