"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { syncAuthUser } from "@/lib/auth/server";
import { checkRateLimit, authLimiter } from "@/lib/rate-limit";

// ─── Supabase clients ─────────────────────────────────────────────────────────
async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (err) {
            console.error("[COOKIE_SET_ERROR]", err);
          }
        },
      },
    }
  );
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Request metadata ─────────────────────────────────────────────────────────
async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim() || "unknown";
    return h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Auth attempt logging (feeds is_locked_out RPC) ───────────────────────────
async function recordAuthAttempt(params: {
  email: string;
  ip: string;
  success: boolean;
  reason?: string;
}) {
  const admin = getAdminSupabase();
  if (!admin) return;
  try {
    await admin.from("auth_attempts").insert({
      email: params.email.toLowerCase(),
      ip: params.ip,
      success: params.success,
      reason: params.reason ?? null,
    });
  } catch (err) {
    console.warn("[auth-attempts] log failed:", err);
  }
}

// ─── Lockout check (reads auth_attempts via RPC) ──────────────────────────────
async function checkLockout(email: string): Promise<boolean> {
  const admin = getAdminSupabase();
  if (!admin) return false;
  try {
    const { data, error } = await admin.rpc("is_locked_out", {
      p_email: email.toLowerCase(),
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

// ─── Audit event writer ───────────────────────────────────────────────────────
async function writeAudit(params: {
  category: string;
  action: string;
  outcome: "SUCCESS" | "FAILURE" | "DENIED";
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getAdminSupabase();
  if (!admin) return;
  try {
    const ipForDb =
      params.ip && params.ip !== "unknown" && params.ip.length > 0
        ? params.ip
        : null;
    await admin.from("audit_events").insert({
      event_category: params.category,
      event_action: params.action,
      event_outcome: params.outcome,
      actor_id: params.actorId ?? null,
      actor_email: params.actorEmail ?? null,
      actor_role: params.actorRole ?? null,
      ip_address: ipForDb,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.warn("[audit] write failed:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
export async function loginAction(formData: FormData): Promise<{
  success: boolean;
  destination?: string;
  error?: string;
}> {
  const ip = await getClientIp();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const customRedirect = formData.get("redirectTo") as string | null;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  // ─── Rate limit (5/min per email) ──────────────────────────────────────
  const rl = await checkRateLimit(authLimiter, `auth:${email}`);
  if (!rl.ok) {
    await writeAudit({
      category: "AUTHENTICATION",
      action: "login_ratelimited",
      outcome: "DENIED",
      actorEmail: email,
      ip,
      metadata: { reason: "rate_limit", retryAfter: rl.retryAfter },
    });
    return {
      success: false,
      error: "Too many attempts. Please wait a minute and try again.",
    };
  }

  // ─── Lockout check (10 failures in 15 min → locked) ────────────────────
  const locked = await checkLockout(email);
  if (locked) {
    await writeAudit({
      category: "AUTHENTICATION",
      action: "login_locked",
      outcome: "DENIED",
      actorEmail: email,
      ip,
      metadata: { reason: "lockout" },
    });
    return {
      success: false,
      error: "Account temporarily locked due to failed attempts. Try again in 15 minutes.",
    };
  }

  try {
    const supabase = await getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const reason = authError?.message || "invalid_credentials";
      await recordAuthAttempt({ email, ip, success: false, reason });
      await writeAudit({
        category: "AUTHENTICATION",
        action: "login",
        outcome: "FAILURE",
        actorEmail: email,
        ip,
        metadata: { reason },
      });
      return { success: false, error: reason };
    }

    // Success — log attempt
    await recordAuthAttempt({ email, ip, success: true });

    // Sync user/wallet/role
    const sync = await syncAuthUser();
    if (!sync.ok) {
      await writeAudit({
        category: "AUTHENTICATION",
        action: "login_sync_failed",
        outcome: "FAILURE",
        actorId: authData.user.id,
        actorEmail: email,
        ip,
        metadata: { error: sync.error },
      });
      return { success: false, error: sync.error ?? "Session sync failed." };
    }

    // Audit success
    await writeAudit({
      category: "AUTHENTICATION",
      action: "login",
      outcome: "SUCCESS",
      actorId: authData.user.id,
      actorEmail: email,
      actorRole: sync.role,
      ip,
      metadata: { isNew: sync.isNew },
    });

    // Routing
    const safeCustom =
      customRedirect &&
      customRedirect !== "/" &&
      customRedirect !== "/login" &&
      customRedirect !== "/auth/login";

    const destination =
      sync.role === "USER" && safeCustom ? customRedirect! : sync.redirectTo;

    return { success: true, destination };
  } catch (err) {
    const message = err instanceof Error ? err.message : "login failed";
    await recordAuthAttempt({ email, ip, success: false, reason: message });
    await writeAudit({
      category: "AUTHENTICATION",
      action: "login",
      outcome: "FAILURE",
      actorEmail: email,
      ip,
      metadata: { error: message },
    });
    console.error("[LOGIN_ACTION_ERROR]", err);
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════════════════════════
export async function registerAction(formData: FormData): Promise<{
  success: boolean;
  destination?: string;
  error?: string;
}> {
  const ip = await getClientIp();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const accountType = (formData.get("accountType") as string) || "user";

  if (!email || !password || !fullName) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 12) {
    return { success: false, error: "Password must be at least 12 characters." };
  }

  // Rate limit — prevents signup spam from same IP
  const rl = await checkRateLimit(authLimiter, `register:${ip}`);
  if (!rl.ok) {
    await writeAudit({
      category: "AUTHENTICATION",
      action: "register_ratelimited",
      outcome: "DENIED",
      actorEmail: email,
      ip,
      metadata: { retryAfter: rl.retryAfter },
    });
    return { success: false, error: "Too many signup attempts. Try again in a minute." };
  }

  try {
    const supabase = await getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      const reason = authError?.message || "signup_failed";
      await writeAudit({
        category: "AUTHENTICATION",
        action: "register",
        outcome: "FAILURE",
        actorEmail: email,
        ip,
        metadata: { reason, accountType },
      });
      return { success: false, error: reason };
    }

    // Sync — creates User + Wallet (role: USER enforced server-side)
    const sync = await syncAuthUser();

    await writeAudit({
      category: "AUTHENTICATION",
      action: "register",
      outcome: "SUCCESS",
      actorId: authData.user.id,
      actorEmail: email,
      actorRole: sync.role,
      ip,
      metadata: { accountType, isNew: sync.isNew },
    });

    const destination =
      accountType === "consultant" ? "/apply" : sync.redirectTo || "/explore";

    return { success: true, destination };
  } catch (err) {
    const message = err instanceof Error ? err.message : "register failed";
    await writeAudit({
      category: "AUTHENTICATION",
      action: "register",
      outcome: "FAILURE",
      actorEmail: email,
      ip,
      metadata: { error: message },
    });
    console.error("[REGISTER_ACTION_ERROR]", err);
    return { success: false, error: "An unexpected error occurred during registration." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN OUT
// ═══════════════════════════════════════════════════════════════════════════════
export async function signOutAction() {
  const ip = await getClientIp();
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.auth.signOut();

    await writeAudit({
      category: "AUTHENTICATION",
      action: "logout",
      outcome: "SUCCESS",
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      ip,
    });
  } catch (error) {
    console.error("[SIGNOUT_ERROR]", error);
  }
  redirect("/login");
}
