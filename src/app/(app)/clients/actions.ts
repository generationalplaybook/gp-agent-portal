"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ClientStage } from "@/lib/types";
import { inverseRelationship } from "@/lib/family";
import type { OutreachOutcome } from "@/lib/products";
import { addReminder } from "../reminders/actions";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// height_ft / height_in / weight are stored as integer columns on clients — this keeps a blank
// or non-numeric form field from being sent through as anything other than null.
function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export async function createClientRecord(formData: FormData) {
  const { supabase, user } = await requireUser();

  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const birth_date = String(formData.get("birth_date") || "").trim() || null;
  const gender = String(formData.get("gender") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;
  const stage = (String(formData.get("stage") || "lead") as ClientStage);
  const height_ft = parseIntOrNull(formData.get("height_ft"));
  const height_in = parseIntOrNull(formData.get("height_in"));
  const weight = parseIntOrNull(formData.get("weight"));
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const timezone = String(formData.get("timezone") || "").trim() || null;

  // Gender made required 9/13 — Karina: "gender needs to be not optional on the intake forms."
  // The form's own `required` attribute already blocks a normal submit; this is the same
  // belt-and-suspenders check first/last name already got, in case this action is ever hit
  // directly.
  if (!first_name || !last_name)
    redirect("/clients/new?error=" + encodeURIComponent("First and last name are required."));
  if (!gender) redirect("/clients/new?error=" + encodeURIComponent("Gender is required."));

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  const { data, error } = await supabase
    .from("clients")
    .insert({
      owner_id: user.id,
      first_name,
      middle_name,
      last_name,
      phone,
      email,
      birth_date,
      gender,
      source,
      stage,
      height_ft,
      height_in,
      weight,
      city,
      state,
      timezone,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/clients/new?error=" + encodeURIComponent(error?.message || "Could not create client."));
  }

  revalidatePath("/clients");
  redirect(`/clients/${data!.id}`);
}

// 9/11 — Karina, moving a client to Pending: "once a client is pending, can we set an automatic
// nudge maybe for three or four days out where it goes into an automatic reminder to check on the
// pending ones?"
// 9/13 — she found that moving a client's Stage to Pending wasn't producing any visible reminder.
// Turned out the original build of this (a daily cron, check-pending-checkins, that only fired
// once stage_entered_pending_at had aged 3+ days) was still fully live the whole time — a 9/12
// schema.sql comment had incorrectly claimed it was retired. She confirmed she still wants the
// Stage dropdown to trigger a check-in reminder — "even if they have a policy enforced, if they're
// doing another policy, I would, in theory, change their profile to pending" — just not the
// invisible-for-3-days version. This creates the reminder IMMEDIATELY instead, the same pattern as
// client_products.pending_approval_at's markPendingApproval (schema.sql section 51): dated 3 days
// out, so it shows up right away in the Reminders list and this client's own Reminders card,
// rather than waiting on a later cron run. The old cron (route + vercel.json entry) is deleted.
//
// 9/16 — expanded from one reminder to four, and split into two stages. Karina walked through her
// real pipeline: Applied waits on the carrier's decision; once feedback starts, the client moves
// into Pending, which is the underwriting wait itself (carriers often allow up to ~30 days).
// Separately, once the carrier has actually said yes but the client hasn't paid, that's now its
// own stage, Approved, sitting between Pending and Issued — previously Pending was overloaded to
// mean this case too (see the original comment above: "approved for a quote but the premium hadn't
// been paid yet"). Both stages now auto-create four check-in reminders at day 3/7/10/14 of
// whichever stage the client just entered, instead of Pending's original single day-3 one. The
// two stages differ only in what happens at day 14 and after:
//   - Pending: real carrier timelines vary, so day 14 isn't a hard stop — the Reminders page shows
//     a visible "Extend 14 more days" button on that reminder (see reminders/ReminderRow.tsx),
//     which restarts a fresh 3/7/10/14 cycle. Left alone, it just sits there overdue like any
//     other ignored reminder.
//   - Approved: Karina was explicit this should never drag past 2 weeks — "by the 14th, if it's
//     not paid for, I don't know what to tell an advisor" — so there's no extend option. Day 14's
//     message just reads urgent in plain text (prefixed "⚠️ URGENT"), same row style as everything
//     else, no new tag or column.
// Karina, asked whether clients already sitting in Pending today should be moved to Approved to
// match (since that's what the stage was actually built for): "keep them in pending" — no bulk
// migration. Anyone actually approved-and-unpaid today gets moved to Approved by hand, same as any
// other stage change; existing Pending clients are simply read under Pending's new meaning (the
// carrier-underwriting cadence, with Extend) going forward.
const STAGE_CHECKIN_DAYS = [3, 7, 10, 14] as const;

type StageBatchKind = "pending" | "approved";

const STAGE_BATCH_FIELDS: Record<StageBatchKind, { enteredAt: string; reminderIds: string }> = {
  pending: { enteredAt: "stage_entered_pending_at", reminderIds: "pending_reminder_ids" },
  approved: { enteredAt: "stage_entered_approved_at", reminderIds: "approved_reminder_ids" },
};

function stageBatchMessages(kind: StageBatchKind, fullName: string): string[] {
  if (kind === "pending") {
    return [
      `Check in: ${fullName} still with the carrier for underwriting (day 3)`,
      `Check in: ${fullName} still with the carrier for underwriting (day 7)`,
      `Check in: ${fullName} still with the carrier for underwriting (day 10)`,
      `${fullName} still with the carrier for underwriting — day 14 of this cycle. Extend if it's not resolved yet.`,
    ];
  }
  return [
    `Check in: ${fullName} approved, still awaiting payment (day 3)`,
    `Check in: ${fullName} still awaiting payment (day 7)`,
    `Check in: ${fullName} still awaiting payment (day 10)`,
    `⚠️ URGENT — ${fullName} approved 14 days, still unpaid. Close this out before it lapses.`,
  ];
}

// Creates the four day-3/7/10/14 reminders for a client entering Pending or Approved, returning
// the patch fields (entered-at timestamp + the new reminder ids) to write onto the client row.
async function createStageBatch(
  clientId: string,
  fullName: string,
  kind: StageBatchKind
): Promise<Record<string, unknown>> {
  const fields = STAGE_BATCH_FIELDS[kind];
  const messages = stageBatchMessages(kind, fullName);
  const ids: string[] = [];
  for (let i = 0; i < STAGE_CHECKIN_DAYS.length; i++) {
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + STAGE_CHECKIN_DAYS[i]);
    ids.push(await addReminder({ clientId }, remindAt.toISOString(), messages[i]));
  }
  return { [fields.enteredAt]: new Date().toISOString(), [fields.reminderIds]: ids };
}

// Deletes whichever of Pending's or Approved's check-in reminders are currently live on this
// client and clears both batches' fields — called from every path that can move a client out of
// either stage (the Stage dropdown below, resolveQuotesOnIssue, and markOutreachOutcome further
// down), so a client leaving Pending or Approved via any of them doesn't leave orphaned "check on
// this" reminders behind. Safe to call unconditionally (deleting an empty set of ids is a no-op),
// so callers don't need to first work out which of the two stages the client was actually in.
async function clearStageBatches(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  clientId: string
): Promise<Record<string, unknown>> {
  const { data: current } = await supabase
    .from("clients")
    .select("pending_reminder_ids, approved_reminder_ids")
    .eq("id", clientId)
    .single();

  const allIds = [...(current?.pending_reminder_ids ?? []), ...(current?.approved_reminder_ids ?? [])];
  if (allIds.length > 0) {
    await supabase.from("reminders").delete().in("id", allIds);
  }

  return {
    stage_entered_pending_at: null,
    pending_reminder_ids: [],
    stage_entered_approved_at: null,
    approved_reminder_ids: [],
  };
}

// Restarts Pending's check-in cycle for a client whose carrier still hasn't responded past day
// 14 — the "Extend 14 more days" button on the Reminders page (see ReminderRow.tsx). Deletes
// whatever's left of the current 3/7/10/14 batch (including already-completed ones — a fresh
// cycle starts clean) and creates a new one dated from today. No-ops if the client isn't actually
// in Pending anymore (the button shouldn't be visible in that case, but this guards against a
// stale click).
export async function extendPendingCheckin(clientId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: current } = await supabase
    .from("clients")
    .select("stage, full_name, pending_reminder_ids")
    .eq("id", clientId)
    .single();
  if (current?.stage !== "pending") return;

  if (current.pending_reminder_ids?.length) {
    await supabase.from("reminders").delete().in("id", current.pending_reminder_ids);
  }

  const patch = await createStageBatch(clientId, current.full_name ?? "client", "pending");
  const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
  revalidatePath("/");
}

