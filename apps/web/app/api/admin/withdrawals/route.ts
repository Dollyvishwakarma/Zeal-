// apps/web/app/api/admin/withdrawals/route.ts
import { NextResponse } from "next/server";
import { requireAdminAPI, logAdminAction } from "@/lib/auth/api-guard";

export const dynamic = "force-dynamic";

interface TxRow {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  walletId: string;
}

interface WalletRow {
  id: string;
  userId: string;
}

interface UserRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
}

export async function GET() {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  // Find pending PAYOUT transactions
  const { data: txs } = await admin
    .from("Transaction")
    .select("id, amount, description, createdAt, metadata, walletId")
    .eq("type", "PAYOUT")
    .order("createdAt", { ascending: false })
    .limit(200);

  const pending = ((txs ?? []) as TxRow[]).filter((t) => {
    const meta = t.metadata ?? {};
    return meta.pending === true;
  });

  if (pending.length === 0) {
    return NextResponse.json({ withdrawals: [] });
  }

  // Fetch wallets + users
  const walletIds = Array.from(new Set(pending.map((t) => t.walletId)));
  const { data: walletsRaw } = await admin
    .from("Wallet")
    .select("id, userId")
    .in("id", walletIds);

  const wallets = (walletsRaw ?? []) as WalletRow[];
  const userIds = Array.from(new Set(wallets.map((w) => w.userId)));

  const { data: usersRaw } = userIds.length > 0
    ? await admin.from("User").select("id, name, username, email").in("id", userIds)
    : { data: [] };

  const users = (usersRaw ?? []) as UserRow[];
  const userById = new Map<string, UserRow>();
  for (const u of users) userById.set(u.id, u);
  const walletById = new Map<string, WalletRow>();
  for (const w of wallets) walletById.set(w.id, w);

  const withdrawals = pending.map((t) => {
    const wallet = walletById.get(t.walletId);
    const user = wallet ? userById.get(wallet.userId) : null;
    return {
      id: t.id,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt,
      metadata: t.metadata,
      wallet: {
        user: user
          ? { id: user.id, name: user.name, username: user.username, email: user.email }
          : { id: "unknown", name: null, username: "unknown", email: "" },
      },
    };
  });

  return NextResponse.json({ withdrawals });
}

export async function POST(req: Request) {
  const guard = await requireAdminAPI("ADMIN");
  if (!guard.ok) return guard.response;
  const { admin, userId: adminId } = guard;

  let body: { transactionId?: string; action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { transactionId, action, reason } = body;
  if (!transactionId || !["APPROVE", "REJECT"].includes(action || "")) {
    return NextResponse.json({ error: "Invalid transactionId or action" }, { status: 400 });
  }

  // Use RPC from 002_functions.sql
  const { data: rpcData, error: rpcError } = await admin.rpc("process_withdrawal", {
    p_tx_id: transactionId,
    p_action: action,
    p_reason: reason ?? null,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  const rpcResult = rpcData as { success?: boolean; error?: string } | null;
  if (rpcResult && rpcResult.success === false) {
    return NextResponse.json({ error: rpcResult.error || "RPC failed" }, { status: 500 });
  }

  await logAdminAction(admin, {
    adminId,
    action: action === "APPROVE" ? "WITHDRAWAL_APPROVE" : "WITHDRAWAL_REJECT",
    targetType: "withdrawal",
    targetId: transactionId,
    metadata: { reason },
  });

  return NextResponse.json({ success: true, action });
}