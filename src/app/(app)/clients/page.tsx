import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import LocalDateTime from "../LocalDateTime";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>;
}) {
  const { stage, view } = await searchParams;
  const needsReview = view === "needs_review";
  const supabase = await createClient();

  let query = supabase.from("clients").select("*").order("updated_at", { ascending: false });
  if (needsReview) {
    query = query.eq("intake_pending_review", true);
  } else if (stage && CLIENT_STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage as ClientStage);
  }
  const { data: clients, error } = await query;

  // Separate from the stage filter above — drives the "Needs Review" chip's count badge
  // regardless of which filter is currently active.
  const { count: needsReviewCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("intake_pending_review", true);

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
            !stage && !needsReview ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
          }`}
        >
          All
        </Link>
        {CLIENT_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/clients?stage=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !needsReview && stage === s.value ? "text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
            }`}
            style={!needsReview && stage === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
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
      </div>

      {error && <p className="text-sm text-red-700">Could not load clients: {error.message}</p>}

      {!error && (!clients || clients.length === 0) && (
        <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-10 text-center text-sm text-[#888]">
          {needsReview ? "Nothing waiting on review — you're caught up." : "No clients yet. Add your first one to get started."}
        </div>
      )}

      <div className="grid gap-3">
        {clients?.map((c) => {
          const stageInfo = CLIENT_STAGES.find((s) => s.value === c.stage);
          const nextReminder = nextReminderByClient.get(c.id) ?? null;
          const overdue = nextReminder && new Date(nextReminder) < new Date();
          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center justify-between rounded-lg border border-[#D9CFBA] bg-white px-4 py-3 hover:border-[#1C1C1C]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1C1C]">{c.full_name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: stageInfo?.color }}
                  >
                    {stageInfo?.label}
                  </span>
                  {overdue && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                      Follow-up overdue
                    </span>
                  )}
                  {c.intake_pending_review && (
                    <span className="rounded-full bg-[#8B1A1A] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New from intake
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[#666]">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info yet"}
                </div>
              </div>
              {nextReminder && (
                <div className="text-right text-xs text-[#888]">
                  Follow up<br />
                  <LocalDateTime iso={nextReminder} options={{ dateStyle: "medium" }} />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
