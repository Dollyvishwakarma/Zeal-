import { NextResponse } from "next/server";
import { createClient } from "@zeal/database/server";

const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY!;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN!;
const INSTAMOJO_URL = "https://www.instamojo.com/api/1.1/payment-requests/"; 

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized request. Session invalid." }, { status: 401 });
    }

    if (!INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
      console.error("CRITICAL: Instamojo credentials missing from environment variables.");
      return NextResponse.json({ error: "Gateway configuration error." }, { status: 500 });
    }

    const body = await req.json();
    if (!body.amount || isNaN(body.amount) || body.amount < 1) {
      return NextResponse.json({ error: "Invalid payment amount provided." }, { status: 400 });
    }

    // Enterprise Server-to-Server Instamojo Call
    const response = await fetch(INSTAMOJO_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": INSTAMOJO_API_KEY,
        "X-Auth-Token": INSTAMOJO_AUTH_TOKEN,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        purpose: body.purpose || "Wallet Recharge - Zeal",
        amount: body.amount.toString(),
        buyer_name: user.email?.split("@")[0] || "Seeker",
        email: user.email || "",
        redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/wallet/verify`,
        webhook: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/billing/webhook`,
        allow_repeated_payments: "False",
      }),
    });

    const data = await response.json();
    
    if (data.success && data.payment_request?.longurl) {
      return NextResponse.json({ payment_url: data.payment_request.longurl });
    } else {
      console.error("Instamojo Gateway Rejection:", data);
      return NextResponse.json({ error: "The payment gateway rejected the request.", details: data.message }, { status: 502 });
    }

  } catch (error: any) {
    console.error("Fatal Instamojo Processing Error:", error);
    return NextResponse.json({ error: "Failed to initialize secure payment gateway." }, { status: 500 });
  }
}
