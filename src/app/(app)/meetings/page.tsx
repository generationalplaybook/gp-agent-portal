import { createClient } from "@/lib/supabase/server";
import MeetingRow from "./MeetingRow";

// One place to see every upcoming meeting across every client, soonest first — pulled together
// from client_meetings, which is the same table each client's "Meetings & Calls" card reads
// from (manually-logged rows and rows created automatically by Cal.com Auto-Sync alike). RLS
// on client_meetings ("agents see their own, admins see all") already scopes this correctly, so
// no extra filtering is needed beyond the ordering/split below.
export default async function MeetingsPage() {
  const supabase = await createClient();

  const { data: meetings } = await supabase
    .from("client_meetings")
    .select("id, meeting_at, location, notes, source, client_id, clients(id, full_name)")
    .order("meeting_at", { ascending: true });

  const rows = meetings ?? [];
  const upcoming = rows.filter((m) => new Date(m.meeting_at) >= new Date());
  const past = [...rows.filter((m) => new Date(m.meeting_at) < new Date())].reverse();

  function clientInfo(row: (typeof rows)[number]) {
    const client = row.clients as unknown as { id: string; full_name: string } | null;
    return { id: client?.id ?? row.client_id, name: client?.full_name ?? "Unknown client" };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Meetings</h1>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {upcoming.length === 0 && (
          <p className="text-sm text-[#999]">No upcoming meetings. Add one from a client&rsquo;s profile.</p>
        )}
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {upcoming.map((m) => {
            const client = clientInfo(m);
            return (
              <MeetingRow
                key={m.id}
                meeting={m}
                clientId={client.id}
                clientName={client.name}
              />
            );
          })}
        </div>
      </div>

      {past.length > 0 && (
        <details className="mt-4 text-xs text-[#999]">
          <summary className="cursor-pointer select-none">
            {past.length} past meeting{past.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 rounded-lg border border-[#D9CFBA] bg-white p-6">
            <div className="flex flex-col divide-y divide-[#EDE8DF]">
              {past.map((m) => {
                const client = clientInfo(m);
                return (
                  <MeetingRow
                    key={m.id}
                    meeting={m}
                    clientId={client.id}
                    clientName={client.name}
                  />
                );
              })}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
