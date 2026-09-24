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

// Same { ok, error } pattern Carrier Logins/State Licenses use (profile/actions.ts) rather than
// throwing — a thrown server-action error gets hidden behind a generic message in production
// (see BACKLOG.md, "Server action error handling"), so a real failure (e.g. this table not
// existing yet on the live database until the schema.sql SQL is run) would otherwise silently
// discard whatever the advisor typed with no indication anything went wrong.

export async function addPresentation(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const { error } = await supabase.from("presentations").insert({
    agent_id: user.id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    link: String(formData.get("link") || "").trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/presentations");
  return { ok: true };
}

export async function updatePresentation(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) return { ok: false, error: "Title is required." };

  const { error } = await supabase
    .from("presentations")
    .update({
      title,
      description: String(formData.get("description") || "").trim() || null,
      link: String(formData.get("link") || "").trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/presentations");
  return { ok: true };
}

export async function deletePresentation(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("presentations").delete().eq("id", id);
  revalidatePath("/presentations");
}
