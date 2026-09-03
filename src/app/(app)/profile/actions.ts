"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

export async function updateMyProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const first_name = String(formData.get("first_name") || "").trim() || null;
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const npn = String(formData.get("npn") || "").trim() || null;
  const scheduling_link = String(formData.get("scheduling_link") || "").trim() || null;

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  await supabase
    .from("profiles")
    .update({ first_name, middle_name, last_name, phone, npn, scheduling_link })
    .eq("id", user.id);
  revalidatePath("/profile");
}

// addCredential / deleteCredential (My Credentials) removed 9/3 — retired once NPN got its own
// field on Your Info and carrier/state numbers got their own homes in Carrier Logins / State
// Licenses (see schema.sql section 31/32). The advisor_credentials table itself is left in place,
// untouched — any old rows just sit there unused, same as the medical_conditions
// treating_physician column after that field was dropped; no destructive SQL either time.

// ─────────────────────────────────────────────────────────────
// Carrier Logins — a private, per-advisor replacement for the spreadsheet Karina was tracking
// her broker/carrier portal logins in (company, username, password, agent/agency numbers, portal
// link). Nothing here is client data.
// Profile Code removed 9/3 — Karina didn't need it ("i dont think we need it"). The
// carrier_logins.profile_code column is left in place, untouched, unused — same non-destructive
// pattern as advisor_credentials/medical_conditions.treating_physician.
// ─────────────────────────────────────────────────────────────

// addCarrierLogin/updateCarrierLogin return { ok, error } instead of swallowing the result —
// added 9/3 after Karina hit a case where Supabase rejected a save (the live table didn't have
// the new life_agent_number/annuity_agent_number columns yet, before she'd run the migration)
// and the form just silently discarded what she typed with no indication anything went wrong.
// Now a real Supabase error comes back to the UI instead of vanishing.

