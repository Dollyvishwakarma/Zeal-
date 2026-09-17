import { NextResponse } from "next/server";
import { createClient } from "@zeal/database/server";
import * as Ledger from "@/lib/wallet/ledger";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { consultantId, scheduledAt, durationMinutes, amount, platformFee } = body;

    // 1. Verify wallet balance
    const balance = await Ledger.getWalletBalance(session.user.id);
    if (balance < amount) {
      return NextResponse.json({ error: "Insufficient wallet balance for this booking." }, { status: 400 });
    }

    const bookingId = crypto.randomUUID();
    const consultantEarning = amount - platformFee;

    // 2. Create the Booking in DB (Bypass 'never[]' inference with 'as any')
    const { error: bookingError } = await supabase
      .from("Booking")
      .insert({
        id: bookingId,
        userId: session.user.id,
        consultantId,
        scheduledAt,
        durationMinutes,
        status: "CONFIRMED",
        amount,
        platformFee,
        consultantEarning,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any);

    if (bookingError) throw new Error(bookingError.message);

    // 3. Move funds to Escrow using our RPC
    await Ledger.holdInEscrow(
      session.user.id,
      amount,
      bookingId,
      `Prepaid consultation booking`
    );

    return NextResponse.json({ success: true, bookingId });
  } catch (error: any) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
