import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();

  const { data: wallet } = await supabase
    .from("Wallet").select("*").eq("userId", userId).maybeSingle();

  const [userRes, txRes, bookingsRes, postsRes, notifsRes, consultantRes] = await Promise.all([
    supabase.from("User").select("*").eq("id", userId).maybeSingle(),
    wallet
      ? supabase.from("Transaction").select("*")
          .eq("walletId", wallet.id).order("createdAt", { ascending: false }).limit(1000)
      : Promise.resolve({ data: [] }),
    supabase.from("Booking").select("*").eq("userId", userId)
      .order("scheduledAt", { ascending: false }).limit(500),
    supabase.from("Post").select("*").eq("authorId", userId)
      .order("createdAt", { ascending: false }).limit(500),
    supabase.from("Notification").select("*").eq("userId", userId)
      .order("createdAt", { ascending: false }).limit(500),
    supabase.from("Consultant").select("*").eq("userId", userId).maybeSingle(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: userRes.data,
    wallet,
    transactions: txRes.data ?? [],
    bookings: bookingsRes.data ?? [],
    posts: postsRes.data ?? [],
    notifications: notifsRes.data ?? [],
    consultant: consultantRes.data ?? null,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=\"zeal-data-export.json\"",
    },
  });
});
