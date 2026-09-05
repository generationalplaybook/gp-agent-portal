"use client";

import { useState } from "react";
import Link from "next/link";
import { CLIENT_STAGES, type Client } from "@/lib/types";
import LocalDateTime from "../LocalDateTime";

// Live name search on the Clients list (Karina, 9/5): "if I could start typing their name, and
// it could start eliminating the ones that don't meet what I'm typing" — filters client-side as
// you type (no page reload per keystroke), since the list isn't in alphabetical order and only
// gets harder to scan as it grows. Scoped to the main "All clients"/stage/Needs Review list; the
// Term view on this same page has its own different (grouped, not flat) layout.
export default function ClientSearchList({
  clients,
  nextReminderByClient,
  needsReview,
}: {
  clients: Client[];
  nextReminderByClient: Record<string, string>;
  needsReview: boolean;
}) {
  const [search, setSearch] = useState("");
  const trimmed = search.trim().toLowerCase();
  const filtered = trimmed ? clients.filter((c) => c.full_name.toLowerCase().includes(trimmed)) : clients;

  return (
    <div className="flex flex-col gap-3">
      {clients.length > 0 && (
        <div className="relative">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#707070"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name…"
            className="w-full rounded-md border border-[#D9CFBA] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </div>
      )}

      {clients.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-10 text-center text-sm text-[#707070]">
          {needsReview ? "Nothing waiting on review — you're caught up." : "No clients yet. Add your first one to get started."}
        </div>
      )}

      {clients.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#D9CFBA] bg-white/50 p-6 text-center text-sm text-[#707070]">
          No clients match &ldquo;{search.trim()}&rdquo;.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const stageInfo = CLIENT_STAGES.find((s) => s.value === c.stage);
            const nextReminder = nextReminderByClient[c.id] ?? null;
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
                  <div className="text-right text-xs text-[#707070]">
                    Follow up<br />
                    <LocalDateTime iso={nextReminder} options={{ dateStyle: "medium" }} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
