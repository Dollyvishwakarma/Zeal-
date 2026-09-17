import { createClient } from "@zeal/database/server";

/**
 * Returns the authenticated user's ID, or null. Never throws.
 */
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user?.id ?? null;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Dynamic server usage")) return null;
    if (process.env.NODE_ENV === "development") console.warn("[getUserId] Unexpected error:", err);
    return null;
  }
}

/**
 * Full session (user + session object). Never throws.
 */
export async function getServerSession() {
  try {
    const supabase = await createClient();
    if (!supabase) return { user: null, session: null };
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return { user: null, session: null };
    return { user: session?.user ?? null, session: session ?? null };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Dynamic server usage")) {
      return { user: null, session: null };
    }
    if (process.env.NODE_ENV === "development") console.warn("[getServerSession] Unexpected error:", err);
    return { user: null, session: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH SYNC — idempotent, safe to call from signup, login, OAuth, admin login
// ═══════════════════════════════════════════════════════════════════════════════

export type AuthRole =
  | "USER"
  | "CLIENT_ADMIN"
  | "SUPPORT"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "VIEWER";

export interface SyncResult {
  ok: boolean;
  role: AuthRole;
  isNew: boolean;
  redirectTo: string;
  error?: string;
}

function destinationFor(role: AuthRole): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "SUPPORT" || role === "VIEWER") {
    return "/admin";
  }
  if (role === "CLIENT_ADMIN") return "/consultant/dashboard";
  return "/explore";
}

export async function syncAuthUser(): Promise<SyncResult> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return { ok: false, role: "USER", isNew: false, redirectTo: "/login", error: "Supabase admin env not configured" };
    }

    const { createServerClientFromCookies } = await import("@zeal/database/server");
    const userClient = await createServerClientFromCookies();
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return { ok: false, role: "USER", isNew: false, redirectTo: "/login", error: "Unauthorized" };
    }

    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const admin = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = user.email ?? "";
    const username =
      (user.user_metadata?.username as string | undefined) ||
      email.split("@")[0] ||
      `user_${user.id.slice(0, 8)}`;
    const name =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      null;
    const avatar = (user.user_metadata?.avatar_url as string | undefined) ?? null;

    const { data: existingUser } = await admin
      .from("User").select("id, role").eq("id", user.id).maybeSingle();

    let isNew = false;
    let role: AuthRole = "USER";

    if (!existingUser) {
      isNew = true;
      const { data, error } = await admin
        .from("User")
        .insert({
          id: user.id, email, username, name, avatar,
          role: "USER", sparks: 0, isVerified: false, is_online: false,
        })
        .select("role").single();
      if (error) {
        return { ok: false, role: "USER", isNew: false, redirectTo: "/login", error: error.message };
      }
      role = (data?.role as AuthRole) ?? "USER";
    } else {
      await admin.from("User").update({
        email: email || undefined,
        name: name ?? undefined,
        avatar: avatar ?? undefined,
      }).eq("id", user.id);
      role = (existingUser.role as AuthRole) ?? "USER";
    }

    const { data: existingWallet } = await admin
      .from("Wallet").select("id").eq("userId", user.id).maybeSingle();
    if (!existingWallet) {
      await admin.from("Wallet").insert({
        userId: user.id, balance: 0, escrow: 0, pendingIn: 0, pendingOut: 0, blocked: 0,
      });
    }

    const metaRole = (user.app_metadata?.role as string | undefined) ?? "";
    if (metaRole !== role) {
      try {
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { ...(user.app_metadata ?? {}), role },
        });
      } catch (syncErr) {
        console.warn("[syncAuthUser] app_metadata sync failed:", syncErr);
      }
    }

    return { ok: true, role, isNew, redirectTo: destinationFor(role) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sync failed";
    if (process.env.NODE_ENV === "development") console.warn("[syncAuthUser] unexpected:", err);
    return { ok: false, role: "USER", isNew: false, redirectTo: "/login", error: msg };
  }
}
