"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { AnalyzerInputs, AnalyzerResult } from "@/lib/analyzer";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// clients.full_name is derived by a DB trigger from first_name/middle_name/last_name —
// nothing should write full_name directly. This splits a single freeform name (all the
// analyzer collects) the same way the original name-split backfill did: first word is the
// first name, everything after is the last name.
function splitName(name: string): { first_name: string; last_name: string } {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { first_name: trimmed, last_name: "" };
  return {
    first_name: trimmed.slice(0, spaceIndex),
    last_name: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export async function saveAnalysisToClient(
  clientId: string,
  inputs: AnalyzerInputs,
  result: AnalyzerResult
): Promise<void> {
  const { supabase } = await requireUser();

  // Whatever the advisor typed into the analyzer is the freshest info we have —
  // keep the client's own profile fields in sync instead of leaving it stuck with
  // whatever was on file before.
  const contactUpdate: Record<string, string> = {};
  if (inputs.name.trim()) Object.assign(contactUpdate, splitName(inputs.name));
  if (inputs.phone.trim()) contactUpdate.phone = inputs.phone.trim();
  if (inputs.email.trim()) contactUpdate.email = inputs.email.trim();
  if (inputs.dob) contactUpdate.birth_date = inputs.dob;
  if (Object.keys(contactUpdate).length > 0) {
    await supabase.from("clients").update(contactUpdate).eq("id", clientId);
  }

  const { error } = await supabase.from("client_analyses").insert({
    client_id: clientId,
    inputs,
    result,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function saveAnalysisAsNewClient(
  inputs: AnalyzerInputs,
  result: AnalyzerResult
): Promise<string> {
  const { supabase, user } = await requireUser();

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      owner_id: user.id,
      ...splitName(inputs.name),
      phone: inputs.phone || null,
      email: inputs.email || null,
      birth_date: inputs.dob || null,
      stage: "lead",
    })
    .select("id")
    .single();

  if (error || !client) throw new Error(error?.message || "Could not create client.");

  const { error: analysisError } = await supabase.from("client_analyses").insert({
    client_id: client.id,
    inputs,
    result,
  });
  if (analysisError) throw new Error(analysisError.message);

  revalidatePath("/clients");
  revalidatePath(`/clients/${client.id}`);
  return client.id as string;
}
