import { getAdminClient } from "../admin";
import { callRpc } from "../helpers/rpc";
import { throwIfError } from "../helpers/errors";
import type { Database } from "../types";

type TransactionType = Database["public"]["Enums"]["TransactionType"];

export interface LedgerEntry {
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerResult { id: string; balance: number; }

export const Ledger = {
  async debit(entry: LedgerEntry): Promise<LedgerResult> {
    if (entry.amount <= 0) throw new Error("[Ledger] debit amount must be > 0");
    const result = await callRpc(getAdminClient(), "ledger_debit", {
      p_wallet_id: entry.walletId,
      p_amount: entry.amount,
      p_type: entry.type,
      p_description: entry.description,
      p_reference_id: entry.referenceId ?? null,
      p_metadata: (entry.metadata ?? undefined) as never,
    });
    return result as unknown as LedgerResult;
  },

  async credit(entry: LedgerEntry): Promise<LedgerResult> {
    if (entry.amount <= 0) throw new Error("[Ledger] credit amount must be > 0");
    const result = await callRpc(getAdminClient(), "ledger_credit", {
      p_wallet_id: entry.walletId,
      p_amount: entry.amount,
      p_type: entry.type,
      p_description: entry.description,
      p_reference_id: entry.referenceId ?? null,
      p_metadata: (entry.metadata ?? undefined) as never,
    });
    return result as unknown as LedgerResult;
  },

  async transfer(params: {
    fromWalletId: string; toWalletId: string; amount: number;
    referenceId: string; description: string;
  }): Promise<{ fromBalance: number; toBalance: number }> {
    const result = await callRpc(getAdminClient(), "ledger_transfer", {
      p_from_wallet: params.fromWalletId,
      p_to_wallet: params.toWalletId,
      p_amount: params.amount,
      p_reference_id: params.referenceId,
      p_description: params.description,
    });
    return result as unknown as { fromBalance: number; toBalance: number };
  },

  async getByReferenceId(referenceId: string) {
    const { data, error } = await getAdminClient()
      .from("Transaction").select("*").eq("referenceId", referenceId).maybeSingle();
    if (error) throwIfError({ data, error });
    return data;
  },
};
