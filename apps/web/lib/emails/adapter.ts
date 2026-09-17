// Email service abstraction
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendBatchEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface EmailAdapter {
  send(params: SendEmailParams): Promise<{ id: string }>;
  sendBatch(params: SendBatchEmailParams[]): Promise<{ ids: string[] }>;
  verifyDomain(domain: string): Promise<{ verified: boolean }>;
}

// BATCH1_APPLIED
