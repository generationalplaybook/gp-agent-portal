"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { RecruitStage } from "@/lib/types";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
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

  revalidatePath("/team");
  redirect(`/team/${data!.id}`);
}

export async function updateRecruitStage(recruitId: string, stage: RecruitStage) {
  const { supabase } = await requireUser();
  await supabase.from("recruits").update({ stage }).eq("id", recruitId);
  revalidatePath(`/team/${recruitId}`);
  revalidatePath("/team");
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
