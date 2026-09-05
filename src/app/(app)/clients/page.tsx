import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import { getNextTermMilestone, getTermUrgency, type TermMilestone, type TermUrgency } from "@/lib/products";
import TermOutreachRow from "./TermOutreachRow";
import ClientSearchList from "./ClientSearchList";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>;
}) {
  const { stage, view } = await searchParams;
  const needsReview = view === "needs_review";
  const termView = view === "term";
  const supabase = await createClient();

  let query = supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (needsReview) {
    query = query.eq("intake_pending_review", true);
  } else if (stage && CLIENT_STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage as ClientStage);
  }
  const { data: clients, error } = termView ? { data: null, error: null } : await query;

  // Separate from the stage filter above — drives the "Needs Review" chip's count badge
  // regardless of which filter is currently active.
  const { count: needsReviewCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("intake_pending_review", true);

  // Term outreach (Karina, 9/4) — every term policy (convertible or not) that hasn't been
  // converted yet, so an advisor can shop new coverage or just touch base before it ends. Fetched
  // regardless of which view is active so the "Term" chip's count badge always reflects reality,
  // same pattern as Needs Review above.
  const { data: termProductsRaw } = await supabase
    .from("client_products")
    .select(
      "id, product_name, product_type, carrier, conversion_deadline, final_conversion_deadline, term_end_date, expiration_date, term_contacted_at, client_id, clients(id, full_name)"
    )
    .eq("is_convertible", true)
    .is("converted_at", null);

  const termProducts = (termProductsRaw ?? []).map((p) => {
    const client = p.clients as unknown as { id: string; full_name: string } | null;
    const milestone: TermMilestone | null = getNextTermMilestone({
      conversion_deadline: p.conversion_deadline,
      final_conversion_deadline: p.final_conversion_deadline,
      term_end_date: p.term_end_date,
      expiration_date: p.expiration_date,
    });
    const urgency: TermUrgency | null = milestone ? getTermUrgency(milestone.date) : null;
    return {
      id: p.id,
      product_name: p.product_name,
      product_type: p.product_type,
      carrier: p.carrier,
      client_id: p.client_id,
      clientName: client?.full_name ?? "Unknown client",
      contacted: !!p.term_contacted_at,
      milestone,
      urgency,
    };
  });

  const sortByMilestone = (a: (typeof termProducts)[number], b: (typeof termProducts)[number]) => {
    if (!a.milestone && !b.milestone) return 0;
    if (!a.milestone) return 1;
    if (!b.milestone) return -1;
    return new Date(a.milestone.date).getTime() - new Date(b.milestone.date).getTime();
  };

  const needsOutreach = termProducts.filter((p) => !p.contacted).sort(sortByMilestone);
  const contacted = termProducts.filter((p) => p.contacted).sort(sortByMilestone);

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
            !stage && !needsReview && !termView ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
          }`}
        >
          All
        </Link>
        {CLIENT_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/clients?stage=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !needsReview && !termView && stage === s.value ? "text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
            }`}
            style={!needsReview && !termView && stage === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
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
            href="/clients?view=term"
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              termView ? "border-[#8b6a00] bg-[#8b6a00] text-white" : "border-[#8b6a00] text-[#8b6a00]"
            }`}
          >
            Term
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                termView ? "bg-white/25 text-white" : "bg-[#8b6a00] text-white"
              }`}
            >
              {needsOutreach.length}
            </span>
          </Link>
        )}
      </div>

      {termView ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8b6a00]">
              Needs Outreach ({needsOutreach.length})
            </p>
            {needsOutreach.length === 0 && (
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

          {contacted.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#707070]">
                Already Touched Base ({contacted.length})
              </p>
              <div className="flex flex-col gap-2">
                {contacted.map((p) => (
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
