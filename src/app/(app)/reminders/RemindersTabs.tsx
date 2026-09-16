"use client";

import { useMemo, useState } from "react";
import ReminderRow from "../ReminderRow";
import type { ReminderOwner } from "./actions";

type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later";

const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This Week",
  later: "Later",
};
const UPCOMING_BUCKETS: Bucket[] = ["overdue", "today", "tomorrow"];
const LATER_BUCKETS: Bucket[] = ["week", "later"];

interface ReminderLike {
  id: string;
  remind_at: string;
  message: string | null;
  sent_at: string | null;
}

interface RowProps {
  owner: ReminderOwner;
  subjectName?: string;
  subjectHref?: string;
  pendingExtend?: boolean;
}

interface Item {
  reminder: ReminderLike;
  rowProps: RowProps;
}

interface Section {
  bucket: Bucket;
  label: string;
  rows: Item[];
}

// Split out of reminders/page.tsx (9/16) for two reasons:
// 1. The day-grouped sections (Overdue/Today/Tomorrow/This Week/Later) live behind two tabs
//    instead of one long flat list — Karina: "today and tomorrow you should see, and then this
//    week and later should be on a separate tab... this page could get really, really long
//    otherwise." Overdue/Today/Tomorrow stay on the tab that's already selected on page load;
//    This Week/Later sit behind the second tab.
// 2. The bucketing itself has to happen HERE, in a "use client" component, not back in the
//    server-rendered page — Karina, 9/16: "why does this show as today when today is Sept
//    15th." The page fetches data in a Server Component, which runs on the server's clock
//    (UTC in this deployment); computing "today"/"tomorrow" boundaries there used the server's
//    calendar day, not the advisor's. Same root cause LocalDateTime.tsx exists to fix for a
//    single timestamp — this just needed the same fix applied to calendar-day boundaries.
export default function RemindersTabs({ items }: { items: Item[] }) {
  const [tab, setTab] = useState<"upcoming" | "later">("upcoming");

  const { upcomingSections, laterSections, laterCount, upcomingCount } = useMemo(() => {
    function startOfDay(d: Date): Date {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    }
    const todayStart = startOfDay(new Date());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const dayAfterTomorrowStart = new Date(todayStart);
    dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 2);
    const weekEndStart = new Date(todayStart);
    weekEndStart.setDate(weekEndStart.getDate() + 7);

    function bucketFor(iso: string): Bucket {
      const t = new Date(iso).getTime();
      if (t < todayStart.getTime()) return "overdue";
      if (t < tomorrowStart.getTime()) return "today";
      if (t < dayAfterTomorrowStart.getTime()) return "tomorrow";
      if (t < weekEndStart.getTime()) return "week";
      return "later";
    }

    const grouped: Record<Bucket, Item[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [] };
    for (const item of items) {
      grouped[bucketFor(item.reminder.remind_at)].push(item);
    }

    function sectionsFor(buckets: Bucket[]): Section[] {
      return buckets.map((bucket) => ({ bucket, label: BUCKET_LABELS[bucket], rows: grouped[bucket] }));
    }

    return {
      upcomingSections: sectionsFor(UPCOMING_BUCKETS),
      laterSections: sectionsFor(LATER_BUCKETS),
      laterCount: grouped.week.length + grouped.later.length,
      upcomingCount: grouped.overdue.length + grouped.today.length + grouped.tomorrow.length,
    };
  }, [items]);

  const sections = tab === "upcoming" ? upcomingSections : laterSections;

  return (
    <div>
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#D9CFBA]">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "upcoming" ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#707070] hover:text-[#1C1C1C]"
          }`}
        >
          Upcoming{upcomingCount > 0 ? ` · ${upcomingCount}` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("later")}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${
            tab === "later" ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#707070] hover:text-[#1C1C1C]"
          }`}
        >
          This Week &amp; Later{laterCount > 0 ? ` · ${laterCount}` : ""}
        </button>
      </div>

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-4 sm:p-6">
        {tab === "upcoming" && upcomingCount === 0 && (
          <p className="text-sm text-[#707070]">Nothing overdue, due today, or due tomorrow.</p>
        )}
        {tab === "later" && laterCount === 0 && <p className="text-sm text-[#707070]">Nothing due later than tomorrow.</p>}
        {sections.map((section) => {
          if (section.rows.length === 0) return null;
          return (
            <div key={section.bucket} className="mb-2 last:mb-0">
              <div
                className={`pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide first:pt-0 ${
                  section.bucket === "overdue" ? "text-[#8B1A1A]" : "text-[#8A7B52]"
                }`}
              >
                {section.label} &middot; {section.rows.length}
              </div>
              <div className="flex flex-col divide-y divide-[#EDE8DF] border-t border-[#EDE8DF]">
                {section.rows.map(({ reminder, rowProps }) => (
                  <ReminderRow key={reminder.id} reminder={reminder} {...rowProps} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
