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

export async function saveAnalysisToClient(
  clientId: string,
  inputs: AnalyzerInputs,
  result: AnalyzerResult
): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_analyses").insert({
    client_id: clientId,
    inputs,
    result,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
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
      full_name: inputs.name,
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
