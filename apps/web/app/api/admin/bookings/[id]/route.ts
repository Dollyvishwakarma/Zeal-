// apps/web/app/api/admin/bookings/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
  "DISPUTED",
] as const;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdminAPI("SUPPORT");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("Booking")
    .update({ status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(admin, {
    adminId,
    action: "BOOKING_UPDATE_STATUS",
    targetType: "booking",
    targetId: id,
    metadata: { status },
  });

  // Realtime: notify user
  try {
    const { serverPublish } = await import("@/lib/realtime/server");
    await serverPublish(`booking:${id}:status`, "booking_updated", {
      id,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch { /* best-effort */ }

  return NextResponse.json({ booking: data });
}