import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES } from "@/lib/types";
import LocalDateTime from "./LocalDateTime";

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

  const [{ data: profile }, { data: clients }, { data: meetings }, { data: reminders }] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, stage"),
    supabase
      .from("client_meetings")
      .select("id, meeting_at, client_id, clients(id, full_name)")
      .order("meeting_at", { ascending: true }),
    supabase
      .from("reminders")
      .select("id, remind_at, message, sent_at, client_id, recruit_id, clients(id, full_name), recruits(id, full_name)")
      .order("remind_at", { ascending: true }),
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

  const greetingName = profile?.first_name || "there";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Welcome back, {greetingName}</h1>
        <p className="mt-1 text-sm text-[#555]">Here&rsquo;s where things stand today.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Client Pipeline */}
        <div className="flex flex-col rounded-lg border border-[#D9CFBA] bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#555]">Client Pipeline</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18l-7 8v6l-4 2v-8z" />
            </svg>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{totalClients}</span>
            <span className="text-sm text-[#555]">active clients</span>
          </div>
          {totalClients > 0 && (
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#EDE8DF]">
              {stageCounts.map((s) => (
                <div
                  key={s.value}
                  style={{ width: `${(s.count / totalClients) * 100}%`, backgroundColor: s.color }}
                  title={`${s.label}: ${s.count}`}
                />
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
            {stageCounts.map((s) => (
              <Link
                key={s.value}
                href={`/clients?stage=${s.value}`}
                className="-mx-1.5 flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-[#1C1C1C] hover:bg-[#F5F0E8] hover:underline"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label} &middot; {s.count}
              </Link>
            ))}
          </div>
          <Link href="/clients" className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]">
            View all clients &rarr;
          </Link>
        </div>

        {/* Upcoming Meetings */}
        <Link
          href="/meetings"
          className="flex flex-col rounded-lg border border-[#D9CFBA] bg-white p-6 hover:border-[#1C1C1C]"
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
                  <LocalDateTime iso={m.meeting_at} options={{ dateStyle: "medium", timeStyle: "short" }} />
                </span>
                <span className="truncate font-semibold text-[#1C1C1C]">{m.clientName}</span>
              </div>
            ))}
          </div>
          <span className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2">
            View all meetings &rarr;
          </span>
        </Link>

        {/* Reminders Due */}
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

        {/* Team Follow-ups */}
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
      </div>
    </div>
  );
}
