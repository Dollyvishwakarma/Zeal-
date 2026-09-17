// apps/web/app/api/admin/broadcast/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { message?: string; segment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  const segment = body.segment || "all";

  if (!message || message.length > 500) {
    return NextResponse.json({ error: "Message required (max 500 chars)" }, { status: 400 });
  }
  if (!["all", "users", "consultants"].includes(segment)) {
    return NextResponse.json({ error: "Invalid segment" }, { status: 400 });
  }

  // Find target users
  let userIds: string[] = [];

  if (segment === "consultants") {
    const { data } = await admin
      .from("Consultant")
      .select("userId")
      .eq("status", "VERIFIED")
      .limit(5000);
    userIds = (data ?? []).map((c: { userId: string }) => c.userId);
  } else if (segment === "users") {
    const { data } = await admin
      .from("User")
      .select("id")
      .eq("role", "USER")
      .limit(5000);
    userIds = (data ?? []).map((u: { id: string }) => u.id);
  } else {
    const { data } = await admin.from("User").select("id").limit(5000);
    userIds = (data ?? []).map((u: { id: string }) => u.id);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, segment });
  }

  // Insert notifications in batches
  const rows = userIds.map((userId) => ({
    userId,
    type: "system",
    message,
    actorId: adminId,
    read: false,
  }));

  const { error } = await admin.from("Notification").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin, {
    adminId,
    action: "BROADCAST",
    targetType: "segment",
    targetId: segment,
    metadata: { message: message.slice(0, 100), sent: userIds.length },
  });

  return NextResponse.json({ sent: userIds.length, segment });
}