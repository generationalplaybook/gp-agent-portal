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

// The three manual-checkbox steps that have no natural DB signal to detect on their own — see
// schema.sql section 49. Keyed by id so the UI and this file agree on what's a valid step.
export const MANUAL_STEP_IDS = ["know_links", "review_notifications", "first_client"] as const;
export type ManualStepId = (typeof MANUAL_STEP_IDS)[number];

export async function setOnboardingStep(stepId: ManualStepId, done: boolean) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("onboarding_steps").eq("id", user.id).single();
  const current = (profile?.onboarding_steps as Record<string, boolean>) ?? {};
  const next = { ...current, [stepId]: done };
  await supabase.from("profiles").update({ onboarding_steps: next }).eq("id", user.id);
  revalidatePath("/getting-started");
  revalidatePath("/");
}

// Clears the manual checkmarks only — the three auto-detected steps (profile filled in, custom
// link set, Cal.com connected) are computed live from real profile data and were never stored
// here, so there's nothing to "undo" for those; this just lets someone re-walk the guide.
export async function restartOnboarding() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ onboarding_steps: {} }).eq("id", user.id);
  revalidatePath("/getting-started");
  revalidatePath("/");
}

export async function dismissOnboardingBanner() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ onboarding_dismissed_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/");
}