export async function addCarrierLogin(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const company = String(formData.get("company") || "").trim();
  if (!company) return { ok: false, error: "Company is required." };

  const { error } = await supabase.from("carrier_logins").insert({
    agent_id: user.id,
    company,
    username: String(formData.get("username") || "").trim() || null,
    password: String(formData.get("password") || "").trim() || null,
    life_agent_number: String(formData.get("life_agent_number") || "").trim() || null,
    annuity_agent_number: String(formData.get("annuity_agent_number") || "").trim() || null,
    agency_number: String(formData.get("agency_number") || "").trim() || null,
    link: String(formData.get("link") || "").trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function updateCarrierLogin(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const company = String(formData.get("company") || "").trim();
  if (!company) return { ok: false, error: "Company is required." };

  const { error } = await supabase
    .from("carrier_logins")
    .update({
      company,
      username: String(formData.get("username") || "").trim() || null,
      password: String(formData.get("password") || "").trim() || null,
      life_agent_number: String(formData.get("life_agent_number") || "").trim() || null,
      annuity_agent_number: String(formData.get("annuity_agent_number") || "").trim() || null,
      agency_number: String(formData.get("agency_number") || "").trim() || null,
      link: String(formData.get("link") || "").trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteCarrierLogin(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("carrier_logins").delete().eq("id", id);
  revalidatePath("/profile");
}

// ─────────────────────────────────────────────────────────────
// State Licenses — deliberately just State + License # + a resident flag + freeform notes. NO
// expiration/renewal/status fields: that's compliance data already tracked authoritatively in
// SureLC (Karina, 9/3) — duplicating it here would just be a second copy that goes stale.
// ─────────────────────────────────────────────────────────────

export async function addStateLicense(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const state = String(formData.get("state") || "").trim();
  if (!state) return { ok: false, error: "State is required." };

  const { error } = await supabase.from("state_licenses").insert({
    agent_id: user.id,
    state,
    license_number: String(formData.get("license_number") || "").trim() || null,
    is_resident: formData.get("is_resident") === "on",
    notes: String(formData.get("notes") || "").trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function updateStateLicense(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const state = String(formData.get("state") || "").trim();
  if (!state) return { ok: false, error: "State is required." };

  const { error } = await supabase
    .from("state_licenses")
    .update({
      state,
      license_number: String(formData.get("license_number") || "").trim() || null,
      is_resident: formData.get("is_resident") === "on",
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteStateLicense(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("state_licenses").delete().eq("id", id);
  revalidatePath("/profile");
}

// ─────────────────────────────────────────────────────────────
// Custom intake link handle — lets an advisor set a short, memorable slug (e.g. "karina") so
// their public intake link reads /intake/karina instead of the raw profile id. The id-based
// link keeps working forever regardless (see src/app/intake/[advisorId]/page.tsx, which tries
// both forms), so this is purely additive. Uniqueness (case-insensitive, across ALL advisors)
// is enforced by a DB index, not checked here first — under concurrent requests a first check
// can race, so the update is just attempted and a unique-violation (Postgres code 23505) is
// what actually decides whether it was taken. Matters more once this is licensed to more than
// one company and two advisors could otherwise grab the same handle.
// ─────────────────────────────────────────────────────────────

const INTAKE_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function updateIntakeSlug(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const raw = String(formData.get("intake_slug") || "").trim().toLowerCase();

  if (!raw) {
    // Clearing it is always allowed — falls back to the id-based link.
    await supabase.from("profiles").update({ intake_slug: null }).eq("id", user.id);
    revalidatePath("/profile");
    return { ok: true };
  }

  if (raw.length < 3 || raw.length > 40 || !INTAKE_SLUG_RE.test(raw)) {
    return {
      ok: false,
      error:
        "Use 3–40 characters: lowercase letters, numbers, and hyphens only (no leading, trailing, or double hyphens).",
    };
  }

  const { error } = await supabase.from("profiles").update({ intake_slug: raw }).eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `"${raw}" is already taken — try another.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/profile");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Cal.com Auto-Sync — connects an advisor's own Cal.com account so bookings made through their
// scheduling link create/update/remove a meeting on the right client's profile automatically.
// This registers a webhook on Cal.com pointed at /api/webhooks/cal/[agentId] (see that route),
// signed with a secret we generate here and hand to Cal.com — Cal.com sends that same secret
// back as a signature on every webhook call so we can verify it's really them.
//
// NOTE: originally built against Cal.com's v1 webhook API. Karina's first real "Connect" attempt
// (8/31) confirmed v1 is decommissioned — Cal.com returned HTTP 410 telling us to migrate to v2.
// Rebuilt this against Cal.com's official v2 docs (POST /v2/webhooks, Authorization: Bearer
// <apiKey>, body field is `triggers` not `eventTriggers`, response is wrapped in
// {status, data: {...}}). The webhook *delivery* itself (signature header, payload shape) is
// unchanged between v1 and v2, so the receiver route at /api/webhooks/cal/[agentId] needed no
// changes — only this registration call did.
// ─────────────────────────────────────────────────────────────

export async function connectCalCom(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const apiKey = String(formData.get("cal_api_key") || "").trim();
  if (!apiKey) return { ok: false, error: "Paste your Cal.com API key first." };

  const siteUrl = await getSiteUrl();
  const subscriberUrl = `${siteUrl}/api/webhooks/cal/${user.id}`;
  const secret = randomBytes(24).toString("hex");

  let res: Response;
  try {
    res = await fetch(`https://api.cal.com/v2/webhooks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        subscriberUrl,
        triggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
        active: true,
        secret,
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach Cal.com — check your connection and try again." };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `Cal.com rejected this (status ${res.status}). Double-check it's a Personal API Key from Cal.com's Settings → Developer → API Keys.${body ? ` Details: ${body.slice(0, 200)}` : ""}`,
    };
  }

  const data = (await res.json().catch(() => null)) as { data?: { id?: string | number } } | null;
  const webhookId = data?.data?.id != null ? String(data.data.id) : null;

  await supabase
    .from("profiles")
    .update({ cal_api_key: apiKey, cal_webhook_id: webhookId, cal_webhook_secret: secret })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { ok: true };
}

export async function disconnectCalCom(): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("cal_api_key, cal_webhook_id")
    .eq("id", user.id)
    .single();

  // Best-effort — if the key's already been revoked or the webhook was removed on Cal.com's
  // side, there's nothing more to clean up there. Either way we still clear our own record.
  if (profile?.cal_api_key && profile?.cal_webhook_id) {
    try {
      await fetch(`https://api.cal.com/v2/webhooks/${profile.cal_webhook_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${profile.cal_api_key}` },
      });
    } catch {
      // Ignore — see comment above.
    }
  }

  await supabase
    .from("profiles")
    .update({ cal_api_key: null, cal_webhook_id: null, cal_webhook_secret: null })
    .eq("id", user.id);

  revalidatePath("/profile");
}
