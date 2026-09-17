import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();

  const { data: consultant } = await supabase
    .from("Consultant")
    .select("id, status, isActive, rating, totalConsultations")
    .eq("userId", userId)
    .maybeSingle();

  if (!consultant) throw new AppError("Not a consultant", 403, ErrorCode.AUTH_FORBIDDEN);

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [todaysBookingsRes, liveSessionsRes, pendingRes, earningsRes, unreadRes] = await Promise.all([
    supabase
      .from("Booking")
      .select("*, user:User!Booking_userId_fkey(id, name, avatar)")
      .eq("consultantId", consultant.id)
      .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
      .gte("scheduledAt", startOfDay.toISOString())
      .lte("scheduledAt", endOfDay.toISOString())
      .order("scheduledAt", { ascending: true })
      .limit(20),
    supabase
      .from("CallSession")
      .select("*", { count: "exact", head: true })
      .eq("consultantId", consultant.id)
      .eq("status", "INITIATED"),
    supabase
      .from("Booking")
      .select("*", { count: "exact", head: true })
      .eq("consultantId", consultant.id)
      .eq("status", "PENDING"),
    // Earnings today: get transactions tied to consultant's wallet today
    (async () => {
      const { data: wallet } = await supabase
        .from("Wallet").select("id").eq("userId", userId).maybeSingle();
      if (!wallet) return { data: [] as Array<{ amount: number }> };
      return supabase
        .from("Transaction")
        .select("amount")
        .eq("walletId", wallet.id)
        .eq("type", "COMMISSION")
        .gte("createdAt", startOfDay.toISOString())
        .lte("createdAt", endOfDay.toISOString());
    })(),
    supabase
      .from("Notification")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("read", false),
  ]);

  const earningsToday = ((earningsRes.data ?? []) as Array<{ amount: number }>)
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return NextResponse.json({
    consultant,
    today: {
      bookings: todaysBookingsRes.data ?? [],
      liveSessions: liveSessionsRes.count ?? 0,
      pendingRequests: pendingRes.count ?? 0,
      earnings: earningsToday,
    },
    unreadNotifications: unreadRes.count ?? 0,
  });
});
