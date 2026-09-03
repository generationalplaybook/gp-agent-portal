import { createClient } from "@/lib/supabase/server";
import ReminderRow from "../ReminderRow";
import type { ReminderOwner } from "./actions";

export default async function RemindersPage() {
  const supabase = await createClient();

  // A reminder now belongs to either a client or (since Team/Recruits) a recruit — never both —
  // so both possible parents are joined here; only one will actually be non-null per row.
  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, remind_at, message, sent_at, client_id, recruit_id, clients(id, full_name), recruits(id, full_name)")
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
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Reminders</h1>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {pending.length === 0 && (
          <p className="text-sm text-[#707070]">No reminders set. Add one from a client&rsquo;s or recruit&rsquo;s profile.</p>
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
