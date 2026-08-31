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
// NOTE: built against Cal.com's documented v1 webhook API (POST /v1/webhooks?apiKey=..., HMAC
// SHA-256 signature in the x-cal-signature-256 header) — this is the long-standing, widely used
// convention for Cal.com's Personal API Keys, but it's the one piece of this feature that
// couldn't be tested against a live Cal.com account from here. If "Connect" fails, the error
// message below comes straight from Cal.com's response, which is the fastest way to see exactly
// what needs adjusting.
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
    res = await fetch(`https://api.cal.com/v1/webhooks?apiKey=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriberUrl,
        eventTriggers: ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"],
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

  const data = (await res.json().catch(() => null)) as { webhook?: { id?: string } } | null;
  const webhookId = data?.webhook?.id ?? null;

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
      await fetch(
        `https://api.cal.com/v1/webhooks/${profile.cal_webhook_id}?apiKey=${encodeURIComponent(profile.cal_api_key)}`,
        { method: "DELETE" }
      );
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
