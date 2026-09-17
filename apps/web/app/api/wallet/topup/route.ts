import { NextResponse } from "next/server";
import { createClient } from "@zeal/database/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount < 10) {
      return NextResponse.json({ error: "Invalid amount. Minimum ₹10 required." }, { status: 400 });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const endpoint = isProduction 
      ? "https://www.instamojo.com/api/1.1/payment-requests/" 
      : "https://test.instamojo.com/api/1.1/payment-requests/";

    const apiKey = process.env.INSTAMOJO_API_KEY;
    const authToken = process.env.INSTAMOJO_AUTH_TOKEN;

    // Fallback for development if keys are missing
    if (!apiKey || !authToken) {
      console.warn("Instamojo keys missing. Proceeding with mock URL for development.");
      return NextResponse.json({ 
        paymentUrl: `/wallet?mock_payment_success=true` 
      });
    }

    const payload = new URLSearchParams({
      purpose: "Wallet Topup",
      amount: amount.toString(),
      buyer_name: session.user.id,
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/wallet/webhooks/instamojo`,
      allow_repeated_payments: "False",
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "X-Auth-Token": authToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to create Instamojo payment request");
    }

    return NextResponse.json({ paymentUrl: data.payment_request.longurl });
  } catch (error: any) {
    console.error("Topup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
