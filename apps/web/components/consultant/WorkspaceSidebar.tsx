"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Consultant Workspace Navigation
// ─────────────────────────────────────────────────────────────────────────────
// Mobile  (< lg) : bottom tab bar with 5 items + center power toggle
// Desktop (≥ lg) : left sidebar with all 7 items + user card
// Theme   : matches Zeal dark palette (bg-slate-950, #9D7DC5 → #533AFD)
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Calendar, Users, DollarSign,
  Clock, Palette, Settings, LogOut, ExternalLink,
  Menu, X,
} from "lucide-react";
import { cn } from "@zeal/ui";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  mobile?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Pulse",      href: "/consultant/dashboard",    mobile: true },
  { icon: Calendar,        label: "Bookings",   href: "/consultant/bookings",     mobile: true },
  { icon: Users,           label: "Clients",    href: "/consultant/clients",      mobile: true },
  { icon: DollarSign,      label: "Earnings",   href: "/consultant/earnings",     mobile: true },
  { icon: Clock,           label: "Schedule",   href: "/consultant/availability", mobile: false },
  { icon: Palette,         label: "White-Label",href: "/consultant/settings",     mobile: false },
  { icon: Settings,        label: "Settings",   href: "/consultant/settings",     mobile: true },
];

interface WorkspaceSidebarProps {
  user: { name?: string | null; email?: string | null; avatar?: string | null };
  consultant: { status: string; subdomain?: string | null };
  pendingBookings?: number;
}

export function WorkspaceSidebar({ user, consultant, pendingBookings = 0 }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch { /* ignore */ }
    router.push("/login");
  };

  const displayName = user.name || user.email?.split("@")[0] || "Consultant";
  const initial = displayName.charAt(0).toUpperCase();

  // ─── Sidebar content (desktop + mobile drawer) ─────────────────────────────
  const SidebarContent = (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] flex items-center justify-center text-white font-semibold flex-shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs text-slate-400 truncate">
            {consultant.status === "VERIFIED" ? "Verified Guide" : consultant.status}
          </p>
        </div>
      </div>

      {/* Subdomain pill */}
      {consultant.subdomain && consultant.status === "VERIFIED" && (
        <Link
          href={`/white-label/${consultant.subdomain}`}
          target="_blank"
          className="mx-3 mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#9D7DC5]/10 hover:bg-[#9D7DC5]/20 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#9D7DC5]">Your Site</p>
            <p className="text-xs font-medium text-white truncate">
              {consultant.subdomain}.zeal.app
            </p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-[#9D7DC5] flex-shrink-0" />
        </Link>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-[#9D7DC5]/20 to-[#533AFD]/10 text-[#9D7DC5]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.href === "/consultant/bookings" && pendingBookings > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingBookings > 9 ? "9+" : pendingBookings}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Desktop sidebar (fixed left) ─────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col fixed top-0 left-0 w-64 h-screen bg-slate-950 border-r border-white/5 z-30">
        {SidebarContent}
      </aside>

      {/* ─── Mobile: top bar with menu button ─────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950/95 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-4"
           style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
        <span className="text-sm font-bold text-white tracking-wide">Zeal Studio</span>
        <div className="w-9" />
      </div>

      {/* ─── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <aside className="lg:hidden fixed top-0 left-0 z-50 w-72 h-screen bg-slate-950 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {SidebarContent}
          </aside>
        </>
      )}

      {/* ─── Mobile bottom tab bar (5 items) ──────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-slate-950/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around px-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 min-w-[52px] py-1"
            >
              <span
                className={cn(
                  "absolute -top-0.5 w-6 h-0.5 rounded-full transition-all",
                  active ? "bg-[#9D7DC5] opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  active ? "text-[#9D7DC5]" : "text-slate-500"
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wider",
                  active ? "text-[#9D7DC5]" : "text-slate-600"
                )}
              >
                {item.label}
              </span>
              {item.href === "/consultant/bookings" && pendingBookings > 0 && (
                <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingBookings > 9 ? "9+" : pendingBookings}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}