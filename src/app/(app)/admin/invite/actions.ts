"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";

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

export async function inviteAgent(email: string, fullName: string): Promise<void> {
  await requireAdmin();

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  if (!trimmedEmail) throw new Error("Email is required.");

  const siteUrl = await getSiteUrl();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: { full_name: trimmedName },
    redirectTo: `${siteUrl}/set-password`,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/invite");
}

export async function updateAgentRole(agentId: string, role: "agent" | "admin"): Promise<void> {
  await requireAdmin();
  // Updating someone else's profile row requires the service-role client — the standard RLS
  // policy only lets an agent update their own row.
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", agentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invite");
}
