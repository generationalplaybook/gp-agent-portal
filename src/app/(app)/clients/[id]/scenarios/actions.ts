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

// "This is what they're going with" — promotes a scenario to a real Product. Creates the
// client_products row (same is_quote-while-Quoted-stage logic as the normal Add Product flow),
// copies this scenario's numbers into that product's own product_illustrations row (so the
// existing per-product Illustration Summary page/PDF work immediately, no extra step), and
// links the two via converted_product_id so the scenario shows as resolved rather than being
// deleted — the "how we got here" history stays intact. Term/Final Expense riders carry over
// automatically since they already live inside the illustration data; every other Product field
// (issue date, face amount, actual premium, owner, etc.) is left for the advisor to fill in
// afterward on the new Product row itself, same as any product added normally.
export async function convertScenarioToProduct(scenarioId: string, clientId: string): Promise<string> {
  const { supabase, user } = await requireUser();

  const { data: scenario, error: scenarioError } = await supabase
    .from("illustration_scenarios")
    .select("id, product_name, product_type, carrier, data, converted_product_id")
    .eq("id", scenarioId)
    .single();

  if (scenarioError || !scenario) throw new Error(scenarioError?.message || "Scenario not found.");
  if (scenario.converted_product_id) throw new Error("This scenario has already been converted to a product.");

  const { data: clientRow } = await supabase.from("clients").select("stage").eq("id", clientId).single();
  const is_quote = clientRow?.stage === "quoted";

  const illustrationData = scenario.data as IllustrationData;
  const riders =
    illustrationData && "riders" in illustrationData && Array.isArray(illustrationData.riders)
      ? illustrationData.riders
      : [];

  const { data: product, error: productError } = await supabase
    .from("client_products")
    .insert({
      client_id: clientId,
      product_name: scenario.product_name,
      product_type: scenario.product_type,
      carrier: scenario.carrier,
      riders,
      is_quote,
    })
    .select("id")
    .single();

  if (productError || !product) throw new Error(productError?.message || "Could not create product.");

  const { error: illustrationError } = await supabase.from("product_illustrations").upsert(
    {
      product_id: product.id,
      client_id: clientId,
      product_type: scenario.product_type,
      data: scenario.data,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (illustrationError) throw new Error(illustrationError.message);

  const { error: linkError } = await supabase
    .from("illustration_scenarios")
    .update({ converted_product_id: product.id })
    .eq("id", scenarioId);
  if (linkError) throw new Error(linkError.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/scenarios/${scenarioId}`);
  revalidatePath(`/clients/${clientId}/illustrations/${product.id}`);

  return product.id as string;
}
