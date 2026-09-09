"use client";

import { useMemo, useState } from "react";
import AgentRoleRow from "./AgentRoleRow";

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  disabled_at: string | null;
}

// Karina, 9/9: "when a team member has been removed... I think they should move to another
// tab... especially for me as admins, because then they're mixed in." Split into two tabs —
// Team (active) and Removed — rather than one list with a "Removed" badge buried in the middle
// of it. Also alphabetical now (agents arrives pre-sorted by full_name from the page query) and a
// search box: "undecided on if we need to add a search bar here... but if we think we should
// have it in the future, let's just add it now" — cheap to have ready before a growing team
// actually needs it.
export default function TeamList({
  agents,
  currentUserId,
  lastSignInById,
}: {
  agents: Agent[];
  currentUserId: string;
  lastSignInById: Record<string, string | null>;
}) {
  const [tab, setTab] = useState<"active" | "removed">("active");
  const [query, setQuery] = useState("");

  const { active, removed } = useMemo(() => {
    const active: Agent[] = [];
    const removed: Agent[] = [];
    for (const a of agents) (a.disabled_at ? removed : active).push(a);
    return { active, removed };
  }, [agents]);

  const shown = tab === "active" ? active : removed;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shown;
    return shown.filter(
      (a) => (a.full_name ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)
    );
  }, [shown, query]);

  const tabClass = (isActive: boolean) =>
    `-mb-px border-b-2 pb-2.5 text-sm ${
      isActive ? "border-[#1C1C1C] font-bold text-[#1C1C1C]" : "border-transparent text-[#707070] hover:text-[#2E2E2E]"
    }`;

  return (
    <div>
      <div className="mb-4 flex gap-5 border-b border-[#D9CFBA]">
        <button type="button" onClick={() => setTab("active")} className={tabClass(tab === "active")}>
          Team ({active.length})
        </button>
        <button type="button" onClick={() => setTab("removed")} className={tabClass(tab === "removed")}>
          Removed ({removed.length})
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email…"
        className="mb-3 w-full rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
      />

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#707070]">
          {query
            ? "No one matches that search."
            : tab === "removed"
              ? "No one's access has been removed."
              : "No advisors yet."}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {filtered.map((a) => (
            <AgentRoleRow
              key={a.id}
              agent={a}
              currentUserId={currentUserId}
              lastSignInAt={lastSignInById[a.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
