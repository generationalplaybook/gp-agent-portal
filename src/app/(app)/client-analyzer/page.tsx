import { createClient } from "@/lib/supabase/server";
import AnalyzerClient from "./AnalyzerClient";
import type { AnalyzerInputs } from "@/lib/analyzer";
import { computeFA, EMPTY_FA_STATE, type FAState } from "@/lib/fa";
import { formatMoney } from "@/lib/illustration";

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

  // 9/11 — Karina: "once the financial need analysis is done, can it also mesh in with the
  // recommendations for the products?" Reads the client's CURRENT saved Financial Needs Analysis
  // every time the Analyzer is opened from their profile (see the "Get Product Recommendations"
  // link on the FA Report tab and the profile page) — a fresh read against whatever the FNA says
  // right now, not a stale snapshot. Only pre-fills income and a starting monthly budget.
  //
  // 9/11, follow-up — this used to ALSO guess a primary goal (protection/accumulation/college/
  // legacy) from whichever pillar showed the biggest gap. Pulled that back out: for a real client
  // it picked "protection" when Karina knew the client actually wanted guaranteed income, and
  // because Goal drives which follow-up questions the form even shows (time horizon, risk
  // tolerance, access-before-59½), the wrong guess made those fields disappear entirely instead of
  // just being wrong — which in turn meant the funding-source question never got asked, and that's
  // how a $1,000 lump sum slipped past the too-small-for-an-annuity guard below. A gap in the FNA
  // doesn't reliably say what PRODUCT GOAL the client actually wants — that's exactly the judgment
  // call this tool leaves to the advisor. Income and budget are safe to pre-fill because they're
  // just numbers Client Analyzer would ask for anyway, not a decision that changes what the form
  // asks or what gets recommended.
  let income: string | undefined;
  let monthlyBudget: string | undefined;
  if (matchedClient) {
    const { data: plan } = await supabase
      .from("client_financial_plans")
      .select("data")
      .eq("client_id", matchedClient.id)
      .maybeSingle();
    if (plan?.data) {
      const faState = { ...EMPTY_FA_STATE, ...(plan.data as FAState) };
      const computed = computeFA(faState);
      if (computed.cashflow.totalIncome > 0) income = formatMoney(String(computed.cashflow.totalIncome));
      if (computed.cashflow.discretionaryIncome > 0) monthlyBudget = formatMoney(String(computed.cashflow.discretionaryIncome));
    }
  }

  const prefillClient = matchedClient ? { ...matchedClient, existingCoverage, income, monthlyBudget } : null;

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
