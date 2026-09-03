import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RECRUIT_STAGES, type RecruitStage } from "@/lib/types";
import LocalDateTime from "../LocalDateTime";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const { stage } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("recruits").select("*").order("updated_at", { ascending: false });
  if (stage && RECRUIT_STAGES.some((s) => s.value === stage)) {
    query = query.eq("stage", stage as RecruitStage);
  }
  const { data: recruits, error } = await query;

  // Same "soonest pending reminder" pattern as the Clients list — see clients/page.tsx.
  const recruitIds = (recruits ?? []).map((r) => r.id);
  const nextReminderByRecruit = new Map<string, string>();
  if (recruitIds.length > 0) {
    const { data: pendingReminders } = await supabase
      .from("reminders")
      .select("recruit_id, remind_at")
      .in("recruit_id", recruitIds)
      .is("sent_at", null)
      .order("remind_at", { ascending: true });
    for (const r of pendingReminders ?? []) {
      if (r.recruit_id && !nextReminderByRecruit.has(r.recruit_id)) nextReminderByRecruit.set(r.recruit_id, r.remind_at);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Team</h1>
        <Link
          href="/team/new"
          className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          + New Recruit
        </Link>
      </div>
      <p className="mb-5 text-xs text-[#707070]">
        Prospective and in-progress agents — not clients. No upline/downline here, and nothing tracks commission
        (that&rsquo;s the broker&rsquo;s job); this is just for keeping track of who&rsquo;s where and doing your
        follow-ups.
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href="/team"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !stage ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
          }`}
        >
          All
        </Link>
        {RECRUIT_STAGES.map((s) => (
          <Link
            key={s.value}
            href={`/team?stage=${s.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              stage === s.value ? "text-white" : "border-[#D9CFBA] text-[#2E2E2E]"
            }`}
            style={stage === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-sm text-red-700">Could not load team: {error.message}</p>}

      {!error && (!recruits || recruits.length === 0) && (
        <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-10 text-center text-sm text-[#707070]">
          No one tracked yet. Add your first recruit or lead to get started.
        </div>
      )}

      <div className="grid gap-3">
        {recruits?.map((r) => {
          const stageInfo = RECRUIT_STAGES.find((s) => s.value === r.stage);
          const nextReminder = nextReminderByRecruit.get(r.id) ?? null;
          const overdue = nextReminder && new Date(nextReminder) < new Date();
          return (
            <Link
              key={r.id}
              href={`/team/${r.id}`}
              className="flex items-center justify-between rounded-lg border border-[#D9CFBA] bg-white px-4 py-3 hover:border-[#1C1C1C]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1C1C1C]">{r.full_name}</span>
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
                </div>
                <div className="mt-0.5 text-xs text-[#666]">
                  {[r.phone, r.email, r.state].filter(Boolean).join(" · ") || "No contact info yet"}
                </div>
              </div>
              {nextReminder && (
                <div className="text-right text-xs text-[#707070]">
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
