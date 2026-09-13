"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// Karina, 9/8 (locked out on another device): "I should get a reset email or a one time code to
// log in ... or if I wanna reset my password." Two separate paths, both started from the same
// "Forgot password?" link on /login:
//   1. sendPasswordReset — emails a link that lands on the existing /set-password page (same
//      redirect target the admin-invite flow already uses, so it's already an allowed redirect
//      URL in Supabase Auth settings — no dashboard config change needed).
//   2. sendLoginCode / verifyLoginCode — emails a 6-digit code (Supabase's email-OTP flow) that
//      the person types into a form on this site, rather than clicking a link. This sidesteps the
//      "email scanners pre-fetch links and burn the token" problem the /auth/confirm page's
//      comment describes for invites, since there's no link to prefetch — the code only works
//      when someone actually types it in.
//
// Both intentionally return a generic success message regardless of whether the email is on file
// — Supabase's own API behaves this way (it never reveals whether an address is registered), and
// this app follows suit rather than leaking who has an account.

type ActionResult = { ok: true } | { ok: false; error: string };

export async function sendPasswordReset(email: string): Promise<ActionResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Enter your email address." };

  try {
    const supabase = await createClient();
    const siteUrl = await getSiteUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${siteUrl}/set-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send that email." };
  }
}

export async function sendLoginCode(email: string): Promise<ActionResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Enter your email address." };

  try {
    const supabase = await createClient();
    // shouldCreateUser: false — this is an invite-only portal (see /signup), so a one-time-code
    // request should never silently create a new account for an unrecognized address.
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: false },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send that code." };
  }
}

export async function verifyLoginCode(email: string, token: string): Promise<ActionResult> {
  const trimmed = email.trim().toLowerCase();
  const code = token.trim();
  if (!code) return { ok: false, error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: trimmed, token: code, type: "email" });
  if (error) return { ok: false, error: error.message };

  redirect("/");
}
