"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { ClientStage } from "@/lib/types";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

export async function createClientRecord(formData: FormData) {
  const { supabase, user } = await requireUser();

  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const birth_date = String(formData.get("birth_date") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;
  const stage = (String(formData.get("stage") || "lead") as ClientStage);

  if (!first_name || !last_name)
    redirect("/clients/new?error=" + encodeURIComponent("First and last name are required."));

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  const { data, error } = await supabase
    .from("clients")
    .insert({ owner_id: user.id, first_name, middle_name, last_name, phone, email, birth_date, source, stage })
    .select("id")
    .single();

  if (error || !data) {
    redirect("/clients/new?error=" + encodeURIComponent(error?.message || "Could not create client."));
  }

  revalidatePath("/clients");
  redirect(`/clients/${data!.id}`);
}

export async function updateStage(clientId: string, stage: ClientStage) {
  const { supabase } = await requireUser();
  await supabase.from("clients").update({ stage }).eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));

  // Notes, tasks, reminders, analyses, and the financial plan all cascade-delete
  // with the client (see supabase/schema.sql) — this one delete cleans up everything.
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateContactInfo(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const birth_date = String(formData.get("birth_date") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || null;

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  await supabase
    .from("clients")
    .update({ first_name, middle_name, last_name, phone, email, birth_date, source })
    .eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function addNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await supabase.from("client_notes").insert({ client_id: clientId, author_id: user.id, body });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateNote(noteId: string, clientId: string, body: string): Promise<void> {
  const { supabase } = await requireUser();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Note can't be empty.");
  const { error } = await supabase.from("client_notes").update({ body: trimmed }).eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteNote(noteId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function addTask(formData: FormData) {
  const { supabase } = await requireUser();
  const clientId = String(formData.get("client_id"));
  const title = String(formData.get("title") || "").trim();
  const dueAtRaw = String(formData.get("due_at") || "");
  if (!title) return;

  await supabase.from("client_tasks").insert({
    client_id: clientId,
    title,
    due_at: dueAtRaw ? new Date(dueAtRaw).toISOString() : null,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function toggleTask(taskId: string, clientId: string, done: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("client_tasks").update({ done }).eq("id", taskId);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteTask(taskId: string, clientId: string) {
  const { supabase } = await requireUser();
  await supabase.from("client_tasks").delete().eq("id", taskId);
  revalidatePath(`/clients/${clientId}`);
}

// ─────────────────────────────────────────────────────────────
// Family linking — family_id is just a shared grouping key (a random uuid). Every client
// row that carries the same family_id is treated as one household. Ordinary RLS on the
// clients table ("owner sees their own, admin sees all") already governs every read/write
// below — no additional access-control logic needed here.
// ─────────────────────────────────────────────────────────────

async function ensureFamilyId(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
  clientId: string,
  currentFamilyId: string | null
): Promise<string> {
  if (currentFamilyId) return currentFamilyId;
  const newFamilyId = randomUUID();
  const { error } = await supabase.from("clients").update({ family_id: newFamilyId }).eq("id", clientId);
  if (error) throw new Error(error.message);
  return newFamilyId;
}

export async function searchFamilyCandidates(
  query: string,
  excludeIds: string[]
): Promise<{ id: string; full_name: string; stage: ClientStage }[]> {
  const { supabase } = await requireUser();
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, stage")
    .ilike("full_name", `%${q}%`)
    .order("full_name")
    .limit(15);

  if (error || !data) return [];
  return data.filter((c) => !excludeIds.includes(c.id));
}

export async function linkExistingFamilyMember(
  clientId: string,
  relatedClientId: string,
  relationship: string
): Promise<void> {
  const { supabase } = await requireUser();
  if (clientId === relatedClientId) throw new Error("Can't link a client to themselves.");

  const { data: current, error: currentErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", clientId)
    .single();
  if (currentErr || !current) throw new Error(currentErr?.message || "Client not found.");

  const { data: related, error: relatedErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", relatedClientId)
    .single();
  if (relatedErr || !related) throw new Error(relatedErr?.message || "That client could not be found.");

  const familyId = await ensureFamilyId(supabase, clientId, current.family_id);

  // If the person being linked already belongs to a different family group, fold that whole
  // group into this one rather than blocking — e.g. linking in a grandchild who's already
  // grouped with a sibling should bring both siblings along, not just the one you searched for.
  if (related.family_id && related.family_id !== familyId) {
    const { error: mergeErr } = await supabase
      .from("clients")
      .update({ family_id: familyId })
      .eq("family_id", related.family_id);
    if (mergeErr) throw new Error(mergeErr.message);
  }

  const { error: linkErr } = await supabase
    .from("clients")
    .update({ family_id: familyId, family_relationship: relationship.trim() || null })
    .eq("id", relatedClientId);
  if (linkErr) throw new Error(linkErr.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${relatedClientId}`);
  revalidatePath("/clients");
}

export async function addNewFamilyMember(
  clientId: string,
  fields: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    relationship: string;
    birth_date?: string;
    phone?: string;
    email?: string;
  }
): Promise<void> {
  const { supabase, user } = await requireUser();
  const first_name = fields.first_name.trim();
  const last_name = fields.last_name.trim();
  if (!first_name || !last_name) throw new Error("First and last name are required.");

  const { data: current, error: currentErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", clientId)
    .single();
  if (currentErr || !current) throw new Error(currentErr?.message || "Client not found.");

  const familyId = await ensureFamilyId(supabase, clientId, current.family_id);

  // full_name is computed by a DB trigger from first/middle/last — don't set it here.
  const { error } = await supabase.from("clients").insert({
    owner_id: user.id,
    first_name,
    middle_name: fields.middle_name?.trim() || null,
    last_name,
    phone: fields.phone?.trim() || null,
    email: fields.email?.trim() || null,
    birth_date: fields.birth_date?.trim() || null,
    stage: "lead",
    family_id: familyId,
    family_relationship: fields.relationship.trim() || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function unlinkFamilyMember(clientId: string, memberIdToRemove: string): Promise<void> {
  const { supabase } = await requireUser();

  const { data: member, error: memberErr } = await supabase
    .from("clients")
    .select("family_id")
    .eq("id", memberIdToRemove)
    .single();
  if (memberErr || !member) throw new Error(memberErr?.message || "Client not found.");

  const familyId = member.family_id;

  const { error } = await supabase
    .from("clients")
    .update({ family_id: null, family_relationship: null })
    .eq("id", memberIdToRemove);
  if (error) throw new Error(error.message);

  // If that leaves only one person in the family group, a "family of one" is meaningless —
  // clear their family_id too so the section cleanly resets to "no family linked yet".
  if (familyId) {
    const { data: remaining } = await supabase.from("clients").select("id").eq("family_id", familyId);
    if (remaining && remaining.length === 1) {
      await supabase
        .from("clients")
        .update({ family_id: null, family_relationship: null })
        .eq("id", remaining[0].id);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${memberIdToRemove}`);
  revalidatePath("/clients");
}

// ─────────────────────────────────────────────────────────────
// Client Products — policies/coverage a client already owns (not something the advisor is
// selling them now), so the advisor can see at a glance what's in force and, for a term
// policy, whether it can still convert to a permanent product without a new medical exam.
// ─────────────────────────────────────────────────────────────

export interface ProductFields {
  product_name: string;
  product_type?: string;
  carrier?: string;
  issue_date?: string;
  expiration_date?: string;
  conversion_deadline?: string;
  conversion_notes?: string;
  face_amount?: string;
  premium?: string;
  // Bare-minimum monthly premium that keeps the policy from lapsing (usually lower than
  // `premium`, common on UL/IUL products).
  minimum_premium?: string;
  notes?: string;
  // Who owns this product right now, when it's someone other than the client it's attached to —
  // e.g. a parent owns a juvenile policy until the covered child turns 18. Set to another
  // linked family member's client id, or left empty when the client on the product owns it.
  owner_client_id?: string;
  riders?: string[];
}

function parseNumberOrNull(v?: string): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function addProduct(clientId: string, fields: ProductFields): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  const { error } = await supabase.from("client_products").insert({
    client_id: clientId,
    product_name,
    product_type: fields.product_type?.trim() || null,
    carrier: fields.carrier?.trim() || null,
    issue_date: fields.issue_date?.trim() || null,
    expiration_date: fields.expiration_date?.trim() || null,
    conversion_deadline: fields.conversion_deadline?.trim() || null,
    conversion_notes: fields.conversion_notes?.trim() || null,
    face_amount: parseNumberOrNull(fields.face_amount),
    premium: parseNumberOrNull(fields.premium),
    minimum_premium: parseNumberOrNull(fields.minimum_premium),
    notes: fields.notes?.trim() || null,
    owner_client_id: fields.owner_client_id?.trim() || null,
    riders: fields.riders ?? [],
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
}

export async function updateProduct(productId: string, clientId: string, fields: ProductFields): Promise<void> {
  const { supabase } = await requireUser();
  const product_name = fields.product_name.trim();
  if (!product_name) throw new Error("Product name is required.");

  const { error } = await supabase
    .from("client_products")
    .update({
      product_name,
      product_type: fields.product_type?.trim() || null,
      carrier: fields.carrier?.trim() || null,
      issue_date: fields.issue_date?.trim() || null,
      expiration_date: fields.expiration_date?.trim() || null,
      conversion_deadline: fields.conversion_deadline?.trim() || null,
      conversion_notes: fields.conversion_notes?.trim() || null,
      face_amount: parseNumberOrNull(fields.face_amount),
      premium: parseNumberOrNull(fields.premium),
      minimum_premium: parseNumberOrNull(fields.minimum_premium),
      notes: fields.notes?.trim() || null,
      owner_client_id: fields.owner_client_id?.trim() || null,
      riders: fields.riders ?? [],
    })
    .eq("id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteProduct(productId: string, clientId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("client_products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
