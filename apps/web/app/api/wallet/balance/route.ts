// apps/web/app/api/wallet/balance/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

interface WalletRow {
  id: string;
  balance: number;
  escrow: number;
  pendingIn: number;
  pendingOut: number;
  blocked: number;
}

export async function GET() {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("Wallet")
    .select("id, balance, escrow, pendingIn, pendingOut, blocked")
    .eq("userId", user.id)
    .maybeSingle();

  const wallet = data as WalletRow | null;
  return NextResponse.json({
    wallet: wallet ?? { balance: 0, escrow: 0, pendingIn: 0, pendingOut: 0, blocked: 0 },
  });
}