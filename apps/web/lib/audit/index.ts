import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getAuditClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export interface AuditParams {
  userId?: string | null;
  email?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
}

interface AuditRow {
  userId: string | null;
  email: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
}

/**
 * Write an audit entry to AdminAuditLog.
 *
 * Never throws — auditing must not break the caller. Failures are logged
 * to stderr and swallowed.
 */
export async function audit(params: AuditParams): Promise<void> {
  const sb = getAuditClient();
  if (!sb) {
    console.warn("[audit] Supabase admin client unavailable");
    return;
  }

  const row: AuditRow = {
    userId: params.userId ?? null,
    email: params.email ?? null,
    action: params.action,
    targetType: params.targetType ?? null,
    targetId: params.targetId ?? null,
    metadata: params.metadata ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    success: params.success ?? true,
  };

  try {
    // Supabase v2 without a generated Database type collapses `.insert()`
    // to `never[]`. The row shape is enforced by `AuditRow` above; the cast
    // bridges the library's untyped default without losing type safety here.
    const { error } = await sb
      .from("AdminAuditLog")
      .insert([row] as unknown as never[]);

    if (error) {
      console.error("[audit] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[audit] insert threw:", err);
  }
}

export function requestMeta(req: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

