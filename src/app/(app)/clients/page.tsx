import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import {
  getNextOutreachMilestone,
  getTermUrgency,
  OUTREACH_OUTCOME_LABELS,
  effectiveOutreachOutcome,
  isGraduatedFromOutreach,
  type TermMilestone,
  type TermUrgency,
  type OutreachOutcome,
} from "@/lib/products";
import { parseDateOnly } from "@/lib/dates";
import TermOutreachRow from "./TermOutreachRow";
import ClientSearchList from "./ClientSearchList";

// Order resolved outcomes appear in below — "unreachable" first since it's the one that still
// needs a prompt retry, then "shopping" and "renewing" (both active/ongoing — back in the sales
// pipeline), then the two settled-for-now outcomes. Karina, 9/8: split into separate sections by
// outcome rather than one flat list; "keeping" added later the same day when "renewing / keeping
// as-is" split into two separate outcomes.
const OUTCOME_ORDER: OutreachOutcome[] = ["unreachable", "shopping", "renewing", "keeping", "declining"];

// Which "thumbnail" is currently expanded on the Outreach view (Karina, 9/8: "this section should
// maybe have thumbnails like the home page, so you can click into each list to do your outreach —
// if all lists are in one long line it can be easy to miss [one]"). "needs" plus every
// OutreachOutcome plus "legacy" (the pre-outcome-tracking catch-all).
type OutreachSectionKey = "needs" | OutreachOutcome | "legacy";
const OUTREACH_SECTION_KEYS: OutreachSectionKey[] = ["needs", ...OUTCOME_ORDER, "legacy"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string; section?: string }>;
}) {
  const { stage, view, section: sectionParam } = await searchParams;
  const needsReview = view === "needs_review";
  const outreachView = view === "outreach";
  const section: OutreachSectionKey | null =
    outreachView && OUTREACH_SECTION_KEYS.includes(sectionParam as OutreachSectionKey)
      ? (sectionParam as OutreachSectionKey)
      : null;
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
      "id, product_name, product_type, carrier, conversion_deadline, final_conversion_deadline, term_end_date, expiration_date, annuity_surrender_end_date, annuity_contract_end_date, term_contacted_at, outreach_outcome, client_id, clients!client_id(id, full_name, stage)"
    )
    .is("converted_at", null);

  const now = new Date();

  const termProducts = (termProductsRaw ?? [])
    .map((p) => {
      const client = p.clients as unknown as { id: string; full_name: string; stage: string | null } | null;
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
      const contacted = !!p.term_contacted_at;
      // Reclassify "shopping" -> "renewing" once the client's pipeline stage shows real progress,
      // and drop this row from the Outreach page entirely once it's graduated out (Karina, 9/8 —
      // see the comment above effectiveOutreachOutcome/isGraduatedFromOutreach in lib/products.ts
      // for the full rule set). Both are computed live from the client's CURRENT stage, never
      // written back to the stored outreach_outcome column.
      const rawOutcome = (p.outreach_outcome as OutreachOutcome | null) ?? null;
      const outcome = rawOutcome ? effectiveOutreachOutcome(rawOutcome, client?.stage ?? null) : null;
      if (contacted && outcome && p.term_contacted_at && isGraduatedFromOutreach(outcome, p.term_contacted_at, client?.stage ?? null, now)) {
        return null;
      }
      return {
        id: p.id,
        product_name: p.product_name,
        product_type: p.product_type,
        carrier: p.carrier,
        client_id: p.client_id,
        clientName: client?.full_name ?? "Unknown client",
        contacted,
        outcome,
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
  // "Already Touched Base" list. Unlike before, this keeps every outcome (even a 0-count one) —
  // the thumbnail grid below wants a full, consistent set of cards to click into, same as the
  // Client Pipeline card on the home page always shows every stage regardless of count.
  // contactedLegacy catches the one case that can't have an outcome: a row marked touched base
  // before this feature existed (plain markTermContacted, no outcome recorded) — its own small
  // section so it isn't silently dropped, but left out of the thumbnail grid entirely when empty.
  const contactedByOutcome = OUTCOME_ORDER.map((outcome) => ({
    outcome,
    items: termProducts.filter((p) => p.contacted && p.outcome === outcome).sort(sortByMilestone),
  }));
  const contactedLegacy = termProducts.filter((p) => p.contacted && !p.outcome).sort(sortByMilestone);

  // Unified list backing both the thumbnail grid and the expanded single-section view — one shape
  // for "needs", every outcome, and the legacy catch-all (only included when it actually has rows).
  const outreachSections: { key: OutreachSectionKey; label: string; items: typeof needsOutreach }[] = [
    { key: "needs", label: "Needs Outreach", items: needsOutreach },
    ...contactedByOutcome.map(({ outcome, items }) => ({ key: outcome as OutreachSectionKey, label: OUTREACH_OUTCOME_LABELS[outcome], items })),
    ...(contactedLegacy.length > 0 ? [{ key: "legacy" as OutreachSectionKey, label: "Touched Base — No Outcome Recorded", items: contactedLegacy }] : []),
  ];
  const activeSection = section ? outreachSections.find((s) => s.key === section) ?? null : null;
  // Karina, 9/8, right after the thumbnail grid went in: "show a few, maybe three to five, above
  // still... so there's something there and you see red, so you're like okay, this has gotta be
  // worked on urgently." The grid's counts alone didn't convey urgency the way actually seeing a
  // couple of real names did — this brings that back as a banner, same pattern as the Time-
  // Sensitive card on the home page (turns red when there's anything overdue/critical/soon).
  const previewNeeds = needsOutreach.slice(0, 5);

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

          {!activeSection && !termProductsError && (
            // Karina, 9/8: "once you address one and move it to a category, will another one push
            // up in? So there's always constantly five there." It will — these are real,
            // actionable rows (not just a preview), so marking one touched base drops it out of
            // needsOutreach and the next-soonest item takes its place the moment the page
            // refreshes, same as the full list. Wrapping this whole card in a Link (like the home
            // page's Time-Sensitive banner does) would have swallowed clicks on each row's own
            // dropdown/Undo button, so this is a plain div with its own "View all" link instead.
            <div
              className={`flex flex-col rounded-lg border p-6 ${
                needsOutreach.length > 0 ? "border-[#8B1A1A] bg-[#FFF5F5]" : "border-[#D9CFBA] bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    needsOutreach.length > 0 ? "text-[#8B1A1A]" : "text-[#555]"
                  }`}
                >
                  Needs Outreach
                </span>
                <span className="font-serif text-2xl font-bold text-[#1C1C1C]">{needsOutreach.length}</span>
              </div>
              {needsOutreach.length === 0 ? (
                <p className="mt-4 text-xs text-[#555]">Nothing needs outreach right now.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {previewNeeds.map((p) => (
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
              {needsOutreach.length > previewNeeds.length && (
                <Link
                  href="/clients?view=outreach&section=needs"
                  className="mt-4 self-start text-xs font-semibold text-[#1C1C1C] underline underline-offset-2"
                >
                  View all {needsOutreach.length} &rarr;
                </Link>
              )}
            </div>
          )}

          {activeSection ? (
            <div className="flex flex-col gap-3">
              <Link
                href="/clients?view=outreach"
                className="self-start text-xs font-semibold text-[#1C1C1C] underline underline-offset-2"
              >
                &larr; All categories
              </Link>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  activeSection.key === "needs" ? "text-[#8b6a00]" : "text-[#707070]"
                }`}
              >
                {activeSection.label} ({activeSection.items.length})
              </p>
              {activeSection.items.length === 0 && !termProductsError && (
                <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-6 text-center text-sm text-[#707070]">
                  Nothing here right now.
                </div>
              )}
              {activeSection.items.length > 0 && (
                <div className="flex flex-col gap-2">
                  {activeSection.items.map((p) => (
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
                      contacted={activeSection.key !== "needs"}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Thumbnail grid (Karina, 9/8): every category as its own clickable card — count plus
            // a short preview — rather than every list unrolled on one long page where a section
            // further down was easy to miss.
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outreachSections.map((s) => {
                const isNeeds = s.key === "needs";
                const preview = s.items.slice(0, 3);
                return (
                  <Link
                    key={s.key}
                    href={`/clients?view=outreach&section=${s.key}`}
                    className={`flex flex-col rounded-lg border p-5 hover:border-[#1C1C1C] ${
                      isNeeds && s.items.length > 0 ? "border-[#8b6a00] bg-[#FFFBF0]" : "border-[#D9CFBA] bg-white"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isNeeds ? "text-[#8b6a00]" : "text-[#707070]"
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="mt-2 font-serif text-3xl font-bold text-[#1C1C1C]">{s.items.length}</span>
                    <div className="mt-3 flex flex-col divide-y divide-[#EDE8DF]">
                      {preview.length === 0 && <p className="py-1 text-xs text-[#999]">Nothing here.</p>}
                      {preview.map((p) => (
                        <div key={p.id} className="truncate py-1 text-xs">
                          <span className="font-semibold text-[#1C1C1C]">{p.clientName}</span>
                          <span className="text-[#707070]"> — {p.product_name}</span>
                        </div>
                      ))}
                      {s.items.length > preview.length && (
                        <p className="py-1 text-xs text-[#999]">+{s.items.length - preview.length} more</p>
                      )}
                    </div>
                    <span className="mt-auto pt-3 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
                      {s.items.length > 0 ? "View list" : "View"} &rarr;
                    </span>
                  </Link>
                );
              })}
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
