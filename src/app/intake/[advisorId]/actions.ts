"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { runAnalyzer, type AnalyzerInputs } from "@/lib/analyzer";

// Everything an advisor's public intake link submits, beyond the standard analyzer questions:
// a lightweight household snapshot (check-all-that-apply, no per-person questionnaire) so the
// advisor has a starting point without overwhelming whoever's filling this out.
export interface IntakeFamilyInput {
  spouse: boolean;
  children: boolean;
  childrenAges: string;
  dependents: boolean;
}

function buildHouseholdSummary(family: IntakeFamilyInput): string | null {
  const parts: string[] = [];
  if (family.spouse) parts.push("Spouse");
  if (family.children) {
    const ages = family.childrenAges.trim();
    parts.push(ages ? `Children (ages: ${ages})` : "Children");
  }
  if (family.dependents) parts.push("Aging parent(s) or other dependents");
  return parts.length > 0 ? parts.join("; ") : null;
}

// This route is public — no logged-in session, so requests are trusted only as far as
// "this is a real advisor's id." createAdminClient() bypasses RLS, which is why every write
// here is scoped narrowly: exactly one new client row (owned by that advisor) and one analysis
// row tied to it. Nothing else.
export async function submitIntake(
  advisorId: string,
  contact: { firstName: string; middleName: string; lastName: string },
  inputs: AnalyzerInputs,
  family: IntakeFamilyInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const firstName = contact.firstName.trim();
  const lastName = contact.lastName.trim();
  const middleName = contact.middleName.trim() || null;
  if (!firstName || !lastName) return { ok: false, error: "First and last name are required." };

  const { data: advisor } = await admin.from("profiles").select("id").eq("id", advisorId).maybeSingle();
  if (!advisor) return { ok: false, error: "This intake link is no longer valid. Please contact your advisor." };

  const householdSummary = buildHouseholdSummary(family);

  // full_name is derived by a DB trigger from first/middle/last — never set it directly here.
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      owner_id: advisorId,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      phone: inputs.phone.trim() || null,
      email: inputs.email.trim() || null,
      birth_date: inputs.dob || null,
      stage: "lead",
      source: "Client Intake Form",
      intake_pending_review: true,
      household_summary: householdSummary,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    return { ok: false, error: clientError?.message || "Could not submit — please try again." };
  }

  // Run the same recommendation engine the advisor's own Client Analyzer uses, so the advisor
  // has scenarios already worked out before the first meeting — but this result is never shown
  // to whoever is filling out this form, only saved for the advisor to review later.
  const fullInputs: AnalyzerInputs = {
    ...inputs,
    name: [firstName, middleName, lastName].filter(Boolean).join(" "),
  };
  const result = runAnalyzer(fullInputs);

  const { error: analysisError } = await admin.from("client_analyses").insert({
    client_id: client.id,
    inputs: fullInputs,
    result,
    from_intake: true,
  });

  if (analysisError) return { ok: false, error: analysisError.message };

  return { ok: true };
}
