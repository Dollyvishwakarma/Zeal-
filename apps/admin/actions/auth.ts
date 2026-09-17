"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"];

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
          } catch {
            /* RSC — safe */
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

// ─── Attempt logging + lockout + audit ────────────────────────────────────────
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
    console.warn("[admin-auth-attempts] log failed:", err);
  }
}

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
    console.warn("[admin-audit] write failed:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
export async function adminLoginAction(formData: FormData) {
  const ip = await getClientIp();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Credentials required." };
  }

  // Rate limit — 5/min per email (local implementation)
  // Note: admin app is separate; uses its own rate limiting path
  const rlKey = `admin-auth:${email}`;
  // Inline simple in-memory would not work across Lambda — rely on Supabase
  // For now, use the is_locked_out RPC as the primary defense

  // Lockout check
  const locked = await checkLockout(email);
  if (locked) {
    await writeAudit({
      category: "AUTHENTICATION",
      action: "admin_login_locked",
      outcome: "DENIED",
      actorEmail: email,
      ip,
      metadata: { portal: "admin", reason: "lockout" },
    });
    return {
      success: false,
      error: "Account locked due to failed attempts. Try again in 15 minutes.",
    };
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const reason = error?.message || "invalid_credentials";
      await recordAuthAttempt({ email, ip, success: false, reason });
      await writeAudit({
        category: "AUTHENTICATION",
        action: "admin_login",
        outcome: "FAILURE",
        actorEmail: email,
        ip,
        metadata: { portal: "admin", reason },
      });
      return { success: false, error: "Invalid credentials." };
    }

    // Role check — from User table (authoritative)
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = (profile?.role as string) || "USER";

    if (!ALLOWED_ADMIN_ROLES.includes(role)) {
      await supabase.auth.signOut();
      await recordAuthAttempt({ email, ip, success: false, reason: "not_admin" });
      await writeAudit({
        category: "AUTHORIZATION",
        action: "admin_login_denied",
        outcome: "DENIED",
        actorId: data.user.id,
        actorEmail: email,
        actorRole: role,
        ip,
        metadata: { portal: "admin", reason: "role_not_allowed" },
      });
      return { success: false, error: "Unauthorized. Admin access only." };
    }

    // Success
    await recordAuthAttempt({ email, ip, success: true });

    // Sync app_metadata for JWT claim consistency
    try {
      const admin = getAdminSupabase();
      if (admin && data.user.app_metadata?.role !== role) {
        await admin.auth.admin.updateUserById(data.user.id, {
          app_metadata: { ...(data.user.app_metadata ?? {}), role },
        });
      }
    } catch (syncErr) {
      console.warn("[adminLoginAction] meta sync failed:", syncErr);
    }

    await writeAudit({
      category: "AUTHENTICATION",
      action: "admin_login",
      outcome: "SUCCESS",
      actorId: data.user.id,
      actorEmail: email,
      actorRole: role,
      ip,
      metadata: { portal: "admin" },
    });

    return { success: true, destination: "/" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "login failed";
    await recordAuthAttempt({ email, ip, success: false, reason: message });
    await writeAudit({
      category: "AUTHENTICATION",
      action: "admin_login",
      outcome: "FAILURE",
      actorEmail: email,
      ip,
      metadata: { portal: "admin", error: message },
    });
    return { success: false, error: "Authentication failed." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN SIGN OUT
// ═══════════════════════════════════════════════════════════════════════════════
export async function adminSignOutAction() {
  const ip = await getClientIp();
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.auth.signOut();

    await writeAudit({
      category: "AUTHENTICATION",
      action: "admin_logout",
      outcome: "SUCCESS",
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      ip,
      metadata: { portal: "admin" },
    });
  } catch (err) {
    console.warn("[adminSignOut] audit failed:", err);
  }
  redirect("/login");
}
