"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Wallet Actions — Atomic RPC-based (no read-modify-write race)
// Uses: credit_funds_safe, process_wallet_deduction_safe
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClientFromCookies } from "@zeal/database/server";

export async function getWalletBalance(): Promise<{ balance: number }> {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { balance: 0 };

  const { data } = await supabase
    .from("Wallet")
    .select("balance")
    .eq("userId", user.id)
    .maybeSingle();

  const row = data as { balance: number } | null;
  return { balance: row?.balance ?? 0 };
}

export async function topUpWalletAction(amount: number): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
      return { success: false, error: "Invalid amount (1–100000)" };
    }

    const refId = `topup:${user.id}:${Date.now()}`;

    const { data, error } = await supabase.rpc("credit_funds_safe", {
      p_user_id: user.id,
      p_amount: amount,
      p_description: `Wallet top-up ₹${amount}`,
      p_reference_id: refId,
    });

    if (error) return { success: false, error: error.message };

    const result = data as { success?: boolean; balance?: number; error?: string } | null;
    if (result && result.success === false) {
      return { success: false, error: result.error || "RPC failed" };
    }

    return {
      success: true,
      newBalance: result?.balance ?? undefined,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Top-up failed",
    };
  }
}