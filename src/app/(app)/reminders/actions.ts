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

// A client (or, since Team/Recruits, a recruit) can have any number of reminders — "sent_at"
// doubles as the completed flag (null = still pending, set = completed/dismissed).
//
// Every reminder belongs to exactly one of a Client or a Recruit — never both, never neither
// (enforced in the DB by reminders_client_or_recruit_chk, schema.sql section 28). Callers pass
// that ownership as a small discriminated union rather than two separate optional strings, so it's
// not possible to accidentally call these with both or neither set.
export type ReminderOwner = { clientId: string; recruitId?: undefined } | { recruitId: string; clientId?: undefined };

function revalidateForOwner(owner: ReminderOwner) {
  if (owner.clientId) {
    revalidatePath(`/clients/${owner.clientId}`);
    revalidatePath("/clients");
  } else {
    revalidatePath(`/team/${owner.recruitId}`);
    revalidatePath("/team");
  }
  revalidatePath("/reminders");
}

export async function addReminder(owner: ReminderOwner, remindAtIso: string, message: string): Promise<void> {
  const { supabase, user } = await requireUser();
  if (!remindAtIso) throw new Error("Pick a date and time.");

  const { error } = await supabase.from("reminders").insert({
    client_id: owner.clientId ?? null,
    recruit_id: owner.recruitId ?? null,
    agent_id: user.id,
    remind_at: remindAtIso,
    message: message.trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidateForOwner(owner);
}

export async function updateReminder(
  reminderId: string,
  owner: ReminderOwner,
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

  revalidateForOwner(owner);
}

export async function completeReminder(reminderId: string, owner: ReminderOwner): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidateForOwner(owner);
}

export async function reopenReminder(reminderId: string, owner: ReminderOwner): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminders").update({ sent_at: null }).eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidateForOwner(owner);
}

export async function deleteReminder(reminderId: string, owner: ReminderOwner): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reminders").delete().eq("id", reminderId);
  if (error) throw new Error(error.message);

  revalidateForOwner(owner);
}
