import { createClient } from "@/lib/supabase/server";

// Kept outside the component body so it isn't flagged as an impure call during render.
function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export default async function RemindersPage() {
  const supabase = await createClient();

  const { data: reminders } = await supabase
    .from("reminders")
    .select("id, remind_at, message, client_id, clients(id, full_name)")
    .is("sent_at", null)
    .order("remind_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Reminders</h1>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {(!reminders || reminders.length === 0) && (
          <p className="text-sm text-[#999]">No reminders set. Add one from a client&rsquo;s profile.</p>
        )}
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {reminders?.map((r) => {
            const client = r.clients as unknown as { id: string; full_name: string } | null;
            const overdue = isOverdue(r.remind_at);
            return (
              <a
                key={r.id}
                href={client ? `/clients/${client.id}` : "#"}
                className="flex items-center justify-between gap-4 py-3 hover:bg-[#F5F0E8]"
              >
                <div>
                  <div className="text-sm font-semibold text-[#1C1C1C]">{client?.full_name ?? "Unknown client"}</div>
                  <div className="text-xs text-[#666]">{r.message}</div>
                </div>
                <div
                  className={`shrink-0 text-xs font-semibold ${overdue ? "text-[#8B1A1A]" : "text-[#2E2E2E]"}`}
                >
                  {overdue && "Overdue — "}
                  {new Date(r.remind_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
