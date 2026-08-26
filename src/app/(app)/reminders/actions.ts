"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// A client can have any number of reminders — "sent_at" doubles as the
// completed flag (null = still pending, set = completed/dismissed).

export async function addReminder(clientId: string, remindAtIso: string, message: string): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!remindAtIso) throw new Error("Pick a date and time.");

  const { error } = await supabase.from("reminders").insert({
    client_id: clientId,
    agent_id: user.id,
    remind_at: remindAtIso,
    message: message.trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

export async function updateReminder(
  reminderId: string,
  clientId: string,
  remindAtIso: string,
  message: string
): Promise<void> {
  const { supabase } = await requireUser();
  if (!remindAtIso) throw new Error("Pick a date and time.");

  const { error } = await supabase
    .from("reminders")
    .update({ remind_at: remindAtIso, message: message.trim() || null })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

export async function completeReminder(reminderId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

export async function reopenReminder(reminderId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminders").update({ sent_at: null }).eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}

export async function deleteReminder(reminderId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminders").delete().eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reminders");
}
