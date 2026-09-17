import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export async function getWallet(userId: string) {
  const { data, error } = await getAdminClient()
    .from("Wallet").select("*").eq("userId", userId).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function getTransactions(
  walletId: string,
  opts: { limit?: number; offset?: number; type?: string } = {},
) {
  const { limit = 50, offset = 0, type } = opts;
  let q = getAdminClient()
    .from("Transaction").select("*", { count: "exact" })
    .eq("walletId", walletId)
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);
  if (type) q = q.eq("type", type);
  const { data, error, count } = await q;
  if (error) throwIfError({ data: null, error });
  return { items: data ?? [], total: count ?? 0 };
}

export async function findTransactionByReference(referenceId: string) {
  const { data, error } = await getAdminClient()
    .from("Transaction").select("*").eq("referenceId", referenceId).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}
