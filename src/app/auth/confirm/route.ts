import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles invite / password-reset / magic-link email confirmations.
//
// Supabase's email templates should point here (see the "Invite user" template in the
// Supabase dashboard) with a link like:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password
//
// This verifies the token SERVER-SIDE (via a Route Handler, which can set cookies) and
// establishes a real session before redirecting to `next`. This is deliberately NOT done by
// just pointing the email link straight at a client page (like /set-password) and hoping the
// browser picks up a session from the URL on its own — with @supabase/ssr's cookie-based
// session storage, that hand-off is unreliable, which is exactly the "This link has expired or
// is invalid" bug this route fixes.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/set-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/set-password?error=invalid`);
}
