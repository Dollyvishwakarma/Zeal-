import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = ["VERIFY", "UNVERIFY", "PROMOTE_ADMIN", "DEMOTE", "BAN", "UNBAN"] as const;

export async function GET(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const role = url.searchParams.get("role");
  const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = admin
    .from("User")
    .select("id, email, username, name, avatar, role, sparks, isVerified, is_online, createdAt", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (role) q = q.eq("role", role);
  if (search) {
    q = q.or(`email.ilike.%${search}%,name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    users: data ?? [],
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminAPI("SUPER_ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { userId?: string; action?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, action } = body;
  if (!userId || !action || !ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
    return NextResponse.json({ error: "Invalid userId or action" }, { status: 400 });
  }
  if (userId === adminId && action === "DEMOTE") {
    return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
  }

  let update: Record<string, unknown> = {};
  switch (action) {
    case "VERIFY":        update = { isVerified: true }; break;
    case "UNVERIFY":      update = { isVerified: false }; break;
    case "PROMOTE_ADMIN": update = { role: "ADMIN" }; break;
    case "DEMOTE":        update = { role: "USER" }; break;
    case "BAN":           update = { isVerified: false }; break;
    case "UNBAN":         update = { isVerified: true }; break;
  }

  const { data, error } = await admin
    .from("User").update(update).eq("id", userId)
    .select("id, role, isVerified").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ─── PHASE 2: Sync app_metadata on role-affecting actions ────────────────
  if (["PROMOTE_ADMIN", "DEMOTE", "BAN", "UNBAN"].includes(action)) {
    try {
      const meta: Record<string, unknown> = {};
      if (action === "PROMOTE_ADMIN") meta.role = "ADMIN";
      if (action === "DEMOTE") meta.role = "USER";
      if (action === "BAN") meta.role = "USER";
      if (action === "UNBAN") meta.role = "USER";

      await admin.auth.admin.updateUserById(userId, { app_metadata: meta });
      await admin.from("audit_events").insert({
        event_category: "AUTHORIZATION",
        event_action: `user_${action.toLowerCase()}`,
        event_outcome: "SUCCESS",
        actor_id: adminId,
        actor_role: "SUPER_ADMIN",
        target_type: "user",
        target_id: userId,
        metadata: meta,
      });
    } catch (syncErr) {
      console.warn("[admin/users] role sync failed:", syncErr);
    }
  }

  await logAdminAction(admin, { adminId, action, targetType: "user", targetId: userId });
  return NextResponse.json({ user: data, action });
}
