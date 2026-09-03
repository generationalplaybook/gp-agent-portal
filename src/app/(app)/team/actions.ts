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

export async function linkClientToRecruit(recruitId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recruits").update({ client_id: clientId }).eq("id", recruitId);
  if (error) throw new Error(error.message);
  revalidatePath(`/team/${recruitId}`);
}

export async function unlinkClientFromRecruit(recruitId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recruits").update({ client_id: null }).eq("id", recruitId);
  if (error) throw new Error(error.message);
  revalidatePath(`/team/${recruitId}`);
}
