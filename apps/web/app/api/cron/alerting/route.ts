import { NextResponse } from "next/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

const ALERT_WEBHOOK_ENV = "ALERT_WEBHOOK_URL";

interface AlertPayload {
  status: string;
  region?: string;
  version?: string;
  responseTimeMs?: number;
  checks?: Array<{ name: string; status: string; error?: string; latencyMs?: number }>;
}

async function sendAlert(text: string): Promise<void> {
  const webhook = process.env[ALERT_WEBHOOK_ENV];
  if (!webhook) {
    console.warn("[Alerting] " + ALERT_WEBHOOK_ENV + " not set — alert not sent");
    console.warn("[Alerting] Payload: " + text);
    return;
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[Alerting] Webhook failed:", err);
  }
}

export const GET = withErrorHandler(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== "Bearer " + secret) {
    throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let payload: AlertPayload | null = null;
  let ok = false;

  try {
    const res = await fetch(baseUrl + "/api/health", { cache: "no-store" });
    payload = (await res.json()) as AlertPayload;
    ok = res.ok && payload.status === "ok";
  } catch (err) {
    await sendAlert("🚨 Zeal health check FAILED — health endpoint unreachable: " + (err instanceof Error ? err.message : String(err)));
    return NextResponse.json({ sent: true, status: "unreachable" });
  }

  if (!ok && payload) {
    const failed = (payload.checks || []).filter((c) => c.status === "down");
    const summary = failed.map((c) => c.name + (c.error ? ": " + c.error : "")).join("\n");
    const message = [
      "🚨 Zeal health check status: " + payload.status,
      "Region: " + (payload.region || "unknown"),
      "Version: " + (payload.version || "unknown"),
      "Failed checks:",
      summary || "(none reported)",
    ].join("\n");
    await sendAlert(message);
    return NextResponse.json({ sent: true, status: payload.status });
  }

  return NextResponse.json({ sent: false, status: payload?.status || "unknown" });
});

