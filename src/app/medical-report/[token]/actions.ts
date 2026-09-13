"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MedicalConditionDraft } from "../../(app)/clients/[id]/MedicalConditionFields";

// This route is public — no logged-in session, so requests are trusted only as far as "this is
// a real, currently-valid per-client token." createAdminClient() bypasses RLS, which is why the
// write here is scoped as narrowly as the Intake form's: exactly one new medical_conditions row,
// tied to whichever client this token resolves to. Nothing else is touched or readable from here.
export async function submitMedicalReport(
  token: string,
  draft: MedicalConditionDraft
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();

  const conditionName = draft.condition_name.trim();
  if (!conditionName) return { ok: false, error: "Please enter the condition." };

  const { data: client } = await admin.from("clients").select("id").eq("medical_report_token", token).maybeSingle();
  if (!client) return { ok: false, error: "This link is no longer valid. Please contact your advisor." };

  const { error } = await admin.from("medical_conditions").insert({
    client_id: client.id,
    condition_name: conditionName,
    onset_date: draft.onset_date || null,
    current_status: draft.current_status.trim() || null,
    latest_report_date: draft.latest_report_date || null,
    latest_report_summary: draft.latest_report_summary.trim() || null,
    hospitalizations: draft.hospitalizations.trim() || null,
    additional_notes: draft.additional_notes.trim() || null,
    events: draft.events.filter((e) => e.date || e.description.trim()),
    medications: draft.medications.filter((m) => m.name.trim()),
    submitted_by_client: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/clients/${client.id}`);
  return { ok: true };
}
