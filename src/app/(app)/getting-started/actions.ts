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

// Only dismisses the "finish setting up" banner on Home — the walkthrough itself (TourEngine.tsx)
// deliberately has no server-side "progress" of its own to reset or clear. Karina, 9/9, after the
// first draft had a Restart button that cleared step checkmarks: "I don't think that getting
// started or restarting should delete what was already inputted." A relaunchable tour has nothing
// to delete in the first place — see tour-steps.ts.
export async function dismissOnboardingBanner() {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ onboarding_dismissed_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/");
}
