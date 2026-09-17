import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { requireRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    await requireRole("ADMIN");
    const { id } = await params;

    const admin = createAdminClient();

    const { data: consultant } = await admin
      .from("Consultant")
      .select(`
        *,
        user:User!Consultant_userId_fkey(id, name, email, avatar)
      `)
      .eq("id", id)
      .maybeSingle();

    if (!consultant) throw new AppError("Consultant not found", 404, ErrorCode.NOT_FOUND);

    const [bookingsRes, callsRes] = await Promise.all([
      admin.from("Booking").select("*", { count: "exact", head: true }).eq("consultantId", id),
      admin.from("CallSession").select("*", { count: "exact", head: true }).eq("consultantId", id),
    ]);

    // Earnings: get wallet via consultant userId
    let totalEarnings = 0;
    const consultantUserId = (consultant as { userId?: string }).userId;
    if (consultantUserId) {
      const { data: wallet } = await admin
        .from("Wallet").select("id").eq("userId", consultantUserId).maybeSingle();
      if (wallet) {
        const { data: txs } = await admin
          .from("Transaction").select("amount")
          .eq("walletId", wallet.id)
          .eq("type", "COMMISSION");
        totalEarnings = Math.abs((txs ?? []).reduce(
          (s: number, t: { amount?: number }) => s + Math.abs(t.amount ?? 0), 0,
        ));
      }
    }

    return NextResponse.json({
      consultant,
      stats: {
        totalBookings: bookingsRes.count ?? 0,
        totalCalls: callsRes.count ?? 0,
        totalEarnings,
        rating: consultant.rating,
        totalConsultations: consultant.totalConsultations,
      },
    });
  },
);
