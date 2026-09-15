import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles invite / password-reset / magic-link email confirmations.
//
// IMPORTANT: this is deliberately a page with a button the person must click — NOT a route
// that verifies the token the instant the link is loaded (a plain GET). Gmail (and most other
// providers) automatically pre-fetches links in incoming emails to scan them for safety. If
// visiting this URL immediately burned the one-time invite token, that automated scan would
// consume it seconds after the email is sent, before the real person ever gets to click it —
// which is exactly the "This link has expired or is invalid" bug we were chasing. Automated
// scanners fetch the page but don't submit forms, so gating the actual verification behind a
// real button click (a POST, via the server action below) defeats that.
//
// Custom SMTP is now set up (9/15), so this is wired up for both templates:
//   Invite user:      {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password
//   Reset password:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password
// (found 9/15 — Karina's reset-password link was hitting "This link has expired or is invalid"
// because the Reset Password template still pointed straight at {{ .ConfirmationURL }}, which
// verifies on page LOAD, not on click — exactly the auto-scanner problem described above, just
// never fixed for this second template. Same fix, same page, just point the template here too.)

// Karina, 9/15: "this continue screen seems useless" — fair, a bare button with no explanation
// reads as pointless filler. The click itself can't go away (that's the whole anti-prescanning
// fix above), but the screen can at least say why it's there instead of just "click to
// continue" — so each one now names the actual reason: confirming a real person, not an email
// scanner, is the one doing this.
const COPY: Record<string, { title: string; body: string; button: string }> = {
  invite: {
    title: "Confirm your invitation",
    body: "For your security, we ask you to confirm this yourself before it takes effect — email apps sometimes open links automatically, so a click here confirms it's really you.",
    button: "Accept Invitation",
  },
  recovery: {
    title: "Reset your password",
    body: "For your security, we ask you to confirm this yourself before it takes effect — email apps sometimes open links automatically, so a click here confirms it's really you.",
    button: "Continue",
  },
};
const DEFAULT_COPY = {
  title: "Confirm this link",
  body: "For your security, we ask you to confirm this yourself before it takes effect — email apps sometimes open links automatically, so a click here confirms it's really you.",
  button: "Continue",
};

async function acceptInvite(formData: FormData) {
  "use server";

  const token_hash = formData.get("token_hash");
  const type = formData.get("type");
  const next = (formData.get("next") as string) || "/set-password";

  if (typeof token_hash !== "string" || typeof type !== "string") {
    redirect("/set-password?error=invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash,
  });

  if (error) {
    redirect("/set-password?error=invalid");
  }

  redirect(next);
}

export default async function ConfirmInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  if (!token_hash || !type) {
    redirect("/set-password?error=invalid");
  }

  const copy = COPY[type] ?? DEFAULT_COPY;

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-[#1C1C1C]">{copy.title}</h1>
        <p className="mb-6 text-sm text-[#666]">{copy.body}</p>
        <form action={acceptInvite}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next ?? "/set-password"} />
          <button
            type="submit"
            className="w-full rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            {copy.button}
          </button>
        </form>
      </div>
    </div>
  );
}
