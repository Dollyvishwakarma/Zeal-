// apps/web/app/api/consultant/earnings/route.ts
// Returns wallet balance + recent transactions for the current consultant
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

interface WalletRow { id: string; balance: number; }
interface TxRow {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export async function GET() {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: walletRaw } = await supabase
    .from("Wallet")
    .select("id, balance")
    .eq("userId", user.id)
    .maybeSingle();

  const wallet = walletRaw as WalletRow | null;
  if (!wallet) {
    return NextResponse.json({ balance: 0, transactions: [] });
  }

  const { data: txRaw } = await supabase
    .from("Transaction")
    .select("id, type, amount, balance, description, createdAt")
    .eq("walletId", wallet.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  const transactions = (txRaw ?? []) as TxRow[];

  return NextResponse.json({
    balance: wallet.balance,
    transactions,
  });
}