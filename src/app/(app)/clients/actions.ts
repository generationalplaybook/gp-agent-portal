"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ClientStage } from "@/lib/types";

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

  if (!first_name || !last_name)
    redirect("/clients/new?error=" + encodeURIComponent("First and last name are required."));

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

export async function updateStage(clientId: string, stage: ClientStage) {
  const { supabase } = await requireUser();
  await supabase.from("clients").update({ stage }).eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
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
  await supabase.from("clients").update({ stage: "issued" }).eq("id", clientId);
  await supabase.from("client_products").update({ is_quote: false }).eq("id", chosenProductId);
  const toDelete = allQuoteProductIds.filter((id) => id !== chosenProductId);
  if (toDelete.length > 0) {
    await supabase.from("client_products").delete().in("id", toDelete);
  }
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
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

export async function linkExistingFamilyMember(
  clientId: string,
  relatedClientId: string,
  relationship: string
): Promise<void> {
  const { supabase } = await requireUser();
  if (clientId === relatedClientId) throw new Error("Can't link a client to themselves.");

  const { data: current, error: currentErr } = await supabase
    .from("clients")
    .select("family_id")
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
    .select("family_id")
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

  const { error } = await supabase.from("client_products").insert({
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
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function updateProduct(productId: string, clientId: string, fields: ProductFields): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  const { error } = await supabase
    .from("client_products")
    .update({
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
      annuity_contribution_amount: parseNumberOrNull(fields.annuity_contribution_amount),
      annuity_contribution_frequency: fields.annuity_contribution_frequency?.trim() || null,
      contract_value: parseNumberOrNull(fields.contract_value),
      annuity_surrender_end_date: fields.annuity_surrender_end_date?.trim() || null,
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

// Term outreach — a separate manual workflow from Conversion Pending/Converted above. Karina,
// 9/4: wants a proactive queue of every term policy (convertible or not), soonest-expiring first,
// so she can shop new coverage or just touch base before it ends — and a way to mark one as
// "already reached out to" so it moves out of the active queue without deleting it or losing
// track of who's been contacted. Lives on the new "Term" view on the Clients page.
export async function markTermContacted(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("client_products")
    .update({ term_contacted_at: new Date().toISOString() })
    .eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/");
}

export async function undoTermContacted(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_products").update({ term_contacted_at: null }).eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
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
