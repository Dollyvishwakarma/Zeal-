// Email templates for all Zeal events
export interface EmailTemplate {
  subject: string;
  html: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const BRAND_HEADER = "#533AFD";
const BRAND_TEXT = "#5E4B8B";
const BRAND_MUTED = "#B8A1D9";

const WRAPPER_START = '<div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:' + BRAND_TEXT + ';">';
const WRAPPER_END = '<p style="font-size:12px;color:' + BRAND_MUTED + ';margin-top:32px;">Zeal - Your Wellness Sanctuary</p></div>';

const CTA_STYLE =
  'display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#9D7DC5,#533AFD);color:#fff;border-radius:12px;text-decoration:none;font-weight:500;margin-top:16px;';

export const emailTemplates = {
  welcome: (name: string): EmailTemplate => ({
    subject: "Welcome to Zeal",
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';font-weight:600;">Welcome, ' + escapeHtml(name) + '!</h1>' +
      '<p style="font-size:16px;line-height:1.6;">Your journey to wellness starts here.</p>' +
      '<p style="font-size:16px;line-height:1.6;">Explore our AI-powered services, connect with trusted consultants, and find peace.</p>' +
      '<a href="' + (process.env.NEXT_PUBLIC_APP_URL || "") + '/dashboard" style="' + CTA_STYLE + '">Start Your Journey</a>' +
      WRAPPER_END,
  }),

  consultantApplicationReceived: (name: string): EmailTemplate => ({
    subject: "Application Received",
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';">Thank you, ' + escapeHtml(name) + '!</h1>' +
      '<p style="font-size:16px;">We received your consultant application. Our team will review it within 24 hours.</p>' +
      '<p style="font-size:16px;">You will be notified once your profile is verified.</p>' +
      WRAPPER_END,
  }),

  consultantVerified: (name: string): EmailTemplate => ({
    subject: "You are now a verified Zeal Consultant",
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';">Congratulations, ' + escapeHtml(name) + '!</h1>' +
      '<p style="font-size:16px;">Your profile is verified. You can now:</p>' +
      '<ul style="font-size:16px;line-height:1.8;">' +
      '<li>Accept consultations (chat, audio, video, physical)</li>' +
      '<li>Manage your availability</li>' +
      '<li>Configure your white-label subdomain</li>' +
      '</ul>' +
      '<a href="' + (process.env.NEXT_PUBLIC_APP_URL || "") + '/consultant/dashboard" style="' + CTA_STYLE + '">Go to Your Workspace</a>' +
      WRAPPER_END,
  }),

  consultantRejected: (name: string, reason: string): EmailTemplate => ({
    subject: "Application Update",
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';">Hello ' + escapeHtml(name) + ',</h1>' +
      '<p style="font-size:16px;">After careful review, we are unable to approve your application at this time.</p>' +
      '<p style="font-size:16px;"><strong>Reason:</strong> ' + escapeHtml(reason) + '</p>' +
      '<p style="font-size:16px;">You may reapply after 30 days.</p>' +
      WRAPPER_END,
  }),

  paymentReceipt: (amount: number, reference: string): EmailTemplate => ({
    subject: "Payment Receipt - Rs " + amount.toFixed(2),
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';">Payment Received</h1>' +
      '<p style="font-size:16px;">Amount: <strong>Rs ' + amount.toFixed(2) + '</strong></p>' +
      '<p style="font-size:16px;">Reference: <code>' + escapeHtml(reference) + '</code></p>' +
      '<p style="font-size:16px;">Thank you for your payment.</p>' +
      WRAPPER_END,
  }),

  bookingConfirmation: (consultantName: string, date: string): EmailTemplate => ({
    subject: "Booking Confirmed",
    html:
      WRAPPER_START +
      '<h1 style="color:' + BRAND_HEADER + ';">Your booking is confirmed</h1>' +
      '<p style="font-size:16px;">Session with: <strong>' + escapeHtml(consultantName) + '</strong></p>' +
      '<p style="font-size:16px;">Scheduled for: <strong>' + escapeHtml(date) + '</strong></p>' +
      WRAPPER_END,
  }),
};

// BATCH1_APPLIED
