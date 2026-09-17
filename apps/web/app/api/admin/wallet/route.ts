// apps/web/app/api/admin/wallet/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminAPI("SUPPORT");
  if (!guard.ok) return guard.response;
  const { admin, userId } = guard;

  const { data } = await admin
    .from("Wallet")
    .select("id, balance, escrow, pendingIn, pendingOut, blocked")
    .eq("userId", userId)
    .maybeSingle();

  return NextResponse.json({
    wallet: data ?? { balance: 0, escrow: 0, pendingIn: 0, pendingOut: 0, blocked: 0 },
  });
}