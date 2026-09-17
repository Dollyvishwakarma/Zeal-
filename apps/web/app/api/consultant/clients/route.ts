// apps/web/app/api/consultant/clients/route.ts
// Lists unique clients from bookings + conversation participants
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

interface ConsultantRow { id: string; }
interface BookingRow { userId: string | null; scheduledAt: string; }
interface UserRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
}

export async function GET() {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: consultantRaw } = await supabase
    .from("Consultant")
    .select("id")
    .eq("userId", user.id)
    .maybeSingle();

  const consultant = consultantRaw as ConsultantRow | null;
  if (!consultant) {
    return NextResponse.json({ clients: [] });
  }

  const { data: bookingsRaw } = await supabase
    .from("Booking")
    .select("userId, scheduledAt")
    .eq("consultantId", consultant.id)
    .not("userId", "is", null)
    .order("scheduledAt", { ascending: false });

  const bookings = (bookingsRaw ?? []) as BookingRow[];

  // Aggregate per client
  const stats = new Map<string, { sessions: number; lastSessionAt: string }>();
  for (const b of bookings) {
    if (!b.userId) continue;
    const existing = stats.get(b.userId);
    if (existing) {
      existing.sessions += 1;
      if (b.scheduledAt > existing.lastSessionAt) {
        existing.lastSessionAt = b.scheduledAt;
      }
    } else {
      stats.set(b.userId, { sessions: 1, lastSessionAt: b.scheduledAt });
    }
  }

  const userIds = Array.from(stats.keys());
  if (userIds.length === 0) {
    return NextResponse.json({ clients: [] });
  }

  const { data: usersRaw } = await supabase
    .from("User")
    .select("id, name, username, email")
    .in("id", userIds);

  const users = (usersRaw ?? []) as UserRow[];

  const clients = users.map((u) => {
    const s = stats.get(u.id);
    return {
      id: u.id,
      name: u.name || u.username || null,
      email: u.email,
      lastSessionAt: s?.lastSessionAt ?? null,
      sessions: s?.sessions ?? 0,
    };
  });

  return NextResponse.json({ clients });
}