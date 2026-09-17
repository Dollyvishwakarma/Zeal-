import { getUserId } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, HTTP_STATUS } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
  const type = url.searchParams.get("type");

  const supabase = await createServerClientFromCookies();
  const { data: wallet } = await supabase
    .from("Wallet").select("id").eq("userId", userId).maybeSingle();

  if (!wallet) throw new AppError("Wallet not found", HTTP_STATUS.NOT_FOUND);

  let q = supabase
    .from("Transaction")
    .select("*", { count: "exact" })
    .eq("walletId", wallet.id)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) q = q.eq("type", type);

  const { data, count, error } = await q;
  if (error) throw new AppError(error.message, 500, "INTERNAL_SERVER_ERROR" as never);

  return NextResponse.json({ transactions: data ?? [], total: count ?? 0 });
});
