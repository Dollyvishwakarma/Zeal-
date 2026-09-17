import { NextResponse } from "next/server";
import { createServerClientFromCookies, getUserId } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const { data, error } = await supabase
    .from("Notification")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);

  const { count } = await supabase
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("read", false);

  return NextResponse.json({ items: data || [], total: data?.length || 0, unreadCount: count || 0 });
});

export const PUT = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  const supabase = await createServerClientFromCookies();
  await supabase.from("Notification").update({ read: true }).eq("userId", userId).eq("read", false);
  return NextResponse.json({ success: true });
});
