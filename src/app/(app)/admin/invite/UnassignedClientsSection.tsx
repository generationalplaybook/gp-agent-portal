"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reassignClients } from "./actions";

interface UnassignedClient {
  id: string;
  full_name: string;
  stage: string;
  created_at: string;
}

interface ActiveAgent {
  id: string;
  full_name: string | null;
  email: string | null;
}

// Shows once at least one client's owner_id is null — the result of an admin using "Remove
// access" on the advisor who used to own them (see AgentRoleRow.tsx / removeAgentAccess). Karina
// wants full control over the split here: assign one at a time, or select several and assign them
// all to the same advisor in one go, since a departing advisor's book might go to one person or
// be split across a few.
export default function UnassignedClientsSection({
  clients,
  agents,
}: {
  clients: UnassignedClient[];
  agents: ActiveAgent[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowTarget, setRowTarget] = useState<Record<string, string>>({});
  const [batchTarget, setBatchTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (clients.length === 0) return null;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assignOne(clientId: string) {
    const target = rowTarget[clientId];
    if (!target) {
      setError("Pick an advisor for this client first.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await reassignClients([clientId], target);
    if (!result.ok) setError(result.error);
    setBusy(false);
    router.refresh();
  }

  async function assignBatch() {
    if (!batchTarget) {
      setError("Pick an advisor for the batch first.");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one client below.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await reassignClients(Array.from(selected), batchTarget);
    if (!result.ok) {
      setError(result.error);
    } else {
      setSelected(new Set());
      setBatchTarget("");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-lg border border-[#D9A34A] bg-[#FBF3E3] p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#8b6a00]">
        Unassigned Clients ({clients.length})
      </h2>
      <p className="mb-3 text-xs text-[#666]">
        These clients belonged to an advisor whose access was removed. Assign each one individually,
        or select several and assign them together — a departing advisor&rsquo;s book can go to one
        person or be split across a few.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[#D9CFBA] bg-white p-2">
        <span className="text-xs text-[#666]">Assign {selected.size > 0 ? selected.size : "selected"} to:</span>
        <select
          value={batchTarget}
          onChange={(e) => setBatchTarget(e.target.value)}
          className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs"
        >
          <option value="">Choose advisor…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name || a.email}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={assignBatch}
          className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
        >
          Assign Selected
        </button>
      </div>

      {error && <p className="mb-2 text-xs font-semibold text-[#8B1A1A]">{error}</p>}

      <div className="flex flex-col divide-y divide-[#EDE8DF]">
        {clients.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-3.5 w-3.5" />
              <div>
                <div className="text-sm text-[#1C1C1C]">{c.full_name}</div>
                <div className="text-xs capitalize text-[#707070]">{c.stage}</div>
              </div>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={rowTarget[c.id] ?? ""}
                onChange={(e) => setRowTarget((r) => ({ ...r, [c.id]: e.target.value }))}
                className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs"
              >
                <option value="">Assign to…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || a.email}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => assignOne(c.id)}
                className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
              >
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
