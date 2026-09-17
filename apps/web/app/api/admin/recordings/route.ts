// apps/web/app/api/admin/recordings/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminAPI("SUPPORT");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data, error } = await admin
    .from("CallSession")
    .select(`
      id, startTime, endTime, durationSeconds, recordingUrl, recordingReady, createdAt,
      booking:Booking!CallSession_bookingId_fkey(
        consultant:Consultant!Booking_consultantId_fkey(
          user:User!Consultant_userId_fkey(name, username)
        )
      )
    `)
    .not("recordingUrl", "is", null)
    .order("createdAt", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: (data ?? []).length });
}