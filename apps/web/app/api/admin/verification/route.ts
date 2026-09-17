import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data: consultants, error } = await admin
    .from("Consultant")
    .select(`
      id, category, specialties, bio, perMinuteRate, status, createdAt,
      verificationDocs,
      user:User!Consultant_userId_fkey(id, name, email, username, avatar)
    `)
    .eq("status", "PENDING")
    .order("createdAt", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ consultants: consultants ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { consultantId?: string; action?: string; reason?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { consultantId, action, reason } = body;
  if (!consultantId || !action) {
    return NextResponse.json({ error: "Missing consultantId or action" }, { status: 400 });
  }
  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: rpcData, error: rpcError } = await admin.rpc("verify_consultant", {
    p_consultant_id: consultantId,
    p_admin_id: adminId,
    p_action: action,
    p_reason: reason ?? null,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
  const rpcResult = rpcData as { success?: boolean; error?: string } | null;
  if (rpcResult && rpcResult.success === false) {
    return NextResponse.json({ error: rpcResult.error || "RPC failed" }, { status: 500 });
  }

  // ─── PHASE 2: Sync app_metadata.role ─────────────────────────────────────
  try {
    const { data: consultantRow } = await admin
      .from("Consultant").select("userId").eq("id", consultantId).maybeSingle();

    if (consultantRow?.userId) {
      const newRole = action === "APPROVE" ? "CLIENT_ADMIN" : "USER";
      await admin.auth.admin.updateUserById(consultantRow.userId, {
        app_metadata: { role: newRole },
      });
      await admin.from("audit_events").insert({
        event_category: "AUTHORIZATION",
        event_action: action === "APPROVE" ? "consultant_approve" : "consultant_reject",
        event_outcome: "SUCCESS",
        actor_id: adminId,
        actor_role: "ADMIN",
        target_type: "consultant",
        target_id: consultantId,
        metadata: { newRole, reason: reason ?? null },
      });
    }
  } catch (syncErr) {
    console.warn("[verification] role sync failed:", syncErr);
  }

  await logAdminAction(admin, {
    adminId,
    action: action === "APPROVE" ? "CONSULTANT_APPROVE" : "CONSULTANT_REJECT",
    targetType: "consultant",
    targetId: consultantId,
    metadata: { reason },
  });

  try {
    const { serverPublish } = await import("@/lib/realtime/server");
    const { data: consultantRow } = await admin
      .from("Consultant").select("userId").eq("id", consultantId).maybeSingle();
    if (consultantRow?.userId) {
      await serverPublish(`user:${consultantRow.userId}:notifications`, "notification", {
        id: `verif-${Date.now()}`,
        type: "verification",
        message: action === "APPROVE"
          ? "Your consultant application was approved!"
          : `Your application was rejected: ${reason ?? "No reason provided"}`,
        redirectUrl: "/consultant/dashboard",
      });
    }
  } catch { /* realtime best-effort */ }

  return NextResponse.json({ success: true, action });
}
