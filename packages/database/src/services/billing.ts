import { Ledger } from "./ledger";
import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export interface ChargeMinuteParams {
  sessionId: string; minuteNumber: number; amount: number;
  payerUserId: string; payeeUserId?: string;
}

export interface BillingTickResult {
  charged: boolean; amount: number; reason?: string;
}

export const CallBilling = {
  async chargeMinute(params: ChargeMinuteParams): Promise<BillingTickResult> {
    const { sessionId, minuteNumber, amount, payerUserId, payeeUserId } = params;
    if (amount <= 0) return { charged: false, amount: 0, reason: "zero-amount" };

    const referenceId = `${sessionId}:min:${minuteNumber}`;
    const existing = await Ledger.getByReferenceId(referenceId);
    if (existing) return { charged: false, amount: 0, reason: "already-charged" };

    const sb = getAdminClient();
    const { data: payerWallet, error: pwErr } = await sb
      .from("Wallet").select("id, balance").eq("userId", payerUserId).maybeSingle();
    if (pwErr) throwIfError({ data: null, error: pwErr });
    if (!payerWallet) return { charged: false, amount: 0, reason: "no-wallet" };
    if (payerWallet.balance < amount) return { charged: false, amount: 0, reason: "insufficient" };

    await Ledger.debit({
      walletId: payerWallet.id, type: "PAYMENT", amount,
      description: `Call minute #${minuteNumber} (session ${sessionId})`,
      referenceId, metadata: { sessionId, minuteNumber },
    });

    if (payeeUserId) {
      const consultantShare = amount * 0.9;
      const { data: payeeWallet } = await sb
        .from("Wallet").select("id").eq("userId", payeeUserId).maybeSingle();
      if (payeeWallet) {
        await Ledger.credit({
          walletId: payeeWallet.id, type: "COMMISSION", amount: consultantShare,
          description: `Call earning #${minuteNumber} (session ${sessionId})`,
          referenceId: `${referenceId}:payee`, metadata: { sessionId, minuteNumber },
        });
      }
    }
    return { charged: true, amount };
  },

  async settleFinalMinute(params: {
    sessionId: string; totalSeconds: number; ratePerMinute: number;
    payerUserId: string; payeeUserId?: string;
  }): Promise<BillingTickResult> {
    const { sessionId, totalSeconds, ratePerMinute, payerUserId, payeeUserId } = params;
    const fullMinutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    if (remainder === 0) return { charged: false, amount: 0 };
    const amount = (remainder / 60) * ratePerMinute;
    if (amount < 0.01) return { charged: false, amount: 0 };
    return this.chargeMinute({
      sessionId, minuteNumber: fullMinutes + 1, amount, payerUserId, payeeUserId,
    });
  },
};
