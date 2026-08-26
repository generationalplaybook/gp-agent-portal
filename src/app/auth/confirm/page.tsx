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
// Once custom SMTP is set up, point the "Invite user" (and reset/magic-link) email templates
// here instead of using {{ .ConfirmationURL }}:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}

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

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-[#1C1C1C]">Confirm your invitation</h1>
        <p className="mb-6 text-sm text-[#666]">
          Click below to accept your invitation to GP Advisor Portal.
        </p>
        <form action={acceptInvite}>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next ?? "/set-password"} />
          <button
            type="submit"
            className="w-full rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            Accept Invitation
          </button>
        </form>
      </div>
    </div>
  );
}
