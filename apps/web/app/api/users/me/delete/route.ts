import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { audit, requestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const body = await req.json().catch(() => ({}));
  const confirmation = (body as { confirmation?: string }).confirmation;
  if (confirmation !== "DELETE") {
    throw new AppError("Type DELETE to confirm", 400, ErrorCode.VALIDATION_INPUT);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("delete_user_cascade", { p_user_id: userId });

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);

  const result = data as { success?: boolean; error?: string } | null;
  if (result && result.success === false) {
    throw new AppError(result.error || "Delete failed", 500, ErrorCode.INTERNAL_SERVER);
  }

  const meta = requestMeta(req);
  await audit({
    userId,
    action: "user.self_delete",
    targetType: "user",
    targetId: userId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    success: true,
  });

  return NextResponse.json({ success: true });
});
