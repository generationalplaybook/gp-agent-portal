"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { RecruitStage } from "@/lib/types";
import { addReminder } from "../reminders/actions";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// Automatic weekly check-in reminders for recruit stages — added 9/26 per Karina, once the home
// dashboard's Team Follow-ups card asked for the same kind of nudge clients already get on
// Pending/Approved/Quoted (see STAGE_CHECKIN_DAYS/createStageBatch in clients/actions.ts). Slower
// cadence here (day 7/14/21, not 3/7/10) since recruiting — especially studying for a license —
// plays out over weeks, not days. Every stage gets the identical cadence and a recruit is only
// ever in one stage at a time, so (unlike clients' three separate per-stage columns) one generic
// stage_entered_at/stage_reminder_ids pair on `recruits` is enough — see schema.sql section 56.
const RECRUIT_CHECKIN_DAYS = [7, 14, 21] as const;

function recruitStageBatchMessages(stage: RecruitStage, fullName: string): string[] {
  if (stage === "lead") {
    return [
      `Check in: follow up with ${fullName} about joining (week 1)`,
      `Check in: follow up with ${fullName} about joining (week 2)`,
      `⚠️ URGENT — ${fullName} has been a lead for 3 weeks with no update. Follow up or move them along.`,
    ];
  }
  if (stage === "studying") {
    return [
      `Check in: see how ${fullName} is doing with their licensing study (week 1)`,
      `Check in: see how ${fullName} is doing with their licensing study (week 2)`,
      `⚠️ URGENT — ${fullName} has been studying for 3 weeks with no update. Check in on their progress.`,
    ];
  }
  // licensed
  return [
    `Check in: welcome ${fullName} and confirm next onboarding steps (week 1)`,
    `Check in: follow up on ${fullName}'s onboarding (week 2)`,
    `⚠️ URGENT — ${fullName} was licensed 3 weeks ago with no onboarding follow-up logged.`,
  ];
}

// Creates the day-7/14/21 reminders for a recruit entering a new stage, returning the patch
// fields (entered-at timestamp + the new reminder ids) to write onto the recruit row. Mirrors
// createStageBatch in clients/actions.ts.
async function createRecruitStageBatch(recruitId: string, fullName: string, stage: RecruitStage): Promise<Record<string, unknown>> {
  const messages = recruitStageBatchMessages(stage, fullName);
  const ids: string[] = [];
  for (let i = 0; i < RECRUIT_CHECKIN_DAYS.length; i++) {
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + RECRUIT_CHECKIN_DAYS[i]);
    ids.push(await addReminder({ recruitId }, remindAt.toISOString(), messages[i]));
  }
  return { stage_entered_at: new Date().toISOString(), stage_reminder_ids: ids };
}

// Deletes whichever check-in reminders are currently live on this recruit and clears the batch
// fields — called from every path that can move a recruit to a different stage, so a stage change
// doesn't leave a stale "check on this" reminder behind for the stage they just left. Safe to call
// unconditionally (deleting an empty set of ids is a no-op). Mirrors clearStageBatches in
// clients/actions.ts.
async function clearRecruitStageBatch(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  recruitId: string
): Promise<Record<string, unknown>> {
  const { data: current } = await supabase.from("recruits").select("stage_reminder_ids").eq("id", recruitId).single();

  const ids = current?.stage_reminder_ids ?? [];
  if (ids.length > 0) {
    await supabase.from("reminders").delete().in("id", ids);
  }

  return { stage_entered_at: null, stage_reminder_ids: [] };
}

export async function createRecruit(formData: FormData) {
  const { supabase, user } = await requireUser();

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;
  const target_license_date = String(formData.get("target_license_date") || "").trim() || null;
  const stage = (String(formData.get("stage") || "lead") as RecruitStage);

  if (!full_name) redirect("/team/new?error=" + encodeURIComponent("Name is required."));

  const { data, error } = await supabase
    .from("recruits")
    .insert({ owner_id: user.id, full_name, phone, email, state, source, target_license_date, stage })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/team/new?error=" + encodeURIComponent(error?.message || "Could not create recruit."));
  }

  // Kicks off the same day-7/14/21 check-in batch a later stage change would — a brand-new
  // recruit sitting in whichever stage it was created at (usually Lead) shouldn't need an actual
  // stage change to start getting nudged.
  const batchPatch = await createRecruitStageBatch(data!.id, full_name, stage);
  await supabase.from("recruits").update(batchPatch).eq("id", data!.id);

  revalidatePath("/team");
  redirect(`/team/${data!.id}`);
}

