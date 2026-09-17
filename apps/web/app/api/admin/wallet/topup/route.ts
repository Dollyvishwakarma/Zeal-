import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { requireSuperAdmin, logAdminAction } from "@/lib/auth/admin";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TopupSchema = z.object({ amount: z.number().positive().max(100000) });

export const POST = withErrorHandler(async (req: Request) => {
  const adminId = await requireSuperAdmin();
  const body = await req.json();
  const { amount } = TopupSchema.parse(body);

  const admin = createAdminClient();

  // Use the ledger RPC (atomic)
  const { data, error } = await admin.rpc("credit_funds_safe", {
    p_user_id: adminId,
    p_amount: amount,
    p_description: `Admin top-up by ${adminId}`,
    p_reference_id: `admin-topup:${Date.now()}`,
  });

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
  const result = data as { success?: boolean; error?: string } | null;
  if (result && result.success === false) {
    throw new AppError(result.error || "Top-up failed", 500, ErrorCode.INTERNAL_SERVER);
  }

  await logAdminAction({
    adminId,
    action: "WALLET_TOPUP",
    targetType: "wallet",
    targetId: adminId,
    metadata: { amount },
  });

  const { data: wallet } = await admin
    .from("Wallet").select("*").eq("userId", adminId).maybeSingle();

  return NextResponse.json({ wallet });
});
