"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// Booking Actions — Escrow-safe
// Flow: check balance → hold in escrow (atomic) → insert booking → notify consultant
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClientFromCookies } from "@zeal/database/server";

interface InitiateResult {
  success: boolean;
  bookingId?: string;
  error?: string;
  code?: string;
}

export async function initiateConsultation(
  consultantId: string,
  serviceType: string,
  rate: number,
  scheduledAt?: string,
  durationMinutes = 30
): Promise<InitiateResult> {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized", code: "AUTH" };

    if (!Number.isFinite(rate) || rate <= 0) {
      return { success: false, error: "Invalid rate", code: "INVALID_RATE" };
    }

    const amount = (durationMinutes / 60) * rate;

    // 1. Check balance
    const { data: walletRaw } = await supabase
      .from("Wallet")
      .select("balance")
      .eq("userId", user.id)
      .maybeSingle();

    const wallet = walletRaw as { balance: number } | null;
    const balance = wallet?.balance ?? 0;

    if (balance < amount) {
      return {
        success: false,
        error: `Insufficient balance (need ₹${amount.toFixed(2)})`,
        code: "LOW_BALANCE",
      };
    }

    // 2. Create booking record
    const bookingId = crypto.randomUUID();
    const platformFee = amount * 0.10;
    const consultantEarning = amount - platformFee;

    const { error: insertError } = await supabase
      .from("Booking")
      .insert({
        id: bookingId,
        userId: user.id,
        consultantId,
        scheduledAt: scheduledAt ?? new Date().toISOString(),
        durationMinutes,
        status: "PENDING",
        amount,
        platformFee,
        consultantEarning,
      });

    if (insertError) {
      return { success: false, error: insertError.message, code: "DB_ERROR" };
    }

    // 3. Hold funds in escrow (atomic RPC)
    const { data: rpcData, error: rpcError } = await supabase.rpc("hold_in_escrow_safe", {
      p_user_id: user.id,
      p_amount: amount,
      p_reference_id: bookingId,
      p_description: `Escrow for booking ${bookingId}`,
    });

    if (rpcError) {
      // Rollback: delete the booking record
      await supabase.from("Booking").delete().eq("id", bookingId);
      return { success: false, error: rpcError.message, code: "ESCROW_ERROR" };
    }

    const rpcResult = rpcData as { success?: boolean; error?: string } | null;
    if (rpcResult && rpcResult.success === false) {
      await supabase.from("Booking").delete().eq("id", bookingId);
      return { success: false, error: rpcResult.error || "Escrow failed", code: "ESCROW_ERROR" };
    }

    // 4. Notify consultant (best-effort)
    try {
      const { serverPublish } = await import("@/lib/realtime/server");
      await serverPublish(`consultant:${consultantId}:incoming`, "incoming_request", {
        id: bookingId,
        seekerName: user.email?.split("@")[0] || "Seeker",
        rate,
        modality: serviceType,
        receivedAt: new Date().toISOString(),
      });
    } catch { /* best-effort */ }

    return { success: true, bookingId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unexpected error",
      code: "INTERNAL",
    };
  }
}