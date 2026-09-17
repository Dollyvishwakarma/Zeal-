import { createAdminClient } from "@zeal/database/server";

export async function getWalletBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('Wallet').select('balance').eq('userId', userId).maybeSingle();
  return (data as any)?.balance ?? 0;
}

export async function getByReferenceId(referenceId: string) {
  if (!referenceId) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('Transaction').select('*').eq('referenceId', referenceId).maybeSingle();
  return data;
}

export async function deductFundsSafe(userId: string, amount: number, description: string, refId: string) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.rpc as any)('process_wallet_deduction_safe', {
    p_user_id: userId, p_amount: amount, p_description: description, p_reference_id: refId
  });
  if (error) throw new Error(`Database Exception: ${error.message}`);
  if (!data?.success) throw new Error(`Ledger Error [${data?.code}]: ${data?.error}`);
  return data;
}

export async function creditFunds(params: { userId: string; amount: number; description: string; referenceId?: string }) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.rpc as any)('credit_funds_safe', {
    p_user_id: params.userId, p_amount: params.amount, p_description: params.description, p_reference_id: params.referenceId || null
  });
  if (error) throw new Error(`Database Exception: ${error.message}`);
  if (!data?.success) throw new Error(`Ledger Error [${data?.code}]: ${data?.error}`);
  return data;
}

export async function holdInEscrow(userId: string, amount: number, referenceId: string, description: string) {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.rpc as any)('hold_in_escrow_safe', {
    p_user_id: userId, p_amount: amount, p_reference_id: referenceId, p_description: description
  });
  if (error) throw new Error(`Database Exception: ${error.message}`);
  if (!data?.success) throw new Error(`Ledger Error [${data?.code}]: ${data?.error}`);
  return data;
}

export async function createTransaction(params: { 
  userId?: string; 
  walletId?: string; 
  amount: number; 
  type?: string; 
  description: string; 
  referenceId?: string; 
  metadata?: any;
}) {
  const supabase = createAdminClient();
  let targetUserId = params.userId;

  if (!targetUserId && params.walletId) {
    const { data } = await supabase.from('Wallet').select('userId').eq('id', params.walletId).single();
    if (!data) throw new Error("Wallet not found for transaction reverse-lookup");
    
    // THE FIX: Cast data as 'any' to bypass 'never' inference
    targetUserId = (data as any).userId; 
  }

  if (!targetUserId) throw new Error("CRITICAL: userId or walletId required for transaction");

  const isCredit = params.type === 'CREDIT' || params.type === 'TOPUP' || params.type === 'EARNING' || params.type === 'REFUND';
  
  if (isCredit) {
    return creditFunds({
      userId: targetUserId,
      amount: params.amount,
      description: params.description,
      referenceId: params.referenceId
    });
  }
  
  return deductFundsSafe(targetUserId, params.amount, params.description, params.referenceId || '');
}
