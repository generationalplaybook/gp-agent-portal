"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

// Extracted out of the home page (9/16) so the whole card can be clickable like the other three
// dashboard cards (Upcoming Meetings, Reminders Due, Team Follow-ups all wrap themselves in a
// single <Link> and darken their border on hover) — Karina: "Client pipeline does nothing...
// [it] needs to be a clickable box as well." Those other cards have nothing interactive nested
// inside them, so an outer <Link> was enough. This one is different: the per-stage rows
// (e.g. "Pending · 4") are their own links to a filtered view, and a real <a> can't nest inside
// another real <a> (invalid HTML — the nested one would break). So this card is a plain "use
// client" div with an onClick that navigates to /clients, while each per-stage Link stops the
// click from bubbling up to that handler — clicking a stage still jumps to that filtered list,
// and clicking anywhere else in the card goes to the full client list, same as the others.
export default function ClientPipelineCard({
  totalClients,
  stageCounts,
}: {
  totalClients: number;
  stageCounts: { value: string; label: string; color: string; count: number }[];
}) {
  const router = useRouter();

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push("/clients")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push("/clients");
      }}
      className="flex cursor-pointer flex-col rounded-lg border border-[#D9CFBA] bg-white p-6 hover:border-[#1C1C1C]"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#555]">Client Pipeline</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4h18l-7 8v6l-4 2v-8z" />
        </svg>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-4xl font-bold text-[#1C1C1C]">{totalClients}</span>
        <span className="text-sm text-[#555]">active clients</span>
      </div>
      {totalClients > 0 && (
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#EDE8DF]">
          {stageCounts.map((s) => (
            <div
              key={s.value}
              style={{ width: `${(s.count / totalClients) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.count}`}
            />
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {stageCounts.map((s) => (
          <Link
            key={s.value}
            href={`/clients?stage=${s.value}`}
            onClick={(e) => e.stopPropagation()}
            className="-mx-1.5 flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-[#1C1C1C] hover:bg-[#F5F0E8] hover:underline"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} &middot; {s.count}
          </Link>
        ))}
      </div>
      <Link
        href="/clients"
        onClick={(e) => e.stopPropagation()}
        className="mt-auto pt-4 text-xs font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]"
      >
        View all clients &rarr;
      </Link>
    </div>
  );
}
