import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import {
  getNextOutreachMilestone,
  getTermUrgency,
  OUTREACH_OUTCOME_LABELS,
  type TermMilestone,
  type TermUrgency,
  type OutreachOutcome,
} from "@/lib/products";
import { parseDateOnly } from "@/lib/dates";
import TermOutreachRow from "./TermOutreachRow";
import ClientSearchList from "./ClientSearchList";

// Order resolved outcomes appear in below — "unreachable" first since it's the one that still
// needs a prompt retry, "shopping" next since it's still active/ongoing, then the two settled
// outcomes. Karina, 9/8: split into separate sections by outcome rather than one flat list.
const OUTCOME_ORDER: OutreachOutcome[] = ["unreachable", "shopping", "renewing", "declining"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>;
}) {
  const { stage, view } = await searchParams;
  const needsReview = view === "needs_review";
  const outreachView = view === "outreach";
  const supabase = await createClient();

  let query = supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (needsReview) {
    query = query.eq("intake_pending_review", true);
  } else if (stage && CLIENT_STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage as ClientStage);
  }
  const { data: clients, error } = outreachView ? { data: null, error: null } : await query;

  // Separate from the stage filter above — drives the "Needs Review" chip's count badge
  // regardless of which filter is currently active.
  const { count: needsReviewCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("intake_pending_review", true);

  // Outreach (Karina, 9/4, broadened 9/7) — every product with a relevant end date (term or
  // annuity) that hasn't been converted yet, so an advisor can shop new coverage or just touch
  // base before it ends. No longer gated on is_convertible — see the comment above
  // getNextOutreachMilestone in lib/products.ts for why. Fetched regardless of which view is
  // active so the "Outreach" chip's count badge always reflects reality, same pattern as Needs
  // Review above.
  const { data: termProductsRaw, error: termProductsError } = await supabase
    .from("client_products")
    .select(
      "id, product_name, product_type, carrier, conversion_deadline, final_conversion_deadline, term_end_date, expiration_date, annuity_surrender_end_date, annuity_contract_end_date, term_contacted_at, outreach_outcome, client_id, clients!client_id(id, full_name)"
    )
    .is("converted_at", null);

  const termProducts = (termProductsRaw ?? [])
    .map((p) => {
      const client = p.clients as unknown as { id: string; full_name: string } | null;
      const milestone: TermMilestone | null = getNextOutreachMilestone({
        conversion_deadline: p.conversion_deadline,
        final_conversion_deadline: p.final_conversion_deadline,
        term_end_date: p.term_end_date,
        expiration_date: p.expiration_date,
        annuity_surrender_end_date: p.annuity_surrender_end_date,
        annuity_contract_end_date: p.annuity_contract_end_date,
      });
      if (!milestone) return null;
      const urgency: TermUrgency | null = getTermUrgency(milestone.date);
      return {
        id: p.id,
        product_name: p.product_name,
        product_type: p.product_type,
        carrier: p.carrier,
        client_id: p.client_id,
        clientName: client?.full_name ?? "Unknown client",
        contacted: !!p.term_contacted_at,
        outcome: (p.outreach_outcome as OutreachOutcome | null) ?? null,
        milestone,
        urgency,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const sortByMilestone = (a: (typeof termProducts)[number], b: (typeof termProducts)[number]) => {
    if (!a.milestone && !b.milestone) return 0;
    if (!a.milestone) return 1;
    if (!b.milestone) return -1;
    return parseDateOnly(a.milestone.date).getTime() - parseDateOnly(b.milestone.date).getTime();
  };

  // "Needs Outreach" is deliberately scoped to what's actually time-sensitive right now (within
  // 90 days, or overdue) — Karina, 9/8: "outreach need should only be the ones that are time
  // sensitive," not every unconverted/uncontacted product no matter how far off its date is (a
  // product expiring decades out was showing up here just as loudly as one expiring in 24 days).
  // A product that isn't urgent yet, and hasn't been contacted, simply doesn't appear in either
  // list below until it crosses into that window on its own.
  const needsOutreach = termProducts.filter((p) => !p.contacted && p.urgency !== "later").sort(sortByMilestone);
  // Resolved items split into their own section per outcome (Karina, 9/8) rather than one flat
  // "Already Touched Base" list. contactedLegacy catches the one case that can't have an outcome:
  // a row marked touched base before this feature existed (plain markTermContacted, no outcome
  // recorded) — shown as its own small section so it isn't silently dropped.
  const contactedByOutcome = OUTCOME_ORDER.map((outcome) => ({
    outcome,
    items: termProducts.filter((p) => p.contacted && p.outcome === outcome).sort(sortByMilestone),
  })).filter((g) => g.items.length > 0);
  const contactedLegacy = termProducts.filter((p) => p.contacted && !p.outcome).sort(sortByMilestone);

  // A client can now have many reminders (see the Reminders card on their profile),
  // so "next follow up" here means the soonest pending one, not a single stored field.
  const clientIds = (clients ?? []).map((c) => c.id);
  const nextReminderByClient = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: pendingReminders } = await supabase
      .from("reminders")
      .select("client_id, remind_at")
      .in("client_id", clientIds)
      .is("sent_at", null)
      .order("remind_at", { ascending: true });
    for (const r of pendingReminders ?? []) {
      if (!nextReminderByClient.has(r.client_id)) nextReminderByClient.set(r.client_id, r.remind_at);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Clients</h1>
        <Link
          href="/clients/new"
          className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          + New Client
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/clients"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !stage && !needsReview && !outreachView ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
          }`}
        >
          All
        </Link>
        {CLIENT_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/clients?stage=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !needsReview && !outreachView && stage === s.value ? "text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
            }`}
            style={!needsReview && !outreachView && stage === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
          >
            {s.label}
          </Link>
        ))}
        {needsReviewCount != null && needsReviewCount > 0 && (
          <Link
            href="/clients?view=needs_review"
            className={`ml-1 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              needsReview ? "border-[#8B1A1A] bg-[#8B1A1A] text-white" : "border-[#8B1A1A] text-[#8B1A1A]"
            }`}
          >
            Needs Review
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                needsReview ? "bg-white/25 text-white" : "bg-[#8B1A1A] text-white"
              }`}
            >
              {needsReviewCount}
            </span>
          </Link>
        )}
        {termProducts.length > 0 && (
          <Link
            href="/clients?view=outreach"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              outreachView ? "border-[#8b6a00] bg-[#8b6a00] text-white" : "border-[#8b6a00] text-[#8b6a00]"
            }`}
          >
            Outreach
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                outreachView ? "bg-white/25 text-white" : "bg-[#8b6a00] text-white"
              }`}
            >
              {needsOutreach.length}
            </span>
          </Link>
        )}
      </div>

      {outreachView ? (
        <div className="flex flex-col gap-6">
          {termProductsError && (
            <div className="rounded-lg border border-[#8B1A1A] bg-[#FFF5F5] p-4 text-sm font-semibold text-[#8B1A1A]">
              Couldn&rsquo;t load the outreach list — {termProductsError.message}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a00]">
              Needs Outreach ({needsOutreach.length})
            </p>
            {needsOutreach.length === 0 && !termProductsError && (
              <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-6 text-center text-sm text-[#707070]">
                Nothing needs outreach right now.
              </div>
            )}
            {needsOutreach.length > 0 && (
              <div className="flex flex-col gap-2">
                {needsOutreach.map((p) => (
                  <TermOutreachRow
                    key={p.id}
                    productId={p.id}
                    clientId={p.client_id}
                    clientName={p.clientName}
                    productName={p.product_name}
                    productType={p.product_type}
                    carrier={p.carrier}
                    milestone={p.milestone}
                    urgency={p.urgency}
                    contacted={false}
                  />
                ))}
              </div>
            )}
          </div>

          {contactedByOutcome.map(({ outcome, items }) => (
            <div key={outcome} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#707070]">
                {OUTREACH_OUTCOME_LABELS[outcome]} ({items.length})
              </p>
              <div className="flex flex-col gap-2">
                {items.map((p) => (
                  <TermOutreachRow
                    key={p.id}
                    productId={p.id}
                    clientId={p.client_id}
                    clientName={p.clientName}
                    productName={p.product_name}
                    productType={p.product_type}
                    carrier={p.carrier}
                    milestone={p.milestone}
                    urgency={p.urgency}
                    contacted={true}
                  />
                ))}
              </div>
            </div>
          ))}

          {contactedLegacy.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#707070]">
                Touched Base — No Outcome Recorded ({contactedLegacy.length})
              </p>
              <div className="flex flex-col gap-2">
                {contactedLegacy.map((p) => (
                  <TermOutreachRow
                    key={p.id}
                    productId={p.id}
                    clientId={p.client_id}
                    clientName={p.clientName}
                    productName={p.product_name}
                    productType={p.product_type}
                    carrier={p.carrier}
                    milestone={p.milestone}
                    urgency={p.urgency}
                    contacted={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-red-700">Could not load clients: {error.message}</p>}

          {!error && (
            <ClientSearchList
              clients={clients ?? []}
              nextReminderByClient={Object.fromEntries(nextReminderByClient)}
              needsReview={needsReview}
            />
          )}
        </>
      )}
    </div>
  );
}
