"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, UserCog, Calendar, Phone, Video,
  Wallet, CreditCard, Settings, LogOut, Shield, BarChart3,
  Megaphone, Menu, X, UserPlus,
} from "lucide-react";
import { cn } from "@zeal/ui";
import { useAuth } from "@/components/providers/SupabaseAuthProvider";
import { useAdminStore, type AdminRole } from "@/lib/store/adminStore";
import { Avatar, AvatarImage, AvatarFallback } from "@zeal/ui";

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  minRole: AdminRole;
}

const ROLE_LEVEL: Record<AdminRole, number> = {
  VIEWER: 10,
  SUPPORT: 50,
  ADMIN: 80,
  SUPER_ADMIN: 100,
};

const NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",   href: "/dashboard",    minRole: "VIEWER" },
  { icon: BarChart3,       label: "Analytics",   href: "/analytics",    minRole: "VIEWER" },
  { icon: Users,           label: "Users",       href: "/users",        minRole: "ADMIN" },
  { icon: UserCog,         label: "Consultants", href: "/consultants",  minRole: "ADMIN" },
  { icon: Shield,          label: "Verification",href: "/verification", minRole: "ADMIN" },
  { icon: Calendar,        label: "Bookings",    href: "/bookings",     minRole: "SUPPORT" },
  { icon: Phone,           label: "Calls",       href: "/calls",        minRole: "SUPPORT" },
  { icon: Video,           label: "Recordings",  href: "/recordings",   minRole: "SUPPORT" },
  { icon: Wallet,          label: "Wallet",      href: "/wallet",       minRole: "SUPPORT" },
  { icon: CreditCard,      label: "Withdrawals", href: "/withdrawals",  minRole: "ADMIN" },
  { icon: Megaphone,       label: "Broadcast",   href: "/broadcast",    minRole: "ADMIN" },
  { icon: UserPlus,        label: "Admins",      href: "/settings/admins", minRole: "SUPER_ADMIN" },
  { icon: Settings,        label: "Settings",    href: "/settings",     minRole: "SUPER_ADMIN" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const profile = useAdminStore((s) => s.profile);
  const setProfile = useAdminStore((s) => s.setProfile);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync profile from auth user (role + email + name)
  useEffect(() => {
    if (!user) return;
    const role = (user.app_metadata?.role as AdminRole | undefined) || "VIEWER";
    setProfile({
      id: user.id,
      email: user.email || "",
      role,
      name: (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Admin",
      avatar: (user.user_metadata?.avatar_url as string | undefined) || null,
      createdAt: user.created_at || new Date().toISOString(),
    });
  }, [user, setProfile]);

  const role = profile?.role ?? "VIEWER";
  const visible = NAV.filter((item) => ROLE_LEVEL[role] >= ROLE_LEVEL[item.minRole]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E1C5E7] dark:border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] bg-clip-text text-transparent">
            Zeal Admin
          </span>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-[#F4E8F7] dark:hover:bg-gray-800" aria-label="Close menu">
          <X className="w-5 h-5 text-[#5E4B8B] dark:text-white" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visible.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                isActive
                  ? "bg-[#9D7DC5]/20 text-[#9D7DC5] dark:bg-gray-800 dark:text-white"
                  : "text-[#5E4B8B] dark:text-gray-300 hover:bg-[#F4E8F7] dark:hover:bg-gray-800",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E1C5E7] dark:border-gray-800 space-y-3">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[#F4E8F7]/50 dark:bg-gray-800/50">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar || undefined} alt={profile?.name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] text-white">
              {(profile?.name || profile?.email || "A")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#5E4B8B] dark:text-white truncate">{profile?.name || "Admin"}</p>
            <p className="text-xs text-[#B8A1D9] truncate">{role.replace("_", " ")}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-800 shadow-sm" aria-label="Open menu">
        <Menu className="w-5 h-5 text-[#5E4B8B] dark:text-white" />
      </button>

      <aside className="hidden lg:flex fixed top-0 left-0 z-30 w-64 h-screen bg-white dark:bg-gray-900 border-r border-[#E1C5E7] dark:border-gray-800">
        {content}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="lg:hidden fixed top-0 left-0 z-50 w-72 h-screen bg-white dark:bg-gray-900">
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

