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

export async function updateMyProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const first_name = String(formData.get("first_name") || "").trim() || null;
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const scheduling_link = String(formData.get("scheduling_link") || "").trim() || null;

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  await supabase
    .from("profiles")
    .update({ first_name, middle_name, last_name, phone, scheduling_link })
    .eq("id", user.id);
  revalidatePath("/profile");
}

export async function addCredential(formData: FormData) {
  const { supabase, user } = await requireUser();
  const label = String(formData.get("label") || "").trim();
  const code = String(formData.get("code") || "").trim();
  if (!label || !code) return;

  await supabase.from("advisor_credentials").insert({ agent_id: user.id, label, code });
  revalidatePath("/profile");
}

export async function deleteCredential(credentialId: string) {
  const { supabase } = await requireUser();
  await supabase.from("advisor_credentials").delete().eq("id", credentialId);
  revalidatePath("/profile");
}
