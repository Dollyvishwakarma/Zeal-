// Unified email export
export * from "./adapter";
export * from "./templates";
export { createResendAdapter } from "./resend";

import { createResendAdapter } from "./resend";
import type { EmailAdapter } from "./adapter";

let cachedAdapter: EmailAdapter | null = null;

export function getEmailAdapter(): EmailAdapter | null {
  if (cachedAdapter) return cachedAdapter;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Emails] RESEND_API_KEY missing - emails disabled");
    return null;
  }
  cachedAdapter = createResendAdapter({
    apiKey,
    defaultFrom: "Zeal <noreply@zeal.com>",
  });
  return cachedAdapter;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  const adapter = getEmailAdapter();
  if (!adapter) return false;
  try {
    await adapter.send(params);
    return true;
  } catch (err) {
    console.error("[Emails] send failed:", err);
    return false;
  }
}

// BATCH1_APPLIED
