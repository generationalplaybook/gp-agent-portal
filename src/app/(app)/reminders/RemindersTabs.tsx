"use client";

import { useState } from "react";
import ReminderRow from "../ReminderRow";
import type { ReminderOwner } from "./actions";

export type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later";

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

export interface ReminderSection {
  bucket: Bucket;
  label: string;
  rows: { reminder: ReminderLike; rowProps: RowProps }[];
}

// Split out of reminders/page.tsx (9/16) so the day-grouped sections can live behind two tabs
// instead of one long flat list — Karina: "today and tomorrow you should see, and then this week
// and later should be on a separate tab... this page could get really, really long otherwise."
// Overdue/Today/Tomorrow stay on the tab that's already selected when the page loads (so nothing
// extra needs to be clicked to see them); This Week/Later sit behind the second tab.
export default function RemindersTabs({
  upcomingSections,
  laterSections,
  laterCount,
}: {
  upcomingSections: ReminderSection[];
  laterSections: ReminderSection[];
  laterCount: number;
}) {
  const [tab, setTab] = useState<"upcoming" | "later">("upcoming");
  const sections = tab === "upcoming" ? upcomingSections : laterSections;
  const upcomingCount = upcomingSections.reduce((n, s) => n + s.rows.length, 0);

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
