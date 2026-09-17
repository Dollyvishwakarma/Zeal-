// apps/web/lib/auth/api-guard.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — API Auth Guard
// Accepts auth from EITHER:
//   1. Bearer token (admin proxy)  → admin app sends this
//   2. Supabase session cookie     → direct client calls
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerClientFromCookies, createAdminClient } from "@zeal/database/server";

export type Role = "USER" | "CLIENT_ADMIN" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN" | "VIEWER";

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 10,
  USER: 20,
  CLIENT_ADMIN: 40,
  SUPPORT: 50,
  ADMIN: 80,
  SUPER_ADMIN: 100,
};

export interface GuardSuccess {
  ok: true;
  userId: string;
  email: string | null;
  role: string;
  admin: ReturnType<typeof createAdminClient>;
}
export interface GuardFailure {
  ok: false;
  response: NextResponse;
}
export type GuardResult = GuardSuccess | GuardFailure;

// ─── Bearer token verification ────────────────────────────────────────────────
async function verifyAccessToken(
  token: string
): Promise<{ userId: string; email: string | null; role: string } | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = data.user;
    let role = (user.app_metadata?.role as string) ?? "";

    // Token may be stale (role changed after issuance) — DB fallback
    if (!role) {
      const { data: profile } = await admin
        .from("User")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (profile?.role as string) || "USER";
    }

    return { userId: user.id, email: user.email ?? null, role };
  } catch {
    return null;
  }
}

// ─── Reads Authorization header safely ────────────────────────────────────────
async function getAuthHeader(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("authorization");
  } catch {
    return null;
  }
}

// ─── Core guard ───────────────────────────────────────────────────────────────
export async function requireAdminAPI(minRole: Role = "ADMIN"): Promise<GuardResult> {
  try {
    let userId: string | null = null;
    let email: string | null = null;
    let role = "USER";

    // ─── Path A: Bearer token (admin proxy) ────────────────────────────────
    const authHeader = await getAuthHeader();
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const verified = await verifyAccessToken(token);
      if (verified) {
        userId = verified.userId;
        email = verified.email;
        role = verified.role;
      }
    }

    // ─── Path B: Cookie session (direct client) ────────────────────────────
    if (!userId) {
      const supabase = await createServerClientFromCookies();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        userId = user.id;
        email = user.email ?? null;
        role = (user.app_metadata?.role as string) ?? "USER";

        if (!user.app_metadata?.role) {
          const { data: profile } = await supabase
            .from("User")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          role = (profile?.role as string) || "USER";
        }
      }
    }

    if (!userId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthorized", code: "AUTH_UNAUTHORIZED" },
          { status: 401 }
        ),
      };
    }

    const userLevel = ROLE_LEVEL[role] ?? 0;
    const requiredLevel = ROLE_LEVEL[minRole] ?? 100;

    if (userLevel < requiredLevel) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Forbidden — requires ${minRole}`,
            code: "AUTH_FORBIDDEN",
            yourRole: role,
          },
          { status: 403 }
        ),
      };
    }

    return { ok: true, userId, email, role, admin: createAdminClient() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth check failed";
    return {
      ok: false,
      response: NextResponse.json(
        { error: message, code: "AUTH_ERROR" },
        { status: 500 }
      ),
    };
  }
}

export async function requireUserAPI(): Promise<GuardResult> {
  return requireAdminAPI("USER");
}

export async function requireSuperAdminAPI(): Promise<GuardResult> {
  return requireAdminAPI("SUPER_ADMIN");
}

export async function logAdminAction(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await admin.from("AdminAuditLog").insert({
      userId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as never,
      success: true,
    });
  } catch (err) {
    console.warn("[Audit] Failed to log admin action:", err);
  }
}
