// apps/web/app/api/admin/consultants/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = [
  "SUSPEND", "REACTIVATE", "FEATURE", "UNFEATURE", "SET_RATE",
] as const;

export async function GET(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const from = (page - 1) * limit;

  let q = admin
    .from("Consultant")
    .select(`
      id, category, specialties, languages, perMinuteRate, rating,
      status, isActive, isVerified, subdomain, subdomainActive, createdAt,
      user:User!Consultant_userId_fkey(id, name, email, username, avatar)
    `, { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, from + limit - 1);

  if (status) q = q.eq("status", status);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    consultants: data ?? [],
    pagination: { page, limit, total: count ?? 0, pages: Math.ceil((count ?? 0) / limit) },
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { consultantId?: string; action?: string; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { consultantId, action, value } = body;
  if (!consultantId || !action || !ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
    return NextResponse.json({ error: "Invalid consultantId or action" }, { status: 400 });
  }

  let update: Record<string, unknown> = {};
  switch (action) {
    case "SUSPEND":     update = { isActive: false, status: "SUSPENDED" }; break;
    case "REACTIVATE":  update = { isActive: true, status: "VERIFIED" }; break;
    case "FEATURE":     update = { isVerified: true }; break;
    case "UNFEATURE":   update = { isVerified: false }; break;
    case "SET_RATE":    update = { perMinuteRate: Number(value) }; break;
  }

  const { data, error } = await admin
    .from("Consultant")
    .update(update)
    .eq("id", consultantId)
    .select("id, status, isActive, perMinuteRate")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(admin, {
    adminId,
    action,
    targetType: "consultant",
    targetId: consultantId,
    metadata: { value },
  });

  return NextResponse.json({ consultant: data, action });
}