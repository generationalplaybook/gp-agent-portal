import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES } from "@/lib/types";
import {
  getNextOutreachMilestone,
  getTermUrgency,
  effectiveOutreachOutcome,
  isGraduatedFromOutreach,
  OUTREACH_OUTCOME_LABELS,
  type OutreachOutcome,
} from "@/lib/products";
import { formatDateOnly, parseDateOnly } from "@/lib/dates";
import LocalDateTime from "./LocalDateTime";
import OnboardingBanner from "./OnboardingBanner";
import ClientPipelineCard from "./ClientPipelineCard";

// The landing page after login (built 9/3, replacing the old straight-to-/clients redirect —
// Karina: "I want the first home screen to be cards... it can be overwhelming" seeing the full
// client list right away). A snapshot of four things an advisor checks first thing: where the
// client pipeline stands, what's coming up, and what's overdue — each card links through to the
// real page for the details. Clients themselves are now reached via the "Clients" tab in the nav,
// same as every other section, rather than being the first thing on screen.
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: clients },
    { data: pendingReviewClients },
    { data: meetings },
    { data: reminders },
    { data: termProductsRaw, error: termProductsError },
    { data: contactedProductsRaw },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, phone, intake_slug, cal_api_key, onboarding_dismissed_at")
      .eq("id", user.id)
      .single(),
    supabase.from("clients").select("id, stage"),
    // New Intake Submissions (Karina, 9/25: "there is no alert on the dashboard" for new intake
    // forms coming in). The underlying flag/flow already existed — clients.intake_pending_review
    // is set true whenever someone submits either the Pre-Intake or full Intake public form (see
    // src/app/intake/[advisorId]/actions.ts and src/app/pre-intake/[advisorId]/actions.ts), and is
    // cleared via markClientReviewed (the "Mark Reviewed" button on a client's page) — it was just
    // never surfaced here, only on the Clients list (the "Needs Review" filter chip, same flag,
    // same /clients?view=needs_review link used below) and on the individual client page. Just
    // `id` + `source` — the dashboard card shows a count grouped by form type, not names (Karina,
    // 9/25: "we don't need people's names" once she saw it rendered).
    supabase
      .from("clients")
      .select("id, source")
      .eq("intake_pending_review", true),
    supabase
      .from("client_meetings")
      .select("id, meeting_at, client_id, clients(id, full_name)")
      .order("meeting_at", { ascending: true }),
    // 9/14 — the bare `clients(id, full_name)` embed below used to work, but broke silently once
    // clients.pending_checkin_reminder_id (a reminders(id) FK, added later — see schema.sql
    // section on Pending check-in reminders) gave PostgREST a SECOND relationship between
    // `reminders` and `clients` (the original `reminders.client_id -> clients.id`, plus this new
    // one in the opposite direction). With two paths connecting the same two tables, PostgREST
    // can't infer which one an unqualified `clients(...)` embed means, and errors out — which
    // silently emptied this whole query (`reminders` came back null, and `(reminders ?? [])`
    // swallowed it into an empty list) rather than throwing anywhere visible. That's what Karina
    // was seeing: the automatic Pending check-in reminder existed and showed fine on the client's
    // own profile (that query has no embed at all, so it never hit this), but both the Reminders
    // Due card here and the Reminders tab (same embed) showed nothing, for every reminder, not
    // just that one. Fixed the same way `client_products`'s queries elsewhere on this page already
    // had to (see `clients!client_id(...)` below) — `!client_id`/`!recruit_id` tells PostgREST
    // exactly which FK to use instead of trying to infer it.
    supabase
      .from("reminders")
      .select("id, remind_at, message, sent_at, client_id, recruit_id, clients!client_id(id, full_name), recruits!recruit_id(id, full_name)")
      .order("remind_at", { ascending: true }),
    // Time-sensitive outreach (Karina, 9/4): "it should also show up on the dashboard... so it
    // doesn't get missed." Broadened 9/7 to cover any product with a relevant end date (term or
    // annuity), not just term policies — see the comment above getNextOutreachMilestone in
    // lib/products.ts. Same not-yet-converted + not-yet-contacted universe as the Outreach view
    // on /clients, narrowed here to just the urgent ones (90 days out or overdue).
    supabase
      .from("client_products")
      .select(
        "id, product_name, conversion_deadline, final_conversion_deadline, term_end_date, expiration_date, annuity_surrender_end_date, annuity_contract_end_date, client_id, clients!client_id(id, full_name)"
      )
      .is("converted_at", null)
      .is("term_contacted_at", null),
    // 9/11 — Karina, looking at the Time-Sensitive card: "zero within 90 days, not yet touch
    // base... there has to be somewhere there's a count of how many haven't been able to be
    // reached... it should also show couldn't reach, shopping for new coverage, renewing, keeping
    // current, and declining." The card above only ever covered NOT-yet-contacted products — once
    // an advisor logs outreach, that product moves into one of these outcome buckets and used to
    // disappear from the dashboard entirely, only visible by clicking into the Outreach page. This
    // second query is exactly the "already contacted" half of that same universe, same shape as
    // the Outreach page on /clients so the two counts always agree.
    supabase
      .from("client_products")
      .select("id, term_contacted_at, outreach_outcome, client_id, clients!client_id(stage)")
      .is("converted_at", null)
      .not("term_contacted_at", "is", null),
  ]);

  const now = new Date();

  // Client Pipeline
  const totalClients = clients?.length ?? 0;
  const stageCounts = CLIENT_STAGES.map((s) => ({
    ...s,
    count: (clients ?? []).filter((c) => c.stage === s.value).length,
  }));

  // Upcoming Meetings
  const upcomingMeetings = (meetings ?? [])
    .filter((m) => new Date(m.meeting_at) >= now)
    .map((m) => {
      const client = m.clients as unknown as { id: string; full_name: string } | null;
      return { id: m.id, meeting_at: m.meeting_at, clientId: client?.id ?? m.client_id, clientName: client?.full_name ?? "Unknown client" };
    });
  const previewMeetings = upcomingMeetings.slice(0, 3);

  // Reminders Due — client-owned only; recruit-owned ones are the Team Follow-ups card below
  const clientReminders = (reminders ?? [])
    .filter((r) => !r.sent_at && r.client_id)
    .map((r) => {
      const client = r.clients as unknown as { id: string; full_name: string } | null;
      return { id: r.id, remind_at: r.remind_at, message: r.message, clientId: client?.id ?? r.client_id, clientName: client?.full_name ?? "Unknown client" };
    });
  const overdueClientReminders = clientReminders.filter((r) => new Date(r.remind_at) < now);
  const previewClientReminders = clientReminders.slice(0, 3);

  // Team Follow-ups — pending reminders tied to a recruit on the Team page
  const recruitReminders = (reminders ?? [])
    .filter((r) => !r.sent_at && r.recruit_id)
    .map((r) => {
      const recruit = r.recruits as unknown as { id: string; full_name: string } | null;
      return { id: r.id, remind_at: r.remind_at, message: r.message, recruitId: recruit?.id ?? r.recruit_id, recruitName: recruit?.full_name ?? "Unknown recruit" };
    });
  const previewRecruitReminders = recruitReminders.slice(0, 3);

  // Time-Sensitive — every not-yet-contacted product (term or annuity) within 90 days of its
  // next relevant date (or already past it), soonest/most-overdue first, so nothing gets missed.
  const urgentTermProducts = (termProductsRaw ?? [])
    .map((p) => {
      const client = p.clients as unknown as { id: string; full_name: string } | null;
      const milestone = getNextOutreachMilestone({
        conversion_deadline: p.conversion_deadline,
        final_conversion_deadline: p.final_conversion_deadline,
        term_end_date: p.term_end_date,
        expiration_date: p.expiration_date,
        annuity_surrender_end_date: p.annuity_surrender_end_date,
        annuity_contract_end_date: p.annuity_contract_end_date,
      });
      if (!milestone) return null;
      const urgency = getTermUrgency(milestone.date);
      if (urgency === "later") return null;
      return {
        id: p.id,
        productName: p.product_name,
        clientId: client?.id ?? p.client_id,
        clientName: client?.full_name ?? "Unknown client",
        milestone,
        urgency,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => parseDateOnly(a.milestone.date).getTime() - parseDateOnly(b.milestone.date).getTime());
  const previewUrgentTerm = urgentTermProducts.slice(0, 3);

  // Outreach outcome counts — same OUTCOME_ORDER/labels and the same graduation rule as the
  // Outreach page on /clients (effectiveOutreachOutcome + isGraduatedFromOutreach), so a number
  // shown here always matches what clicking through to that outcome's section shows.
  const OUTCOME_ORDER: OutreachOutcome[] = ["unreachable", "shopping", "renewing", "keeping", "declining"];
  const outcomeCounts: Record<OutreachOutcome, number> = { unreachable: 0, shopping: 0, renewing: 0, keeping: 0, declining: 0 };
  (contactedProductsRaw ?? []).forEach((p) => {
    const client = p.clients as unknown as { stage: string | null } | null;
    const rawOutcome = (p.outreach_outcome as OutreachOutcome | null) ?? null;
    if (!rawOutcome || !p.term_contacted_at) return;
    const outcome = effectiveOutreachOutcome(rawOutcome, client?.stage ?? null);
    if (isGraduatedFromOutreach(outcome, p.term_contacted_at, client?.stage ?? null, now)) return;
    outcomeCounts[outcome] += 1;
  });

  // New Intake Submissions — grouped by which form they came through (Pre-Intake vs. full
  // Intake) rather than listing names, per Karina, 9/25: "we don't need people's names," and
  // shown as compact inline pills, same pattern as the outcome-count pills on the Time-Sensitive
  // card right below it ("short and in line with the time sensitive").
  const newIntakeClients = pendingReviewClients ?? [];
  const newIntakeBySource = new Map<string, number>();
  newIntakeClients.forEach((c) => {
    const label = c.source || "Intake form";
    newIntakeBySource.set(label, (newIntakeBySource.get(label) ?? 0) + 1);
  });

  const greetingName = profile?.first_name || "there";

  // Getting Started progress — three real, live signals (never a stored flag, so there's nothing
  // to reset/lose — see TourEngine.tsx and tour-steps.ts). Same detection as getting-started/page.tsx.
  const onboardingTotalSteps = 3;
  const onboardingDoneCount = [
    !!(profile?.first_name && profile?.last_name && profile?.phone),
    !!profile?.intake_slug,
    !!profile?.cal_api_key,
  ].filter(Boolean).length;
  const showOnboardingBanner = !profile?.onboarding_dismissed_at && onboardingDoneCount < onboardingTotalSteps;

  // Card order — reordered 9/26 per Karina ("we need to reorder this page"), from the original
  // New Intake/Time-Sensitive-then-everything-else split into a single "urgent-first" flow:
  // New Intake, Reminders Due, Time-Sensitive, Team Follow-ups, Client Pipeline, Upcoming
  // Meetings. Anything that needs action now leads; the two overview cards (Client Pipeline,
  // Upcoming Meetings) trail. Used below to make the LAST card span full width when New Intake
  // is hidden (an odd number of cards otherwise leaves one alone, half-width, at the end).
  const hasNewIntake = newIntakeClients.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Welcome back, {greetingName}</h1>
        <p className="mt-1 text-sm text-[#555]">Here&rsquo;s where things stand today.</p>
      </div>

      {showOnboardingBanner && <OnboardingBanner doneCount={onboardingDoneCount} totalCount={onboardingTotalSteps} />}

      {/* Single flowing grid, urgent-first (see hasNewIntake/card-order comment above) — merged
          9/26 from what used to be two separate grid containers (a New Intake/Time-Sensitive row,
          then a second row for the other four) once the requested order interleaved cards that
          used to live in different rows. New Intake only renders when there's something to
          review, so on a normal day this just starts at Reminders Due. */}
      <div className="grid gap-6 sm:grid-cols-2">
        {hasNewIntake && (
          <Link
            href="/clients?view=needs_review"
            className="flex flex-col rounded-lg border border-[#8B1A1A] bg-[#FFF5F5] p-6 hover:border-[#1C1C1C]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#8B1A1A]">
                New Intake Submissions
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 12 6 8z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{newIntakeClients.length}</span>
              <span className="text-sm text-[#555]">awaiting review</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(newIntakeBySource.entries()).map(([label, count]) => (
                <span
                  key={label}
                  className="rounded-full border border-[#8B1A1A]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#8B1A1A]"
                >
                  {label}: {count}
                </span>
              ))}
            </div>
            <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
              Review submissions &rarr;
            </span>
          </Link>
        )}

        {/* Reminders Due — moved up to lead, alongside New Intake, per the urgent-first reorder
            above; unchanged otherwise. */}
        <Link
          href="/reminders"
          className="flex flex-col rounded-lg border border-[#D9CFBA] bg-white p-6 hover:border-[#1C1C1C]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#555]">Reminders Due</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 12 6 8z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{clientReminders.length}</span>
            {overdueClientReminders.length > 0 && (
              <span className="text-sm font-semibold text-[#B23B3B]">{overdueClientReminders.length} overdue</span>
            )}
            {overdueClientReminders.length === 0 && <span className="text-sm text-[#555]">pending</span>}
          </div>
          <div className="mt-4 flex flex-col divide-y divide-[#EDE8DF]">
            {previewClientReminders.length === 0 && <p className="py-1 text-xs text-[#555]">No reminders due.</p>}
            {previewClientReminders.map((r) => {
              const overdue = new Date(r.remind_at) < now;
              return (
                <div key={r.id} className={`truncate py-1.5 text-xs ${overdue ? "font-semibold text-[#B23B3B]" : "text-[#1C1C1C]"}`}>
                  {r.message || "Follow up"} &mdash; {r.clientName}
                </div>
              );
            })}
          </div>
          <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
            View all reminders &rarr;
          </span>
        </Link>

        {/* Time-Sensitive — Karina, 9/4: "it should also show up on the dashboard as things
            the adviser needs to immediately get to... so it doesn't get missed." Broadened 9/7
            beyond term policies — see the comment on the termProductsRaw query above. */}
        <Link
          href="/clients?view=outreach"
          className={`flex flex-col rounded-lg border p-6 hover:border-[#1C1C1C] ${
            urgentTermProducts.length > 0 ? "border-[#8B1A1A] bg-[#FFF5F5]" : "border-[#D9CFBA] bg-white"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                urgentTermProducts.length > 0 ? "text-[#8B1A1A]" : "text-[#555]"
              }`}
            >
              Time-Sensitive
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={urgentTermProducts.length > 0 ? "#8B1A1A" : "#555555"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{urgentTermProducts.length}</span>
            <span className="text-sm text-[#555]">within 90 days, not yet touched base</span>
          </div>
          {/* 9/11 — Karina: "there has to be somewhere there's a count of how many haven't been
              able to be reached... it should also show couldn't reach, shopping for new coverage,
              renewing, keeping current, and declining." These already had their own sections on the
              Outreach page — this surfaces the same counts right here so a 0 above doesn't read as
              "nothing to do" when there's still a pile of already-contacted-but-unresolved clients
              (especially "Couldn't reach them yet") worth a follow-up. */}
          <div className="mt-3 flex flex-wrap gap-2">
            {OUTCOME_ORDER.map((outcome) => (
              <span
                key={outcome}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  outcomeCounts[outcome] > 0 ? "border-[#8B1A1A]/30 bg-white text-[#8B1A1A]" : "border-[#D9CFBA] bg-white text-[#707070]"
                }`}
              >
                {OUTREACH_OUTCOME_LABELS[outcome]}: {outcomeCounts[outcome]}
              </span>
            ))}
          </div>
          {previewUrgentTerm.length > 0 && (
            <div className="mt-4 flex flex-col divide-y divide-[#EDE8DF]">
              {previewUrgentTerm.map((p) => (
                <div key={p.id} className="py-1.5 text-xs">
                  <span className="font-semibold text-[#8B1A1A]">{p.clientName}</span>
                  <br />
                  <span className="text-[#666]">
                    {p.productName}: {p.milestone.label}{" "}
                    {formatDateOnly(p.milestone.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
          {termProductsError && (
            <p className="mt-4 text-xs font-semibold text-[#8B1A1A]">
              Couldn&rsquo;t load this: {termProductsError.message}
            </p>
          )}
          {!termProductsError && urgentTermProducts.length === 0 && (
            <p className="mt-4 text-xs text-[#555]">Nothing urgent right now.</p>
          )}
          <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
            View outreach queue &rarr;
          </span>
        </Link>

        {/* Team Follow-ups — moved up next to the other action-needed cards per the urgent-first
            reorder above; unchanged otherwise. */}
        <Link
          href="/team"
          className="flex flex-col rounded-lg border border-[#D9CFBA] bg-white p-6 hover:border-[#1C1C1C]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#555]">Team Follow-ups</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
              <line x1="18" y1="8" x2="18" y2="14" />
              <line x1="15" y1="11" x2="21" y2="11" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{recruitReminders.length}</span>
            <span className="text-sm text-[#555]">due follow-ups</span>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-[#EDE8DF]">
            {previewRecruitReminders.length === 0 && <p className="py-1 text-xs text-[#555]">No recruiting follow-ups due.</p>}
            {previewRecruitReminders.map((r) => (
              <div key={r.id} className="truncate py-1.5 text-xs text-[#1C1C1C]">
                {r.message || "Follow up"} &mdash; {r.recruitName}
              </div>
            ))}
          </div>
          <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
            View team &rarr;
          </span>
        </Link>

        {/* Client Pipeline — now a shared client component (ClientPipelineCard.tsx) so the
            whole card can be clickable/hoverable like the other three below (9/16, Karina:
            "Client pipeline does nothing... needs to be a clickable box as well"), while still
            keeping its per-stage links working. See that file's comment for why it needed to
            move out of this server component. */}
        <ClientPipelineCard totalClients={totalClients} stageCounts={stageCounts} />

        {/* Upcoming Meetings — last in the new order, so it's the one that gets full width
            (sm:col-span-2) on the odd-card-count day New Intake is hidden. */}
        <Link
          href="/meetings"
          className={`flex flex-col rounded-lg border border-[#D9CFBA] bg-white p-6 hover:border-[#1C1C1C] ${
            hasNewIntake ? "" : "sm:col-span-2"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#555]">Upcoming Meetings</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="3" x2="8" y2="7" />
              <line x1="16" y1="3" x2="16" y2="7" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{upcomingMeetings.length}</span>
            <span className="text-sm text-[#555]">upcoming</span>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-[#EDE8DF]">
            {previewMeetings.length === 0 && <p className="py-1 text-xs text-[#555]">No upcoming meetings.</p>}
            {previewMeetings.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                <span className="whitespace-nowrap text-[#555]">
                  <LocalDateTime
                    iso={m.meeting_at}
                    options={{ weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }}
                  />
                </span>
                <span className="truncate font-semibold text-[#1C1C1C]">{m.clientName}</span>
              </div>
            ))}
          </div>
          <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
            View all meetings &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
