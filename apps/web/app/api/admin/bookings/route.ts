// apps/web/app/api/admin/bookings/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  scheduledAt: string;
  status: string;
  amount: number;
  userId: string | null;
  consultantId: string;
}

export async function GET(req: Request) {
  const guard = await requireAdminAPI("SUPPORT");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = admin
    .from("Booking")
    .select("id, scheduledAt, status, amount, userId, consultantId", { count: "exact" })
    .order("scheduledAt", { ascending: false })
    .range(from, to);

  if (status && status !== "all") q = q.eq("status", status);

  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as BookingRow[];

  // Enrich with user + consultant names
  const userIds = Array.from(
    new Set(bookings.map((b) => b.userId).filter((x): x is string => Boolean(x)))
  );
  const consultantIds = Array.from(new Set(bookings.map((b) => b.consultantId)));

  const [usersRes, consultantsRes] = await Promise.all([
    userIds.length > 0
      ? admin.from("User").select("id, name, username, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    consultantIds.length > 0
      ? admin
          .from("Consultant")
          .select("id, user:User!Consultant_userId_fkey(name, username)")
          .in("id", consultantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userById = new Map<string, { name?: string; username?: string; email?: string }>();
  for (const u of (usersRes.data ?? []) as Array<{
    id: string;
    name?: string;
    username?: string;
    email?: string;
  }>) {
    userById.set(u.id, u);
  }

  const consultantById = new Map<string, { name?: string }>();
  for (const c of (consultantsRes.data ?? []) as Array<{
    id: string;
    user?: { name?: string; username?: string } | null;
  }>) {
    const u = Array.isArray(c.user) ? c.user[0] : c.user;
    consultantById.set(c.id, { name: u?.name || u?.username });
  }

  const items = bookings.map((b) => ({
    id: b.id,
    scheduledAt: b.scheduledAt,
    status: b.status,
    amount: b.amount,
    user: b.userId
      ? {
          name: userById.get(b.userId)?.name || userById.get(b.userId)?.username || null,
          email: userById.get(b.userId)?.email ?? null,
        }
      : null,
    consultant: {
      user: { name: consultantById.get(b.consultantId)?.name ?? null },
    },
  }));

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  });
}