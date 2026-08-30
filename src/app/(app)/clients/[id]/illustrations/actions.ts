"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { IllustrationData } from "@/lib/illustration";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

// One illustration per product — saving again overwrites the previous one rather than
// versioning, since the mental model is "the current illustration for this policy."
export async function saveIllustration(
  clientId: string,
  productId: string,
  productType: string | null,
  data: IllustrationData
): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("product_illustrations").upsert(
    {
      product_id: productId,
      client_id: clientId,
      product_type: productType,
      data,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/illustrations/${productId}`);
}

export async function deleteIllustration(clientId: string, productId: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("product_illustrations").delete().eq("product_id", productId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/illustrations/${productId}`);
}
