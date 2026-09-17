import { getAdminClient } from "../admin";

export interface AuditParams {
  userId?: string | null; email?: string | null; action: string;
  targetType?: string; targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null; userAgent?: string | null; success?: boolean;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    const { error } = await getAdminClient().from("AdminAuditLog").insert({
      userId: params.userId ?? null,
      email: params.email ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: (params.metadata ?? null) as never,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      success: params.success ?? true,
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (err) {
    console.error("[audit] insert threw:", err);
  }
}

export function requestMeta(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}
