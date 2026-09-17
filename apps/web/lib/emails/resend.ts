// Resend implementation of EmailAdapter
import type { EmailAdapter, SendEmailParams, SendBatchEmailParams } from "./adapter";

interface ResendOptions {
  apiKey: string;
  defaultFrom?: string;
}

export function createResendAdapter(options: ResendOptions): EmailAdapter {
  const defaultFrom = options.defaultFrom || "Zeal <noreply@zeal.com>";

  async function sendOne(params: SendEmailParams) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from || defaultFrom,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend failed: ${err}`);
    }
    return (await res.json()) as { id: string };
  }

  return {
    send: sendOne,
    async sendBatch(params: SendBatchEmailParams[]) {
      const ids: string[] = [];
      for (const p of params) {
        const result = await sendOne({
          to: p.to,
          subject: p.subject,
          html: p.html,
        });
        ids.push(result.id);
      }
      return { ids };
    },
    async verifyDomain(domain) {
      const res = await fetch(`https://api.resend.com/domains/${domain}`, {
        headers: { Authorization: `Bearer ${options.apiKey}` },
      });
      if (!res.ok) return { verified: false };
      const data = (await res.json()) as { status?: string };
      return { verified: data.status === "verified" };
    },
  };
}

// BATCH1_APPLIED
