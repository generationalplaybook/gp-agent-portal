"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FAState } from "@/lib/fa";

// Public, token-scoped save for the client-facing Financial Needs Analysis link — writes to the
// same client_financial_plans table/shape the advisor's own Full Financial Analysis tool saves to
// (clients/[id]/financial-analysis/actions.ts), just resolved via clients.financial_analysis_token
// instead of a logged-in session. Modeled directly on medical-report/[token]/actions.ts's
// submitMedicalReport: no session exists here, so requests are trusted only as far as "this is a
// real, currently-valid per-client token," and the admin client (bypasses RLS) writes exactly one
// row scoped to whichever client that token resolves to — nothing else is touched or readable.
export async function savePublicFinancialAnalysis(
  token: string,
  state: FAState
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("financial_analysis_token", token)
    .maybeSingle();
  if (!client) return { ok: false, error: "This link is no longer valid. Please contact your advisor." };

  const { error } = await admin
    .from("client_financial_plans")
    .upsert({ client_id: client.id, data: state, updated_at: new Date().toISOString() }, { onConflict: "client_id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${client.id}`);
  revalidatePath(`/clients/${client.id}/financial-analysis`);
  return { ok: true };
}
