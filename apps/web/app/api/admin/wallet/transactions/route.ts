import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { withErrorHandler } from "@/lib/errors";
import { requireSuperAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const adminId = await requireSuperAdmin();
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from("Wallet").select("id").eq("userId", adminId).maybeSingle();

  if (!wallet) return NextResponse.json({ items: [] });

  const { data: items } = await admin
    .from("Transaction")
    .select("*")
    .eq("walletId", wallet.id)
    .order("createdAt", { ascending: false })
    .limit(limit);

  return NextResponse.json({ items: items ?? [] });
});