export async function updateStage(clientId: string, stage: ClientStage) {
  const { supabase } = await requireUser();

  const { data: current } = await supabase
    .from("clients")
    .select("stage, pending_reminder_ids, approved_reminder_ids, full_name")
    .eq("id", clientId)
    .single();

  // Already in Pending or Approved with a live batch AND staying in that same stage — don't stack
  // a second batch on top of it (the Stage dropdown only fires on an actual change, so this mainly
  // guards against this action being called some other way). Everything else about the row is
  // untouched either way.
  //
  // Bug fixed 9/13 (Pending-only at the time; same shape kept here for Approved): Karina — "I
  // undid a client's pipeline from pending to quoted and then put it back to pending, and still no
  // reminder has been set." Root cause: this check only looked at the CURRENT stage/batch, never
  // the stage being moved TO, so a real transition out of Pending could read as "already
  // pending" and skip the clear. Checking that `stage` (the target) matches `current?.stage` here
  // means this shortcut only fires on a redundant same-stage call — any real transition, in or out
  // of either stage, always goes through the create-batch or clear-batch branch as intended.
  const alreadyInStageWithBatch =
    stage === current?.stage &&
    ((stage === "pending" && (current?.pending_reminder_ids?.length ?? 0) > 0) ||
      (stage === "approved" && (current?.approved_reminder_ids?.length ?? 0) > 0));

  // 9/18 — bug found live (Karina: "i changed a client to approved and it doesnt change the
  // status", then a screenshot full of duplicated day-3/7/10/14 reminders): this used to build
  // the reminder batch FIRST, then write { stage, ...patch } in one combined update with its
  // error silently ignored. When that write failed — here, because the live database hadn't
  // actually picked up the 'approved' enum value yet — the reminders had already been created
  // (they're separate inserts, unaffected by the enum), but `stage` itself never changed. The
  // dropdown looked like nothing happened, so retrying it ran the whole thing again, doubling
  // every reminder each time with the stage still stuck. Now the stage itself is written FIRST,
  // on its own, and any error throws immediately — before any reminder exists — so a failure here
  // is loud (surfaces in the UI, see StageSelect.tsx) instead of quietly leaving orphaned
  // reminders behind with nothing to show for them.
  const { error: stageError } = await supabase.from("clients").update({ stage }).eq("id", clientId);
  if (stageError) throw new Error(stageError.message);

  if (!alreadyInStageWithBatch) {
    let patch: Record<string, unknown> = {};
    if (current?.stage === "pending" || current?.stage === "approved") {
      patch = { ...patch, ...(await clearStageBatches(supabase, clientId)) };
    }
    if (stage === "pending" || stage === "approved") {
      patch = { ...patch, ...(await createStageBatch(clientId, current?.full_name ?? "client", stage)) };
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("clients").update(patch).eq("id", clientId);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
  // Bug fixed 9/13 — Karina: "the automatic reminder is being generated... but it's only on
  // their profile. It doesn't show up in the home page reminders due... and when I go into the
  // reminders tab, there's also nothing there pending." The Reminders tab itself (/reminders,
  // just above) was already being revalidated — but the Reminders Due card on the home page reads
  // the exact same reminders table and this route was never in this function's revalidatePath
  // list at all, so it kept serving Next's cached version of "/" from before the reminder existed
  // until something else happened to revalidate it. Every other reminder-creating path in this
  // file (markPendingApproval, markOutreachOutcome) already revalidates "/" — this one just never
  // did.
  revalidatePath("/");
}

// Moves a client to Issued once the advisor has said which tracked quote actually won —
// keeps that one (clearing its is_quote flag) and deletes the rest outright, per Karina: once
// a client is issued, the quotes that lost don't need to stick around.
export async function resolveQuotesOnIssue(
  clientId: string,
  chosenProductId: string,
  allQuoteProductIds: string[]
): Promise<void> {
  const { supabase } = await requireUser();
  // 9/13 — routed through clearStageBatches (not a bare stage_entered_pending_at: null) so a
  // client resolved onto Issue while still sitting in Pending or Approved doesn't leave that
  // stage's check-in reminders behind — same cleanup the Stage dropdown itself now does (see
  // updateStage above).
  await supabase.from("clients").update({ stage: "issued", ...(await clearStageBatches(supabase, clientId)) }).eq("id", clientId);
  await supabase.from("client_products").update({ is_quote: false }).eq("id", chosenProductId);
  const toDelete = allQuoteProductIds.filter((id) => id !== chosenProductId);
  if (toDelete.length > 0) {
    await supabase.from("client_products").delete().in("id", toDelete);
  }
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  // Same gap as updateStage above (fixed 9/13) — this can delete live Pending/Approved check-in
  // reminders via clearStageBatches, so the Reminders tab and the home page's Reminders Due
  // card both need to hear about it too, not just the client's own profile.
  revalidatePath("/reminders");
  revalidatePath("/");
}

// Clears the "needs review" flag set when a client came in through an advisor's Intake Link.
// household_summary is left in place — it's still useful context after review, just no longer
// urgent.
export async function markClientReviewed(clientId: string) {
  const { supabase } = await requireUser();
  await supabase.from("clients").update({ intake_pending_review: false }).eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));

  // Notes, tasks, reminders, analyses, and the financial plan all cascade-delete
  // with the client (see supabase/schema.sql) — this one delete cleans up everything.
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateContactInfo(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const birth_date = String(formData.get("birth_date") || "").trim() || null;
  const gender = String(formData.get("gender") || "").trim() || null;
  const height_ft = parseIntOrNull(formData.get("height_ft"));
  const height_in = parseIntOrNull(formData.get("height_in"));
  const weight = parseIntOrNull(formData.get("weight"));
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const timezone = String(formData.get("timezone") || "").trim() || null;

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  // Note: `source` (lead source) is intentionally NOT handled here — it's edited separately via
  // updateLeadSource below, from its own field in the sidebar, so this save-on-blur form can't
  // clobber it with a stale value.
  await supabase
    .from("clients")
    .update({
      first_name,
      middle_name,
      last_name,
      phone,
      email,
      birth_date,
      gender,
      height_ft,
      height_in,
      weight,
      city,
      state,
      timezone,
    })
    .eq("id", clientId);

  await syncContactInfoToLinkedRecruit(clientId, { phone, email, state });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

// Keeps a linked recruit's phone/email/state matching this client's — the client is the source
// of truth once the two are linked (Karina: "if an email is changed somewhere will it update
// across all of that person's profiles?" — client → recruit, one-way). Only pushes fields that
// have an actual value here; clearing a field on the client doesn't blank out the recruit's copy
// (avoids accidentally wiping recruit-only data from a client-side edit). Most clients have no
// linked recruit at all, so this is a no-op update touching zero rows for the common case.
async function syncContactInfoToLinkedRecruit(
  clientId: string,
  info: { phone: string | null; email: string | null; state: string | null }
) {
  const patch: Record<string, string> = {};
  if (info.phone) patch.phone = info.phone;
  if (info.email) patch.email = info.email;
  if (info.state) patch.state = info.state;
  if (Object.keys(patch).length === 0) return;

  const { supabase } = await requireUser();
  const { data: linkedRecruits } = await supabase.from("recruits").select("id").eq("client_id", clientId);
  if (!linkedRecruits || linkedRecruits.length === 0) return;

  await supabase.from("recruits").update(patch).eq("client_id", clientId);
  for (const r of linkedRecruits) revalidatePath(`/team/${r.id}`);
  revalidatePath("/team");
}

// Lead source (Referral, Facebook ad, walk-in, etc.) — a lightweight, optional note on where
// this client came from. Split into its own action/field (sidebar, not the main Contact Info
// card) so it doesn't compete for attention with the client's actual contact details, and so it
// can't be accidentally overwritten by a save from a totally different field on the page.
export async function updateLeadSource(clientId: string, source: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("clients")
    .update({ source: source.trim() || null })
    .eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
}

export async function addNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await supabase.from("client_notes").insert({ client_id: clientId, author_id: user.id, body });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateNote(noteId: string, clientId: string, body: string): Promise<void> {
  const { supabase } = await requireUser();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note can't be empty.");
  const { error } = await supabase.from("client_notes").update({ body: trimmed }).eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteNote(noteId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function addTask(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const title = String(formData.get("title") || "").trim();
  const dueAtRaw = String(formData.get("due_at") || "");
  if (!title) return;

  await supabase.from("client_tasks").insert({
    client_id: clientId,
    title,
    due_at: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function toggleTask(taskId: string, clientId: string, done: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("client_tasks").update({ done }).eq("id", taskId);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteTask(taskId: string, clientId: string) {
  const { supabase } = await requireUser();
  await supabase.from("client_tasks").delete().eq("id", taskId);
  revalidatePath(`/clients/${clientId}`);
}

// ─────────────────────────────────────────────────────────────
// In-person meetings — entered directly on the client's profile (not booked through a
// Cal.com-style page), so it shows up on the record immediately. The calendar invite (.ics)
// that goes on the advisor's and client's actual calendars is generated client-side from this
// same data — see MeetingsCard.tsx — nothing here talks to an external calendar.
// ─────────────────────────────────────────────────────────────

export async function addMeeting(
  clientId: string,
  meetingAtIso: string,
  location: string,
  notes: string
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!meetingAtIso) throw new Error("Pick a date and time.");

  const { error } = await supabase.from("client_meetings").insert({
    client_id: clientId,
    agent_id: user.id,
    meeting_at: meetingAtIso,
    location: location.trim() || null,
    notes: notes.trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  // Added 9/7 — a meeting can now also be created from the global Meetings tab itself (see
  // AddMeetingButton.tsx), not just from a client's profile, so that list needs to refresh too.
  // Mirrors deleteMeeting below, which already revalidates both for the same reason.
  revalidatePath("/meetings");
}

export async function deleteMeeting(meetingId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_meetings").delete().eq("id", meetingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  // Also shows up in the global Meetings tab (src/app/(app)/meetings/page.tsx) — keep that in
  // sync too, since a delete can be triggered from either place.
  revalidatePath("/meetings");
}

// ─────────────────────────────────────────────────────────────
// Family linking — family_id is just a shared grouping key (a random uuid). Every client
// row that carries the same family_id is treated as one household. Ordinary RLS on the
// clients table ("owner sees their own, admin sees all") already governs every read/write
// below — no additional access-control logic needed here.
// ─────────────────────────────────────────────────────────────

async function ensureFamilyId(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  clientId: string,
  currentFamilyId: string | null
): Promise<string> {
  if (currentFamilyId) return currentFamilyId;
  const newFamilyId = randomUUID();
  const { error } = await supabase.from("clients").update({ family_id: newFamilyId }).eq("id", clientId);
  if (error) throw new Error(error.message);
  return newFamilyId;
}

// Writes the OTHER side of the relationship back onto the profile you linked/added from —
// e.g. adding someone as "Child" from the parent's page should also record "Parent" on the
// parent's own row, which the schema (one flat family_relationship field per client) never did
// automatically before. Only fills it in when that field is still blank, so it never clobbers an
// existing role for someone who already belongs to a family group with more than two people (a
// parent who's "Parent" to one child shouldn't get overwritten when a second child is added).
// `reverseRelationship` is the advisor's own explicit answer for non-standard relationships (see
// FAMILY_RELATIONSHIP_OPTIONS / inverseRelationship in lib/family.ts) — used when given, otherwise
// falls back to the automatic inverse, otherwise leaves the field untouched.
async function maybeSetReverseRelationship(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  clientId: string,
  currentRelationship: string | null,
  forwardRelationship: string,
  reverseRelationship?: string
): Promise<void> {
  if (currentRelationship && currentRelationship.trim()) return;

  const value = reverseRelationship?.trim() || inverseRelationship(forwardRelationship) || "";
  if (!value) return;

  const { error } = await supabase.from("clients").update({ family_relationship: value }).eq("id", clientId);
  if (error) throw new Error(error.message);
}

export async function searchFamilyCandidates(
  query: string,
  excludeIds: string[]
): Promise<{ id: string; full_name: string; stage: ClientStage }[]> {
  const { supabase } = await requireUser();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, stage")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(15);

  if (error || !data) return [];
  return data.filter((c) => !excludeIds.includes(c.id));
}

// Powers the client picker on the Meetings/Reminders "quick add" flow (ClientPicker.tsx) — added
// 9/7 per Karina: "right now, it's too many steps [to schedule a meeting]... it could be much
// faster by just going into one of the tabs that I need," rather than having to open a specific
// client's profile first. Deliberately a separate action from searchFamilyCandidates above (same
// underlying query) rather than reusing it with an empty excludeIds array: that one's return shape
// is family-linking-specific (stage, no birth_date) and its name ties it to that feature, so a
// second small action keeps each call site's intent obvious. Includes birth_date so the picker can
// show it as a disambiguator when two results share the same name (Karina: "when there is a client
// that's got the same name, it also shows their birth date underneath their name"). Also includes
// email (added 9/8 for ScheduleCallButton.tsx, to prefill the client's email on the booking page,
// same as ScheduleCallCard.tsx already does from a client's own profile) — harmless to fetch for
// callers that don't use it.
export async function searchClientsForPicker(
  query: string
): Promise<{ id: string; full_name: string; birth_date: string | null; email: string | null }[]> {
  const { supabase } = await requireUser();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, birth_date, email")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(15);

  if (error || !data) return [];
  return data;
}

export async function linkExistingFamilyMember(
  clientId: string,
  relatedClientId: string,
  relationship: string,
  reverseRelationship?: string
): Promise<void> {
  const { supabase } = await requireUser();
  if (clientId === relatedClientId) throw new Error("Can't link a client to themselves.");

  const { data: current, error: currentErr } = await supabase
    .from("clients")
    .select("family_id, family_relationship")
    .eq("id", clientId)
    .single();
  if (currentErr || !current) throw new Error(currentErr?.message || "Client not found.");

  const { data: related, error: relatedErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", relatedClientId)
    .single();
  if (relatedErr || !related) throw new Error(relatedErr?.message || "That client could not be found.");

  const familyId = await ensureFamilyId(supabase, clientId, current.family_id);

  // If the person being linked already belongs to a different family group, fold that whole
  // group into this one rather than blocking — e.g. linking in a grandchild who's already
  // grouped with a sibling should bring both siblings along, not just the one you searched for.
  if (related.family_id && related.family_id !== familyId) {
    const { error: mergeErr } = await supabase
      .from("clients")
      .update({ family_id: familyId })
      .eq("family_id", related.family_id);
    if (mergeErr) throw new Error(mergeErr.message);
  }

  const { error: linkErr } = await supabase
    .from("clients")
    .update({ family_id: familyId, family_relationship: relationship.trim() || null })
    .eq("id", relatedClientId);
  if (linkErr) throw new Error(linkErr.message);

  await maybeSetReverseRelationship(supabase, clientId, current.family_relationship, relationship, reverseRelationship);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${relatedClientId}`);
  revalidatePath("/clients");
}

export async function addNewFamilyMember(
  clientId: string,
  fields: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    relationship: string;
    reverseRelationship?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
    email?: string;
  }
): Promise<void> {
  const { supabase, user } = await requireUser();
  const first_name = fields.first_name.trim();
  const last_name = fields.last_name.trim();
  if (!first_name || !last_name) throw new Error("First and last name are required.");

  const { data: current, error: currentErr } = await supabase
    .from("clients")
    .select("family_id, family_relationship")
    .eq("id", clientId)
    .single();
  if (currentErr || !current) throw new Error(currentErr?.message || "Client not found.");

  const familyId = await ensureFamilyId(supabase, clientId, current.family_id);

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  const { error } = await supabase.from("clients").insert({
    owner_id: user.id,
    first_name,
    middle_name: fields.middle_name?.trim() || null,
    last_name,
    phone: fields.phone?.trim() || null,
    email: fields.email?.trim() || null,
    birth_date: fields.birth_date?.trim() || null,
    gender: fields.gender?.trim() || null,
    stage: "lead",
    family_id: familyId,
    family_relationship: fields.relationship.trim() || null,
  });
  if (error) throw new Error(error.message);

  await maybeSetReverseRelationship(
    supabase,
    clientId,
    current.family_relationship,
    fields.relationship,
    fields.reverseRelationship
  );

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function unlinkFamilyMember(clientId: string, memberIdToRemove: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: member, error: memberErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", memberIdToRemove)
    .single();
  if (memberErr || !member) throw new Error(memberErr?.message || "Client not found.");

  const familyId = member.family_id;

  const { error } = await supabase
    .from("clients")
    .update({ family_id: null, family_relationship: null })
    .eq("id", memberIdToRemove);
  if (error) throw new Error(error.message);

  // If that leaves only one person in the family group, a "family of one" is meaningless —
  // clear their family_id too so the section cleanly resets to "no family linked yet".
  if (familyId) {
    const { data: remaining } = await supabase.from("clients").select("id").eq("family_id", familyId);
    if (remaining && remaining.length === 1) {
      await supabase
        .from("clients")
        .update({ family_id: null, family_relationship: null })
        .eq("id", remaining[0].id);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${memberIdToRemove}`);
  revalidatePath("/clients");
}

// ─────────────────────────────────────────────────────────────
// Client Products — policies/coverage a client already owns (not something the advisor is
// selling them now), so the advisor can see at a glance what's in force and, for a term
// policy, whether it can still convert to a permanent product without a new medical exam.
// ─────────────────────────────────────────────────────────────

export interface ProductFields {
  product_name: string;
  product_type?: string;
  carrier?: string;
  policy_number?: string;
  issue_date?: string;
  expiration_date?: string;
  // Broadened 9/4: "this is a term policy" in general (convertible or not) — controls whether
  // the term/conversion fields below are shown/saved as meaningful, or just left blank.
  is_convertible?: boolean;
  conversion_deadline?: string;
  final_conversion_deadline?: string;
  no_exam_declined_at?: string;
  // Plain end-of-term date, for a term policy that does NOT have a conversion option.
  term_end_date?: string;
  conversion_notes?: string;
  face_amount?: string;
  premium?: string;
  // Bare-minimum monthly premium that keeps the policy from lapsing (usually lower than
  // `premium`, common on UL/IUL products).
  minimum_premium?: string;
  notes?: string;
  // Who owns this product right now, when it's someone other than the client it's attached to —
  // e.g. a parent owns a juvenile policy until the covered child turns 18. Set to another
  // linked family member's client id, or left empty when the client on the product owns it.
  owner_client_id?: string;
  riders?: string[];
  // Annuity-specific fields (added 9/4) — see ClientProduct in lib/types.ts for the full
  // rationale. Only meaningful when product_type is "Annuity".
  annuity_contribution_amount?: string;
  annuity_contribution_frequency?: string;
  contract_value?: string;
  annuity_surrender_end_date?: string;
  // The annuity's own maturity/contract-end date (added 9/7, per Karina: "if it's a five year, a
  // seven year, a ten or a fifteen year, we need to know what that date is") — distinct from
  // annuity_surrender_end_date (the carrier's early-withdrawal penalty window) above; an annuity
  // contract can outlast its surrender charge period. Now wired into the Outreach queue alongside
  // it — see getNextOutreachMilestone in lib/products.ts.
  annuity_contract_end_date?: string;
  // Transient add-time flag only — NOT a column on client_products itself. When set on
  // addProduct, immediately marks the new product pending approval the same way
  // markPendingApproval does (see below) so a product entered as already-submitted-and-waiting
  // doesn't need a separate follow-up click. Karina, 9/12: added a product for a client "in
  // pending... it's pending approval" in the same breath as creating it.
  pending_approval?: boolean;
}

function parseNumberOrNull(v?: string): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function addProduct(clientId: string, fields: ProductFields): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  // A product added while the client is in the Quoted stage is a candidate, not a confirmed
  // policy yet — flag it automatically so it can be resolved (kept vs. deleted) once the
  // client actually moves to Issued. See resolveQuotesOnIssue below.
  const { data: clientRow } = await supabase.from("clients").select("stage").eq("id", clientId).single();
  const is_quote = clientRow?.stage === "quoted";

  const { data: inserted, error } = await supabase
    .from("client_products")
    .insert({
      client_id: clientId,
      product_name,
      product_type: fields.product_type?.trim() || null,
      carrier: fields.carrier?.trim() || null,
      policy_number: fields.policy_number?.trim() || null,
      issue_date: fields.issue_date?.trim() || null,
      expiration_date: fields.expiration_date?.trim() || null,
      is_convertible: fields.is_convertible ?? false,
      conversion_deadline: fields.conversion_deadline?.trim() || null,
      final_conversion_deadline: fields.final_conversion_deadline?.trim() || null,
      no_exam_declined_at: fields.no_exam_declined_at?.trim() || null,
      term_end_date: fields.term_end_date?.trim() || null,
      conversion_notes: fields.conversion_notes?.trim() || null,
      face_amount: parseNumberOrNull(fields.face_amount),
      premium: parseNumberOrNull(fields.premium),
      minimum_premium: parseNumberOrNull(fields.minimum_premium),
      notes: fields.notes?.trim() || null,
      owner_client_id: fields.owner_client_id?.trim() || null,
      riders: fields.riders ?? [],
      is_quote,
      annuity_contribution_amount: parseNumberOrNull(fields.annuity_contribution_amount),
      annuity_contribution_frequency: fields.annuity_contribution_frequency?.trim() || null,
      contract_value: parseNumberOrNull(fields.contract_value),
      annuity_surrender_end_date: fields.annuity_surrender_end_date?.trim() || null,
      annuity_contract_end_date: fields.annuity_contract_end_date?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Karina, 9/12: a product can be entered already pending carrier approval — don't make her add
  // it first and then click a separate "Mark Pending Approval" after. Reuses the exact same
  // reminder-creation logic as that action (see below) rather than duplicating it.
  if (fields.pending_approval && inserted) {
    await markPendingApproval(inserted.id, clientId, product_name);
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function updateProduct(productId: string, clientId: string, fields: ProductFields): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  const newPolicyNumber = fields.policy_number?.trim() || null;

  // 9/12 — filling in a policy number is the plain signal a product just got issued. If it was
  // sitting pending approval (see markPendingApproval below), that's resolved now — clear the flag
  // and delete the check-in reminder it created, same cleanup undoPendingApproval does by hand,
  // so a policy that's actually in force doesn't keep a stale "check on this" nudge sitting in
  // Reminders. Only fires on the transition (didn't have a policy number, now does) — re-saving an
  // already-issued product with its existing policy number doesn't re-trigger anything because
  // pending_approval_at will already be null by then.
  let clearedPendingFields: { pending_approval_at: null; pending_checkin_reminder_id: null } | Record<string, never> = {};
  if (newPolicyNumber) {
    const { data: current } = await supabase
      .from("client_products")
      .select("policy_number, pending_approval_at, pending_checkin_reminder_id")
      .eq("id", productId)
      .single();
    if (current?.pending_approval_at && !current.policy_number) {
      if (current.pending_checkin_reminder_id) {
        await supabase.from("reminders").delete().eq("id", current.pending_checkin_reminder_id);
      }
      clearedPendingFields = { pending_approval_at: null, pending_checkin_reminder_id: null };
    }
  }

  const { error } = await supabase
    .from("client_products")
    .update({
      product_name,
      product_type: fields.product_type?.trim() || null,
      carrier: fields.carrier?.trim() || null,
      policy_number: newPolicyNumber,
      issue_date: fields.issue_date?.trim() || null,
      expiration_date: fields.expiration_date?.trim() || null,
      is_convertible: fields.is_convertible ?? false,
      conversion_deadline: fields.conversion_deadline?.trim() || null,
      final_conversion_deadline: fields.final_conversion_deadline?.trim() || null,
      no_exam_declined_at: fields.no_exam_declined_at?.trim() || null,
      term_end_date: fields.term_end_date?.trim() || null,
      conversion_notes: fields.conversion_notes?.trim() || null,
      face_amount: parseNumberOrNull(fields.face_amount),
      premium: parseNumberOrNull(fields.premium),
      minimum_premium: parseNumberOrNull(fields.minimum_premium),
      notes: fields.notes?.trim() || null,
      owner_client_id: fields.owner_client_id?.trim() || null,
      riders: fields.riders ?? [],
      annuity_contribution_amount: parseNumberOrNull(fields.annuity_contribution_amount),
      annuity_contribution_frequency: fields.annuity_contribution_frequency?.trim() || null,
      contract_value: parseNumberOrNull(fields.contract_value),
      annuity_surrender_end_date: fields.annuity_surrender_end_date?.trim() || null,
      annuity_contract_end_date: fields.annuity_contract_end_date?.trim() || null,
      ...clearedPendingFields,
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function deleteProduct(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

// Conversion Pending / Converted — a manual workflow status separate from the date-based
// no-exam/final conversion fields above. Karina, 9/3: once a client actually says yes to
// converting, she wants that product to visibly move into its own section so it stays on her
// radar for check-ins, rather than sitting quietly alongside every other Issued policy. Nothing
// here is date-derived — only the advisor knows the client actually agreed — so these are plain
// manual toggles, not cron-driven like conversion_reminder_sent above. When the new permanent
// policy is actually issued, the advisor adds it as its own Product (no linking, per her earlier
// call) and marks this old term product Converted, which archives it out of the way but keeps
// the record on file rather than deleting it.
export async function markConversionPending(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("client_products")
    .update({ conversion_pending_at: new Date().toISOString(), converted_at: null })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function undoConversionPending(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_products").update({ conversion_pending_at: null }).eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function markConverted(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("client_products")
    .update({ converted_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  // Converted products drop out of the Term outreach view (see markTermContacted below), so
  // that list needs to refresh too, not just this client's own page.
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function undoConverted(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_products").update({ converted_at: null }).eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

// Pending Approval — per-product, independent of the client's own pipeline stage. See schema.sql
// section 51 for the full "why" (replaces the old client-stage-only version from section 50).
// Creates the check-in reminder IMMEDIATELY (not via a later cron run) so it's visible right away
// in both the Reminders list and this client's own Reminders card — Karina, 9/12: "I wanted to
// actually show up on the client's profile and in the reminders list... so that there's some sort
// of confirmation." 3 days out, per her own call once shown the option (24hr vs 72hr).
const PENDING_APPROVAL_CHECKIN_DAYS = 3;

export async function markPendingApproval(productId: string, clientId: string, productName: string): Promise<void> {
  const { supabase } = await requireUser();

  const remindAt = new Date();
  remindAt.setDate(remindAt.getDate() + PENDING_APPROVAL_CHECKIN_DAYS);
  // Reuses the Reminders feature's own action (same reasoning as markOutreachOutcome above) so
  // this stays in sync with whatever that table/validation looks like later, rather than inserting
  // into `reminders` directly.
  const reminderId = await addReminder({ clientId }, remindAt.toISOString(), `Check in: ${productName} pending carrier approval`);

  const { error } = await supabase
    .from("client_products")
    .update({ pending_approval_at: new Date().toISOString(), pending_checkin_reminder_id: reminderId })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

export async function undoPendingApproval(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: product, error: fetchError } = await supabase
    .from("client_products")
    .select("pending_checkin_reminder_id")
    .eq("id", productId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (product?.pending_checkin_reminder_id) {
    const { error: reminderError } = await supabase.from("reminders").delete().eq("id", product.pending_checkin_reminder_id);
    if (reminderError) throw new Error(reminderError.message);
  }

  const { error } = await supabase
    .from("client_products")
    .update({ pending_approval_at: null, pending_checkin_reminder_id: null })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

// Outreach — a separate manual workflow from Conversion Pending/Converted above. Karina, 9/4:
// wants a proactive queue of every product with a relevant end date, soonest-expiring first, so
// she can shop new coverage or just touch base before it ends. Lives on the "Outreach" view on
// the Clients page.
//
// 9/8: originally just a plain "touched base, yes/no" flag — Karina wanted it to capture WHAT
// actually happened on the call, not just that one happened, so marking touched base now requires
// picking an outcome. "Couldn't reach them" and "shopping for new coverage" both mean more work is
// still coming, so those two automatically create a short-term follow-up reminder. "Keeping
// current coverage as-is" (split out from "renewing" later on 9/8, see the comment on
// OutreachOutcome in lib/products.ts) and "Declining / letting it lapse" (given the same treatment
// right after, same day — "for declining and letting lapse we need actions too") are both settled
// FOR NOW but still want a reminder far out — the client isn't due for another check-in for a year
// or two, not days — so followUpAt is required for those two outcomes (via the inline 1yr/2yr/
// custom picker in TermOutreachRow) and ignored for the other three.
// OutreachOutcome/OUTREACH_OUTCOME_LABELS live in lib/products.ts, not here — a "use server" file
// can only export async functions, so a plain constant has to live elsewhere.
export async function markOutreachOutcome(
  productId: string,
  clientId: string,
  outcome: OutreachOutcome,
  productName: string,
  followUpAt?: string
): Promise<void> {
  if ((outcome === "keeping" || outcome === "declining") && !followUpAt) {
    throw new Error("Pick a next follow-up date.");
  }

  const { supabase } = await requireUser();

  // Create the auto-follow-up reminder (if this outcome gets one) FIRST, so its id can be saved
  // onto the product row below — see outreach_reminder_id in schema.sql (added 9/8). That's what
  // lets undoOutreachOutcome clean up the exact reminder this created instead of leaving it
  // sitting in Reminders forever — Karina found a screenshot full of "Try again — couldn't
  // reach..." reminders from rows she'd already hit Undo on.
  let reminderId: string | null = null;
  if (outcome === "unreachable" || outcome === "shopping") {
    const daysOut = outcome === "unreachable" ? 3 : 14;
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + daysOut);
    const message =
      outcome === "unreachable"
        ? `Try again: couldn't reach about ${productName}`
        : `Check in on new coverage shopping: ${productName}`;
    // Reuses the Reminders feature's own action rather than inserting into `reminders` directly,
    // so this stays in sync with whatever that table/validation looks like later.
    reminderId = await addReminder({ clientId }, remindAt.toISOString(), message);
  } else if (outcome === "keeping" && followUpAt) {
    reminderId = await addReminder({ clientId }, followUpAt, `Renewal check-in due: ${productName}`);
  } else if (outcome === "declining" && followUpAt) {
    reminderId = await addReminder({ clientId }, followUpAt, `Check back in: lapsed coverage, ${productName}`);
  }

  const { error } = await supabase
    .from("client_products")
    .update({ term_contacted_at: new Date().toISOString(), outreach_outcome: outcome, outreach_reminder_id: reminderId })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  // "Shopping for new coverage" AND "Renewing — new policy" both mean there's new business to
  // work, so both re-enter the client into the sales pipeline (Karina, 9/8: "renewing should move
  // to lead") — same CLIENT_STAGES pipeline every new prospect goes through, so they show back up
  // on the Client Pipeline card and the Lead filter on Clients, and the advisor moves it forward by
  // hand (Quoted once a quote goes out, etc.) the same way as any other prospect.
  // "Keeping current coverage as-is" means the opposite — nothing to work, the existing policy
  // just continues — so that one moves to Issued instead ("keeping as is should just go back to
  // issued and be done until the next date," same message) and relies on the reminder above to
  // resurface it later rather than sitting in a pipeline stage.
  // "Declining / letting it lapse" moves to the existing Declined stage — added when Karina asked
  // for the same "we need actions too" treatment here; she was unsure herself whether declining
  // and lapsing were really the same thing but was fine treating them as one outcome, so this uses
  // the CLIENT_STAGES value that already means exactly this ("Declined").
  // All three directions OVERWRITE the client's current stage — for a client with other coverage
  // already further along, this can move that stage backward or forward too, since `stage` is one
  // field per client, not per policy. Deliberate per her description, but worth knowing.
  // Only "Couldn't reach them" leaves stage untouched.
  // 9/13 — each of these three routed through clearStageBatches (not a bare
  // stage_entered_pending_at: null) so a client moved off Pending or Approved by an Outreach
  // outcome doesn't leave that stage's check-in reminders behind — same cleanup the Stage dropdown
  // itself now does (see updateStage above).
  if (outcome === "shopping" || outcome === "renewing") {
    const { error: stageError } = await supabase
      .from("clients")
      .update({ stage: "lead", ...(await clearStageBatches(supabase, clientId)) })
      .eq("id", clientId);
    if (stageError) throw new Error(stageError.message);
  } else if (outcome === "keeping") {
    const { error: stageError } = await supabase
      .from("clients")
      .update({ stage: "issued", ...(await clearStageBatches(supabase, clientId)) })
      .eq("id", clientId);
    if (stageError) throw new Error(stageError.message);
  } else if (outcome === "declining") {
    const { error: stageError } = await supabase
      .from("clients")
      .update({ stage: "declined", ...(await clearStageBatches(supabase, clientId)) })
      .eq("id", clientId);
    if (stageError) throw new Error(stageError.message);
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  // Same clearStageBatches gap as updateStage/resolveQuotesOnIssue above — this can also
  // delete live Pending/Approved check-in reminders, so the Reminders tab needs to hear about it too.
  revalidatePath("/reminders");
  revalidatePath("/");
}

// Karina, 9/8, looking at a Reminders screenshot full of leftover "Try again — couldn't reach..."
// rows: "if you do undo, the reminder should get removed as well... it's autogenerated." Undo now
// deletes the exact reminder markOutreachOutcome created (tracked via outreach_reminder_id on the
// product, set the moment that reminder was created) instead of leaving it behind with nothing
// pointing back to it. A row touched-base BEFORE this fix has no id saved to look up, so Undo on
// one of those still won't find anything to clean up — those already-orphaned reminders need a
// one-time manual Delete on the Reminders page; nothing safe to auto-match them by after the fact.
export async function undoOutreachOutcome(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: product, error: fetchError } = await supabase
    .from("client_products")
    .select("outreach_reminder_id")
    .eq("id", productId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  if (product?.outreach_reminder_id) {
    const { error: reminderError } = await supabase.from("reminders").delete().eq("id", product.outreach_reminder_id);
    if (reminderError) throw new Error(reminderError.message);
  }

  const { error } = await supabase
    .from("client_products")
    .update({ term_contacted_at: null, outreach_outcome: null, outreach_reminder_id: null })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
  revalidatePath("/");
}

// ─────────────────────────────────────────────────────────────
// Client Analyses — each saved analysis is a point-in-time snapshot (inputs + result), so we
// don't offer in-place editing (that would silently rewrite history). Delete removes a snapshot
// outright; "Re-run with these answers" (see client-analyzer/page.tsx's `reanalysis` param)
// pre-fills a new analysis from an old one's inputs instead of touching the original.
// ─────────────────────────────────────────────────────────────

export async function deleteAnalysis(analysisId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_analyses").delete().eq("id", analysisId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// ─────────────────────────────────────────────────────────────
// Medical Condition Report — agent-entered side (filled in live on a call). The public,
// client-facing side lives at src/app/medical-report/[token]/actions.ts, unauthenticated and
// using the admin client, since there's no session there — this file's functions are only ever
// called from inside the logged-in portal, so they go through the normal RLS-scoped client like
// everything else here.
// ─────────────────────────────────────────────────────────────

export interface MedicalConditionFields {
  condition_name: string;
  onset_date: string;
  current_status: string;
  latest_report_date: string;
  latest_report_summary: string;
  hospitalizations: string;
  additional_notes: string;
  events: { date: string; description: string }[];
  medications: { name: string; dosage: string; start_date: string; lifelong: boolean }[];
}

function cleanMedicalConditionRow(fields: MedicalConditionFields) {
  return {
    condition_name: fields.condition_name.trim(),
    onset_date: fields.onset_date || null,
    current_status: fields.current_status.trim() || null,
    latest_report_date: fields.latest_report_date || null,
    latest_report_summary: fields.latest_report_summary.trim() || null,
    hospitalizations: fields.hospitalizations.trim() || null,
    additional_notes: fields.additional_notes.trim() || null,
    events: fields.events.filter((e) => e.date || e.description.trim()),
    medications: fields.medications.filter((m) => m.name.trim()),
  };
}

export async function addMedicalCondition(clientId: string, fields: MedicalConditionFields): Promise<void> {
  const { supabase } = await requireUser();
  if (!fields.condition_name.trim()) throw new Error("Condition name is required.");

  const { error } = await supabase.from("medical_conditions").insert({
    client_id: clientId,
    ...cleanMedicalConditionRow(fields),
    submitted_by_client: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function updateMedicalCondition(
  conditionId: string,
  clientId: string,
  fields: MedicalConditionFields
): Promise<void> {
  const { supabase } = await requireUser();
  if (!fields.condition_name.trim()) throw new Error("Condition name is required.");

  const { error } = await supabase
    .from("medical_conditions")
    .update(cleanMedicalConditionRow(fields))
    .eq("id", conditionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteMedicalCondition(conditionId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("medical_conditions").delete().eq("id", conditionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
