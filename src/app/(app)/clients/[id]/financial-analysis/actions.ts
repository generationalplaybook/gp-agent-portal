"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import type { FAState } from "@/lib/fa";

async function requireUser() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user: user! };
}

export async function saveFinancialPlan(clientId: string, state: FAState): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("client_financial_plans")
    .upsert({ client_id: clientId, data: state, updated_at: new Date().toISOString() }, { onConflict: "client_id" });
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/financial-analysis`);
}
