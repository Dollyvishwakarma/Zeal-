import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ count: 0 });

  const supabase = await createServerClientFromCookies();
  const { count } = await supabase
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("read", false);

  return NextResponse.json({ count: count ?? 0 });
});
