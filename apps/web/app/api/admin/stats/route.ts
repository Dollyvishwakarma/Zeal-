// apps/web/app/api/admin/stats/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY FIX (Phase 4):
//   Previously: fetched service-role client, called .auth.getUser() (always null),
//   then double-fetched admin client. Route was effectively dead.
//   Now: uses requireAdminAPI guard.
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminAPI("SUPPORT");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    usersRes,
    consultantsRes,
    bookingsRes,
    revenueTodayRes,
    revenueMonthRes,
    liveRes,
    pendingRes,
  ] = await Promise.all([
    admin.from("User").select("*", { count: "exact", head: true }),
    admin
      .from("Consultant")
      .select("*", { count: "exact", head: true })
      .eq("status", "VERIFIED"),
    admin.from("Booking").select("*", { count: "exact", head: true }),
    admin
      .from("Transaction")
      .select("amount")
      .eq("type", "PAYMENT")
      .gte("createdAt", startOfDay.toISOString()),
    admin
      .from("Transaction")
      .select("amount")
      .eq("type", "PAYMENT")
      .gte("createdAt", startOfMonth.toISOString()),
    admin
      .from("CallSession")
      .select("*", { count: "exact", head: true })
      .eq("status", "INITIATED"),
    admin
      .from("Consultant")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
  ]);

  const sum = (rows: unknown[] | null) =>
    (rows ?? []).reduce(
      (acc: number, r) => acc + Math.abs(Number((r as { amount?: number }).amount) || 0),
      0
    );

  return NextResponse.json({
    users: usersRes.count ?? 0,
    consultants: consultantsRes.count ?? 0,
    bookings: bookingsRes.count ?? 0,
    revenueToday: sum(revenueTodayRes.data),
    revenueMonth: sum(revenueMonthRes.data),
    liveSessions: liveRes.count ?? 0,
    pendingVerifications: pendingRes.count ?? 0,
  });
}