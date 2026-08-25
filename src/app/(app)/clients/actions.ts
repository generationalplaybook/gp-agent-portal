"use server";

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

export async function createClientRecord(formData: FormData) {
  const { supabase, user } = await requireUser();

  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;
  const stage = (String(formData.get("stage") || "lead") as ClientStage);

  if (!full_name) redirect("/clients/new?error=" + encodeURIComponent("Client name is required."));

  const { data, error } = await supabase
    .from("clients")
    .insert({ owner_id: user.id, full_name, phone, email, source, stage })
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

export async function updateFollowUp(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const followUpAtRaw = String(formData.get("follow_up_at") || "");
  const followUpNote = String(formData.get("follow_up_note") || "").trim() || null;

  const follow_up_at = followUpAtRaw ? new Date(followUpAtRaw).toISOString() : null;

  await supabase
    .from("clients")
    .update({ follow_up_at, follow_up_note: followUpNote })
    .eq("id", clientId);

  // Queue a reminder row for the scheduled job to pick up (see Phase 3 — email sending).
  if (follow_up_at) {
    const { data: client } = await supabase
      .from("clients")
      .select("owner_id, full_name")
      .eq("id", clientId)
      .single();
    if (client) {
      await supabase.from("reminders").insert({
        client_id: clientId,
        agent_id: client.owner_id,
        remind_at: follow_up_at,
        message: `Follow up with ${client.full_name}` + (followUpNote ? `: ${followUpNote}` : ""),
      });
    }
  }

  revalidatePath(`/clients/${clientId}`);
}

export async function updateContactInfo(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;

  await supabase.from("clients").update({ full_name, phone, email, source }).eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function addNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await supabase.from("client_notes").insert({ client_id: clientId, author_id: user.id, body });
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
