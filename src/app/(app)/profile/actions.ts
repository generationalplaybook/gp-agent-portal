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
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;

  await supabase.from("profiles").update({ full_name, phone }).eq("id", user.id);
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
