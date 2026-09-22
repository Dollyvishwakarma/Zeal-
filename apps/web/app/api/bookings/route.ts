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
    const { consultantId, scheduledAt, durationMinutes, consultationType, location } = body;

    if (!["CHAT", "PHYSICAL"].includes(consultationType)) {
      return NextResponse.json({ error: "Only CHAT or PHYSICAL allowed" }, { status: 400 });
    }

    if (consultationType === "PHYSICAL" && !location?.trim()) {
      return NextResponse.json({ error: "Location required for physical" }, { status: 400 });
    }

    const { data: consultant } = await supabase
      .from("Consultant")
      .select("perMinuteRate, chatRate, physicalRate, userId")
      .eq("id", consultantId)
      .maybeSingle();

    if (!consultant) return NextResponse.json({ error: "Consultant not found" }, { status: 404 });

    const rate = consultationType === "CHAT"
      ? ((consultant as any).chatRate ?? (consultant as any).perMinuteRate ?? 50)
      : ((consultant as any).physicalRate ?? (consultant as any).perMinuteRate ?? 50);

    const amount = consultationType === "CHAT"
      ? (durationMinutes / 60) * rate
      : rate;

    const platformFee = amount * 0.10;
    const consultantEarning = amount - platformFee;

    const balance = await Ledger.getWalletBalance(session.user.id);
    if (balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const bookingId = crypto.randomUUID();

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
        consultationType,
        location: consultationType === "PHYSICAL" ? location : null,
      } as any);

    if (bookingError) throw new Error(bookingError.message);

    await Ledger.holdInEscrow(
      session.user.id,
      amount,
      bookingId,
      `${consultationType} booking`
    );

    return NextResponse.json({ success: true, bookingId });
  } catch (error: any) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}