// apps/web/app/api/admin/settings/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

// Simple in-DB settings via DebugLog-style key-value (or Redis fallback)
// For now, use a static approach — settings stored in AdminAuditLog metadata
// TODO: add a `PlatformSettings` table in future migration

export async function GET() {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    platformFeePercent: 10,
    minimumWithdrawal: 100,
    maintenanceMode: false,
  });
}

export async function PUT(req: Request) {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await logAdminAction(admin, {
    adminId,
    action: "SETTINGS_UPDATE",
    targetType: "platform",
    metadata: body,
  });

  return NextResponse.json({ success: true, applied: body });
}