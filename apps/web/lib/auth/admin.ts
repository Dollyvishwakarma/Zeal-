import { createAdminClient } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { AppError, ErrorCode } from "@/lib/errors";

export async function requireSuperAdmin(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("User").select("role").eq("id", userId).maybeSingle();

  if (user?.role !== "SUPER_ADMIN") {
    throw new AppError("Forbidden - SUPER_ADMIN only", 403, ErrorCode.AUTH_FORBIDDEN);
  }
  return userId;
}

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("Notification").insert({
      userId: params.adminId,
      type: "system",
      message: `[AUDIT] ${params.action} ${params.targetType}${params.targetId ? `#${params.targetId}` : ""}`,
      actorId: params.adminId,
      read: true,
      redirectUrl: null,
    });
  } catch (err) {
    console.warn("[Audit] Failed to log:", err);
  }
}
