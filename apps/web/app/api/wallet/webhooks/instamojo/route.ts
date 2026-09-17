import { NextResponse } from "next/server";
import crypto from "crypto";
import * as Ledger from "@/lib/wallet/ledger";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const payload = Object.fromEntries(formData.entries());

    // 1. Verify Instamojo MAC Signature
    const macProvided = payload.mac as string;
    const paymentId = payload.payment_id as string;
    const status = payload.status as string;
    const amount = parseFloat(payload.amount as string);
    const userId = payload.buyer_name as string; // Standardized to hold userId

    delete payload.mac;
    const sortedKeys = Object.keys(payload).sort();
    const macData = sortedKeys.map((k) => payload[k]).join('|');

    const expectedMac = crypto
      .createHmac('sha1', process.env.INSTAMOJO_SALT!)
      .update(macData)
      .digest('hex');

    if (expectedMac !== macProvided) {
      return NextResponse.json({ error: "Invalid MAC signature" }, { status: 401 });
    }

    if (status === "Credit") {
      const alreadyCredited = await Ledger.getByReferenceId(paymentId);
      if (alreadyCredited) {
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      await Ledger.creditFunds({
        userId,
        amount,
        description: "Instamojo Wallet Top-up",
        referenceId: paymentId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Instamojo Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
