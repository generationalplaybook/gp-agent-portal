import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Thin wrapper around Resend's REST API (https://resend.com) — plain fetch, no SDK dependency,
// so there's nothing extra to install. Added 9/9 for two things: the new-intake alert email and
// the automatic-reminder alert email (see src/lib/reminder-notify.ts) — both advisor-facing,
// business-internal notifications, not client solicitation, so no TCPA concern here (that
// distinction only applies to texting/emailing a client/prospect, discussed earlier for the
// "Share Intake Form" idea).
//
// Requires RESEND_API_KEY + REMINDER_FROM_EMAIL (see .env.local.example, "Phase 3 — email
// reminders") — until Karina sets those up in Vercel's env vars, this silently no-ops (logs a
// warning, returns ok:false) rather than throwing. Every caller already treats a failed/skipped
// send as "couldn't notify," never as a reason to fail the actual submission or cron run it's
// riding along with.
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("sendEmail: RESEND_API_KEY / REMINDER_FROM_EMAIL not configured — skipping send.");
    return { ok: false, error: "Email sending isn't configured yet." };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`sendEmail: Resend returned ${res.status} — ${body}`);
      return { ok: false, error: `Resend error (${res.status})` };
    }

    return { ok: true };
  } catch (err) {
    console.warn("sendEmail: request to Resend failed —", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error sending email." };
  }
}
