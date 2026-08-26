import { createClient } from "@/lib/supabase/server";
import ReminderRow from "../ReminderRow";

export default async function RemindersPage() {
  const supabase = await createClient();

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, remind_at, message, sent_at, client_id, clients(id, full_name)")
    .order("remind_at", { ascending: true });

  const pending = (reminders ?? []).filter((r) => !r.sent_at);
  const completed = (reminders ?? []).filter((r) => r.sent_at);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Reminders</h1>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {pending.length === 0 && (
          <p className="text-sm text-[#999]">No reminders set. Add one from a client&rsquo;s profile.</p>
        )}
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {pending.map((r) => {
            const client = r.clients as unknown as { id: string; full_name: string } | null;
            return (
              <ReminderRow
                key={r.id}
                reminder={r}
                clientId={r.client_id}
                clientName={client?.full_name ?? "Unknown client"}
                clientHref={client ? `/clients/${client.id}` : undefined}
              />
            );
          })}
        </div>
      </div>

      {completed.length > 0 && (
        <details className="mt-4 text-xs text-[#999]">
          <summary className="cursor-pointer select-none">
            {completed.length} completed reminder{completed.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 rounded-lg border border-[#D9CFBA] bg-white p-6">
            <div className="flex flex-col divide-y divide-[#EDE8DF]">
              {completed.map((r) => {
                const client = r.clients as unknown as { id: string; full_name: string } | null;
                return (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    clientId={r.client_id}
                    clientName={client?.full_name ?? "Unknown client"}
                    clientHref={client ? `/clients/${client.id}` : undefined}
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
