"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { findMatchingClientId } from "@/lib/client-matching";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

export type PreIntakeTimeline = "asap" | "soon" | "exploring";

const TIMELINE_LABELS: Record<PreIntakeTimeline, string> = {
  asap: "Right away",
  soon: "In the next few months",
  exploring: "Just exploring for now",
};

export interface PreIntakeContact {
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  email: string;
  // Added 9/11 — Karina: "we should also ask for the city and state on the pre intake form."
  city: string;
  state: string;
}

export interface PreIntakeInputs {
  goals: string;
  amount: string;
  timeline?: PreIntakeTimeline;
}

// The lightweight first-touch link (Karina, 9/9): for someone who booked a meeting off "we do
// financial and legacy planning" without yet being told it's specifically life insurance/annuity
// products — so unlike submitIntake (intake/[advisorId]/actions.ts), this asks NOTHING that
// would tip that off (no health questions, no money type/qualified-vs-not, no product-specific
// funding questions). Deliberately does not run the recommendation engine either — there isn't
// nearly enough here (no DOB, no health, no financials) for runAnalyzer to produce anything
// trustworthy, and this submission was never meant to replace the deeper intake, just to prep the
// advisor with who's coming and what's on their mind.
//
// Public route, no session — same trust model as submitIntake: the admin client bypasses RLS,
// and every write here is scoped to exactly one new client (owned by whichever advisor this link
// resolves to) plus one note on it. Nothing else.
export async function submitPreIntake(
  advisorId: string,
  contact: PreIntakeContact,
  inputs: PreIntakeInputs
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const firstName = contact.firstName.trim();
  const lastName = contact.lastName.trim();
  const middleName = contact.middleName.trim() || null;
  const phone = contact.phone.trim();
  const email = contact.email.trim();
  const city = contact.city.trim() || null;
  const state = contact.state.trim() || null;
  const goals = inputs.goals.trim();

  if (!firstName || !lastName) return { ok: false, error: "First and last name are required." };
  if (!phone) return { ok: false, error: "Phone number is required." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!goals) return { ok: false, error: "Please tell us a bit about what you're looking for." };

  const { data: advisor } = await admin
    .from("profiles")
    .select("id, email, full_name, notify_new_intake_email")
    .eq("id", advisorId)
    .maybeSingle();
  if (!advisor) return { ok: false, error: "This link is no longer valid. Please contact your advisor." };

  // Match back to an existing client — the advisor already added them manually after a call, or
  // they already submitted this or the other intake link once before — instead of creating a
  // duplicate. See findMatchingClientId for why this is keyed on phone/email, never name.
  const existingClientId = await findMatchingClientId(admin, advisorId, phone, email);

  let clientId: string;
  if (existingClientId) {
    // Deliberately does NOT touch owner_id, stage, or source — a matched client keeps whatever
    // pipeline stage and lead-source attribution the advisor already has on file.
    const { error: updateError } = await admin
      .from("clients")
      .update({
        phone,
        email,
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        intake_pending_review: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingClientId);
    if (updateError) return { ok: false, error: updateError.message };
    clientId = existingClientId;
  } else {
    // full_name is derived by a DB trigger from first/middle/last — never set it directly here
    // (same as submitIntake).
    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({
        owner_id: advisorId,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone,
        email,
        city,
        state,
        stage: "lead",
        source: "Pre-Intake Form",
        intake_pending_review: true,
      })
      .select("id")
      .single();

    if (clientError || !client) {
      return { ok: false, error: clientError?.message || "Could not submit — please try again." };
    }
    clientId = client.id;
  }

  // Everything the (necessarily short) form actually asked lands as one note, right where an
  // advisor already looks first — Notes & Interaction History on the client's profile — rather
  // than in a field nothing renders (clients.notes_summary exists but isn't shown anywhere on a
  // client's own page today).
  const amount = inputs.amount.trim();
  const timelineLabel = inputs.timeline ? TIMELINE_LABELS[inputs.timeline] : null;
  const bodyLines = [
    "Submitted via Pre-Intake link — they haven't been told yet that this is about life insurance/annuities.",
    `What they're looking for: ${goals}`,
  ];
  if (amount) bodyLines.push(`Approximate amount they're thinking of investing: ${amount}`);
  if (timelineLabel) bodyLines.push(`Timeline: ${timelineLabel}`);

  const { error: noteError } = await admin.from("client_notes").insert({
    client_id: clientId,
    author_id: advisorId,
    body: bodyLines.join("\n"),
  });
  if (noteError) return { ok: false, error: noteError.message };

  // New-intake email alert (Karina, 9/9) — gated behind the advisor's own opt-in, default true.
  // Never blocks the submission itself: a failed/skipped send is swallowed, the client's already
  // saved by this point either way.
  if (advisor.email && advisor.notify_new_intake_email !== false) {
    const emailSiteUrl = await getSiteUrl();
    const clientName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    await sendEmail({
      to: advisor.email,
      subject: `New pre-intake submitted — ${clientName}`,
      html: `
        <p>Hi ${advisor.full_name ?? "there"},</p>
        <p><strong>${clientName}</strong> just completed the Pre-Intake form.</p>
        <p><a href="${emailSiteUrl}/clients/${clientId}">View their profile</a></p>
        <p style="color:#888;font-size:12px;">You're getting this because new-intake alerts are turned on in
        My Profile. You can turn them off there any time.</p>
      `,
    });
  }

  return { ok: true };
}
