import { createClient } from "@/lib/supabase/server";
import ReminderRow from "../ReminderRow";
import AddReminderButton from "./AddReminderButton";
import type { ReminderOwner } from "./actions";

export default async function RemindersPage() {
  const supabase = await createClient();

  // A reminder now belongs to either a client or (since Team/Recruits) a recruit — never both —
  // so both possible parents are joined here; only one will actually be non-null per row.
  //
  // `!client_id` / `!recruit_id` added 9/14 — Karina: "the automatic reminder is being generated
  // when a client goes into pending status... but when I go into the reminders tab, there's also
  // nothing there pending." Root cause: once `clients.pending_checkin_reminder_id` (a reminders(id)
  // FK) existed, PostgREST had TWO relationships between `reminders` and `clients` — the original
  // `reminders.client_id -> clients.id`, plus that new one running the other way — so a bare,
  // unqualified `clients(...)` embed became ambiguous and errored, which silently emptied this
  // entire query (every reminder, not just the Pending one) rather than failing loudly anywhere.
  // The identical bug, and identical fix, applies to the home page's Reminders Due card — see the
  // comment there. `!client_id`/`!recruit_id` tells PostgREST exactly which FK to join through,
  // the same disambiguation this app's `client_products` queries already needed for the same
  // reason (it has two FKs to `clients`: `client_id` and `owner_client_id`).
  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, remind_at, message, sent_at, client_id, recruit_id, clients!client_id(id, full_name), recruits!recruit_id(id, full_name)")
    .order("remind_at", { ascending: true });

  const pending = (reminders ?? []).filter((r) => !r.sent_at);
  const completed = (reminders ?? []).filter((r) => r.sent_at);

  function rowProps(r: NonNullable<typeof reminders>[number]) {
    const client = r.clients as unknown as { id: string; full_name: string } | null;
    const recruit = r.recruits as unknown as { id: string; full_name: string } | null;
    const owner: ReminderOwner = r.client_id ? { clientId: r.client_id } : { recruitId: r.recruit_id! };
    if (client) {
      return { owner, subjectName: client.full_name, subjectHref: `/clients/${client.id}` };
    }
    if (recruit) {
      return { owner, subjectName: `${recruit.full_name} (Recruit)`, subjectHref: `/team/${recruit.id}` };
    }
    return { owner, subjectName: "Unknown", subjectHref: undefined };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Reminders</h1>
        <AddReminderButton />
      </div>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {pending.length === 0 && (
          <p className="text-sm text-[#707070]">No reminders set. Add one above, or from a client&rsquo;s or recruit&rsquo;s profile.</p>
        )}
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {pending.map((r) => (
            <ReminderRow key={r.id} reminder={r} {...rowProps(r)} />
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <details className="mt-4 text-xs text-[#707070]">
          <summary className="cursor-pointer select-none">
            {completed.length} completed reminder{completed.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 rounded-lg border border-[#D9CFBA] bg-white p-6">
            <div className="flex flex-col divide-y divide-[#EDE8DF]">
              {completed.map((r) => (
                <ReminderRow key={r.id} reminder={r} {...rowProps(r)} />
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
