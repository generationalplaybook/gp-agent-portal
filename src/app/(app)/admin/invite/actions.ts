"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    throw new Error("Only admins can invite agents.");
  }
  return { supabase, user: user! };
}

// Next.js hides any THROWN error from a Server Action behind a generic message in
// production ("Minified React error #441...") to avoid leaking internals — so instead
// of throwing, these return a result the caller can show directly. A catch-all here
// means even something unexpected (like a missing env var) surfaces its real message
// instead of that wall of text.

export async function inviteAgent(email: string, fullName: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    if (!trimmedEmail) return { ok: false, error: "Email is required." };

    const siteUrl = await getSiteUrl();
    const admin = createAdminClient();

    const { error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
      data: { full_name: trimmedName },
      redirectTo: `${siteUrl}/set-password`,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not send invite." };
  }
}

export async function updateAgentRole(agentId: string, role: "agent" | "admin"): Promise<ActionResult> {
  try {
    await requireAdmin();
    // Updating someone else's profile row requires the service-role client — the standard
    // RLS policy only lets an agent update their own row.
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", agentId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/invite");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update role." };
  }
}
