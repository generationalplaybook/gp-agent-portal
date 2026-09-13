"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { emptyIllustrationFor, type IllustrationData } from "@/lib/illustration";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// ─────────────────────────────────────────────────────────────
// Illustration Scenarios — see the schema comment (section 25) and the IllustrationScenario
// type in src/lib/types.ts for the full "why this is separate from Products" reasoning. Short
// version: this lets an advisor run numbers for options a client hasn't committed to yet,
// without those options ever looking like real coverage on the client's profile.
// ─────────────────────────────────────────────────────────────

export async function createScenario(
  clientId: string,
  productName: string,
  productType: string,
  carrier: string
): Promise<string> {
  const { supabase, user } = await requireUser();
  const name = productName.trim();
  if (!name) throw new Error("Give this scenario a product name first.");

  const { data, error } = await supabase
    .from("illustration_scenarios")
    .insert({
      client_id: clientId,
      product_name: name,
      product_type: productType.trim() || null,
      carrier: carrier.trim() || null,
      data: emptyIllustrationFor(productType || null),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not create scenario.");
  revalidatePath(`/clients/${clientId}`);
  return data.id as string;
}

// Product type is deliberately NOT editable here — changing it would silently discard whatever
// numbers were already entered (the data shape is different per type; see illustration.ts).
// Delete and re-add if the product type was picked wrong.
export async function saveScenario(
  scenarioId: string,
  clientId: string,
  fields: { product_name: string; carrier: string; notes: string },
  data: IllustrationData
): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  const { error } = await supabase
    .from("illustration_scenarios")
    .update({
      product_name,
      carrier: fields.carrier.trim() || null,
      notes: fields.notes.trim() || null,
      data,
    })
    .eq("id", scenarioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/scenarios/${scenarioId}`);
}

export async function deleteScenario(scenarioId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("illustration_scenarios").delete().eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// "This is what they're going with" — Karina, 9/5: retired the old auto-convert-to-Product flow
// (used to create the client_products row and copy this scenario's numbers over automatically).
// Too much mismatch between illustration numbers and what a real in-force policy record needs —
// so this no longer creates anything. It's just a dated record, for when a client later disputes
// what they agreed to: markScenarioChosen sets chosen_at, undoScenarioChosen clears it if marked
// by mistake. The advisor adds the real Product by hand afterward, same as any product added
// normally (see ProductsSection.tsx's Add Product form).
export async function markScenarioChosen(scenarioId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("illustration_scenarios")
    .update({ chosen_at: new Date().toISOString() })
    .eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/scenarios/${scenarioId}`);
}

export async function undoScenarioChosen(scenarioId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("illustration_scenarios").update({ chosen_at: null }).eq("id", scenarioId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/scenarios/${scenarioId}`);
}
