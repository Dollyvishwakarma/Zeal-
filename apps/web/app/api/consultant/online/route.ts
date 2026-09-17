// apps/web/app/api/consultant/online/route.ts
// Toggles consultant online status + broadcasts to seekers
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { is_online?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.is_online !== "boolean") {
    return NextResponse.json({ error: "is_online must be boolean" }, { status: 400 });
  }

  const { error } = await supabase
    .from("User")
    .update({ is_online: body.is_online })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optional: broadcast via realtime from server side
  try {
    const { serverPublish } = await import("@/lib/realtime/server");
    await serverPublish(`consultant:${user.id}:status`, "status_updated", {
      consultantId: user.id,
      is_online: body.is_online,
    });
  } catch { /* realtime is best-effort */ }

  return NextResponse.json({ success: true, is_online: body.is_online });
}