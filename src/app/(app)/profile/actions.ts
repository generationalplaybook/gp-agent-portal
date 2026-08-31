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
  const scheduling_link = String(formData.get("scheduling_link") || "").trim() || null;

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  await supabase
    .from("profiles")
    .update({ first_name, middle_name, last_name, phone, scheduling_link })
    .eq("id", user.id);
  revalidatePath("/profile");
}

export async function addCredential(formData: FormData) {
  const { supabase, user } = await requireUser();
  const label = String(formData.get("label") || "").trim();
  const code = String(formData.get("code") || "").trim();
  if (!label || !code) return;

  await supabase.from("advisor_credentials").insert({ agent_id: user.id, label, code });
  revalidatePath("/profile");
}

export async function deleteCredential(credentialId: string) {
  const { supabase } = await requireUser();
  await supabase.from("advisor_credentials").delete().eq("id", credentialId);
  revalidatePath("/profile");
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
