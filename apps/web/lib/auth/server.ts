// apps/web/lib/auth/server.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Simple Auth (no JWT, Supabase session-based)
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@zeal/database/server";

// ─── Get current user ID ────────────────────────────────────────────────────
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Get full session ───────────────────────────────────────────────────────
export async function getServerSession() {
  try {
    const supabase = await createClient();
    if (!supabase) return { user: null, session: null };
    const { data: { session } } = await supabase.auth.getSession();
    return { user: session?.user ?? null, session: session ?? null };
  } catch {
    return { user: null, session: null };
  }
}

// ─── Simple role check (no JWT) ─────────────────────────────────────────────
export type AuthRole = "USER" | "CONSULTANT" | "ADMIN" | "SUPER_ADMIN";

export async function getCurrentUserRole(): Promise<AuthRole | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check User table directly (simple DB query, no JWT parsing)
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const dbRole = (profile as { role?: string } | null)?.role;

    if (dbRole === "SUPER_ADMIN" || dbRole === "ADMIN") return "ADMIN";
    if (dbRole === "CLIENT_ADMIN" || dbRole === "SUPPORT") return "CONSULTANT";
    return "USER";
  } catch {
    return null;
  }
}

// ─── Sync auth user (idempotent) ────────────────────────────────────────────
export interface SyncResult {
  ok: boolean;
  role: AuthRole;
  isNew: boolean;
  redirectTo: string;
  error?: string;
}

export async function syncAuthUser(): Promise<SyncResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, role: "USER", isNew: false, redirectTo: "/login" };
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from("User")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    let role: AuthRole = "USER";
    let isNew = false;

    if (!existing) {
      // Create new user
      isNew = true;
      const username =
        user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;

      await supabase.from("User").insert({
        id: user.id,
        email: user.email || "",
        username,
        name: user.user_metadata?.full_name || null,
        avatar: user.user_metadata?.avatar_url || null,
        role: "USER",
      });
    } else {
      const dbRole = (existing as { role?: string }).role;
      if (dbRole === "SUPER_ADMIN" || dbRole === "ADMIN") role = "ADMIN";
      else if (dbRole === "CLIENT_ADMIN" || dbRole === "SUPPORT")
        role = "CONSULTANT";
    }

    // Ensure wallet exists
    const { data: wallet } = await supabase
      .from("Wallet")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle();

    if (!wallet) {
      await supabase.from("Wallet").insert({ userId: user.id, balance: 0 });
    }

    // Decide redirect destination based on role
    const redirectTo =
      role === "ADMIN"
        ? "/admin"
        : role === "CONSULTANT"
        ? "/consultant/dashboard"
        : "/explore";

    return { ok: true, role, isNew, redirectTo };
  } catch (err) {
    return {
      ok: false,
      role: "USER",
      isNew: false,
      redirectTo: "/login",
      error: err instanceof Error ? err.message : "sync failed",
    };
  }
}