// apps/web/app/api/admin/platform-fee/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

const DEFAULT_FEE = 10;

export async function GET() {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;

  let feePercent = DEFAULT_FEE;
  try {
    const { redis } = await import("@/lib/cache");
    const cached = await redis.get<string>("platform_fee_percent");
    if (typeof cached === "string") {
      const parsed = parseFloat(cached);
      if (!Number.isNaN(parsed)) feePercent = parsed;
    }
  } catch { /* Redis optional */ }

  return NextResponse.json({ feePercent });
}

export async function POST(req: Request) {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { feePercent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fee = Number(body.feePercent);
  if (!Number.isFinite(fee) || fee < 0 || fee > 50) {
    return NextResponse.json({ error: "Fee must be 0–50" }, { status: 400 });
  }

  try {
    const { redis } = await import("@/lib/cache");
    await redis.set("platform_fee_percent", String(fee));
  } catch {
    return NextResponse.json({ error: "Cache unavailable" }, { status: 503 });
  }

  await logAdminAction(admin, {
    adminId,
    action: "PLATFORM_FEE_UPDATE",
    targetType: "platform",
    metadata: { feePercent: fee },
  });

  return NextResponse.json({ feePercent: fee });
}