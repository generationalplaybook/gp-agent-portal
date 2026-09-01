import { createClient } from "@/lib/supabase/server";
import AnalyzerClient from "./AnalyzerClient";
import type { AnalyzerInputs } from "@/lib/analyzer";

export default async function ClientAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; reanalysis?: string }>;
}) {
  const { client: clientId, reanalysis: reanalysisId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let advisor: { name?: string; phone?: string; email?: string } | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .single();
    advisor = {
      name: profile?.full_name ?? undefined,
      phone: profile?.phone ?? undefined,
      email: profile?.email ?? user.email ?? undefined,
    };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, phone, email, birth_date, gender, height_ft, height_in, weight")
    .order("full_name", { ascending: true });

  const matchedClient = clientId ? clients?.find((c) => c.id === clientId) ?? null : null;

  // Pull this client's existing Products so "what do they already have" starts pre-filled
  // instead of the advisor having to remember and retype it.
  let existingCoverage: string | undefined;
  if (matchedClient) {
    const { data: products } = await supabase
      .from("client_products")
      .select("product_name")
      .eq("client_id", matchedClient.id);
    if (products && products.length > 0) {
      existingCoverage = products.map((p) => p.product_name).join(", ");
    }
  }

  const prefillClient = matchedClient ? { ...matchedClient, existingCoverage } : null;

  // "Re-run with these answers" — scoped to both the analysis id AND this client id so a
  // stray/tampered reanalysis param can't pull in another client's snapshot. A full snapshot
  // of the old inputs takes priority over the partial contact-only prefill above.
  let prefillInputs: AnalyzerInputs | null = null;
  if (reanalysisId && matchedClient) {
    const { data: oldAnalysis } = await supabase
      .from("client_analyses")
      .select("inputs")
      .eq("id", reanalysisId)
      .eq("client_id", matchedClient.id)
      .maybeSingle();
    prefillInputs = (oldAnalysis?.inputs as AnalyzerInputs | undefined) ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Client Analyzer</h1>
      <AnalyzerClient
        advisor={advisor}
        existingClients={(clients ?? []).map((c) => ({ id: c.id, full_name: c.full_name }))}
        prefillClient={prefillClient}
        prefillInputs={prefillInputs}
      />
    </div>
  );
}
