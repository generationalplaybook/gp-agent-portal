"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";

export async function acceptTerms() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ terms_version: TERMS_VERSION, terms_accepted_at: new Date().toISOString() })
    .eq("id", user.id);

  redirect("/clients");
}
