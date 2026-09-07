"use client";

import { useState } from "react";
import { searchClientsForPicker } from "./clients/actions";

export interface PickedClient {
  id: string;
  full_name: string;
}

// A client-search-and-pick input, shared between the Meetings and Reminders "quick add" flows
// (AddMeetingButton.tsx / AddReminderButton.tsx) — added 9/7 per Karina: "it's too many steps...
// it could be much faster by just going into one of the tabs that I need," rather than having to
// open a specific client's profile first just to log a meeting or set a reminder. Same
// search-as-you-type + results-dropdown pattern as FamilySection.tsx's "link existing client"
// picker (no debounce there either — matched here for consistency, and the query is capped at 15
// results server-side either way).
//
// Disambiguation: if two (or more) results share the same full_name, Karina asked that their birth
// date show underneath the name so an advisor can tell them apart ("when there is a client that's
// got the same name, it also shows their birth date underneath their name") — rather than always
// showing it, which would clutter every row for the overwhelming majority of names that aren't
// ambiguous. A client with no birth_date on file still gets a flagged line so the advisor knows
// there's nothing to disambiguate with, rather than looking like the picker forgot to check.
function formatBirthDate(birthDate: string | null): string {
  if (!birthDate) return "No birth date on file";
  // birth_date is a plain `date` column ("YYYY-MM-DD") — parsed as UTC midnight by `new Date(...)`,
  // so format from its parts directly rather than through Date/toLocaleDateString to avoid a
  // timezone off-by-one shifting it to the previous day for anyone west of UTC.
  const [y, m, d] = birthDate.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ClientPicker({
  picked,
  onPick,
  onClear,
}: {
  picked: PickedClient | null;
  onPick: (client: PickedClient) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; birth_date: string | null }[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchClientsForPicker(q));
    } finally {
      setSearching(false);
    }
  }

  const nameCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.full_name] = (acc[r.full_name] ?? 0) + 1;
    return acc;
  }, {});

  if (picked) {
    return (
      <div className="flex items-center justify-between rounded-md border border-[#D9CFBA] bg-[#F5F0E8] px-3 py-2 text-sm">
        <span className="font-semibold text-[#1C1C1C]">{picked.full_name}</span>
        <button
          type="button"
          onClick={() => {
            onClear();
            setQuery("");
            setResults([]);
          }}
          className="text-xs text-[#707070] underline hover:text-[#1C1C1C]"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="Search clients by name…"
        className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
      />
      {searching && <p className="text-xs text-[#707070]">Searching…</p>}
      {!searching && query.trim() && results.length === 0 && (
        <p className="text-xs text-[#707070]">No matching clients.</p>
      )}
      {results.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-md border border-[#D9CFBA] bg-white">
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                onPick({ id: r.id, full_name: r.full_name });
                setResults([]);
              }}
              className="cursor-pointer border-b border-[#EDE8DF] px-3 py-2 text-sm last:border-0 hover:bg-[#F5F0E8]"
            >
              <div className="text-[#1C1C1C]">{r.full_name}</div>
              {nameCounts[r.full_name] > 1 && (
                <div className="text-[11px] text-[#707070]">{formatBirthDate(r.birth_date)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