export async function updateRecruitStage(recruitId: string, stage: RecruitStage) {
  const { supabase } = await requireUser();

  const { data: current } = await supabase
    .from("recruits")
    .select("stage, full_name, stage_reminder_ids")
    .eq("id", recruitId)
    .single();

  // Already in this stage with a live batch — don't stack a second one on top (this dropdown
  // only fires on an actual change, so this mainly guards against being called some other way).
  // Same reasoning as clients' updateStage.
  const alreadyInStageWithBatch = stage === current?.stage && (current?.stage_reminder_ids?.length ?? 0) > 0;

  const { error } = await supabase.from("recruits").update({ stage }).eq("id", recruitId);
  if (error) throw new Error(error.message);

  if (!alreadyInStageWithBatch) {
    let patch = await clearRecruitStageBatch(supabase, recruitId);
    patch = { ...patch, ...(await createRecruitStageBatch(recruitId, current?.full_name ?? "recruit", stage)) };
    await supabase.from("recruits").update(patch).eq("id", recruitId);
  }

  revalidatePath(`/team/${recruitId}`);
  revalidatePath("/team");
  revalidatePath("/reminders");
  revalidatePath("/");
}

export async function updateRecruitContactInfo(formData: FormData) {
  const { supabase } = await requireUser();
  const recruitId = String(formData.get("recruit_id"));
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const target_license_date = String(formData.get("target_license_date") || "").trim() || null;

  if (!full_name) return;

  await supabase
    .from("recruits")
    .update({ full_name, phone, email, state, target_license_date })
    .eq("id", recruitId);
  revalidatePath(`/team/${recruitId}`);
  revalidatePath("/team");
}

export async function updateRecruitSource(recruitId: string, source: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("recruits").update({ source: source.trim() || null }).eq("id", recruitId);
  revalidatePath(`/team/${recruitId}`);
}

export async function updateRecruitNotes(recruitId: string, notes_summary: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase.from("recruits").update({ notes_summary: notes_summary.trim() || null }).eq("id", recruitId);
  revalidatePath(`/team/${recruitId}`);
}

export async function deleteRecruit(formData: FormData) {
  const { supabase } = await requireUser();
  const recruitId = String(formData.get("recruit_id"));

  // Reminders cascade-delete with the recruit (see supabase/schema.sql) — this one delete
  // cleans them up too. The linked client (if any) is completely untouched either way.
  const { error } = await supabase.from("recruits").delete().eq("id", recruitId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  redirect("/team");
}

// "Link an existing client" search — mirrors searchFamilyCandidates in clients/actions.ts.
// Scoped to the signed-in advisor's own clients by RLS (see "Agents see their own clients" in
// schema.sql), same as everywhere else in the app.
export async function searchClientCandidates(query: string): Promise<{ id: string; full_name: string }[]> {
  const { supabase } = await requireUser();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(15);

  if (error || !data) return [];
  return data;
}

// Linking pulls phone/email/state over from the client record onto the recruit — the client is
// the source of truth once the two are linked (Karina, 9/3), so this copies over its current
// values outright rather than only filling blanks, matching what every later edit on the client
// will keep doing automatically (see syncContactInfoToLinkedRecruit in clients/actions.ts, the
// other half of this: client edits push here one-way, recruit edits never push back to the
// client). Only pushes fields the client actually has a value for, so linking a client with no
// email on file doesn't blank out one the recruit already had. full_name is left alone entirely:
// it's required at recruit creation, so it's already set, and a recruit's name on file isn't
// necessarily wrong just because it differs slightly from the client's, e.g. a nickname.
export async function linkClientToRecruit(recruitId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: client } = await supabase.from("clients").select("phone, email, state").eq("id", clientId).single();

  const patch: Record<string, string> = { client_id: clientId };
  if (client?.phone) patch.phone = client.phone;
  if (client?.email) patch.email = client.email;
  if (client?.state) patch.state = client.state;

  const { error } = await supabase.from("recruits").update(patch).eq("id", recruitId);
  if (error) throw new Error(error.message);
  revalidatePath(`/team/${recruitId}`);
}

export async function unlinkClientFromRecruit(recruitId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recruits").update({ client_id: null }).eq("id", recruitId);
  if (error) throw new Error(error.message);
  revalidatePath(`/team/${recruitId}`);
}
