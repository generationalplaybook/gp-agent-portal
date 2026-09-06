"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAgentRole, removeAgentAccess, restoreAgentAccess } from "./actions";

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  disabled_at: string | null;
}

export default function AgentRoleRow({ agent, currentUserId }: { agent: Agent; currentUserId: string }) {
  const router = useRouter();
  const [role, setRole] = useState(agent.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const isSelf = agent.id === currentUserId;
  const isDisabled = !!agent.disabled_at;

  async function handleChange(newRole: "agent" | "admin") {
    const previous = role;
    setRole(newRole);
    setSaving(true);
    setError("");
    const result = await updateAgentRole(agent.id, newRole);
    if (!result.ok) {
      setRole(previous);
      setError(result.error);
    }
    setSaving(false);
  }

  async function handleRemove() {
    setSaving(true);
    setError("");
    const result = await removeAgentAccess(agent.id);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setConfirmingRemove(false);
    setSaving(false);
    router.refresh();
  }

  async function handleRestore() {
    setSaving(true);
    setError("");
    const result = await restoreAgentAccess(agent.id);
    if (!result.ok) setError(result.error);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#1C1C1C]">
            {agent.full_name || "Unnamed"} {isSelf && <span className="text-xs text-[#707070]">(you)</span>}
            {isDisabled && (
              <span className="ml-2 rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B1A1A]">
                Removed{" "}
                {new Date(agent.disabled_at as string).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="text-xs text-[#707070]">{agent.email}</div>
          {error && <div className="mt-1 text-xs font-semibold text-[#8B1A1A]">{error}</div>}
        </div>
        <div className="flex items-center gap-2">
          {!isDisabled && (
            <select
              value={role}
              disabled={isSelf || saving}
              onChange={(e) => handleChange(e.target.value as "agent" | "admin")}
              className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs disabled:opacity-60"
            >
              <option value="agent">Advisor</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {isDisabled ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleRestore}
              className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
            >
              {saving ? "Restoring…" : "Restore access"}
            </button>
          ) : (
            !isSelf &&
            !confirmingRemove && (
              <button
                type="button"
                onClick={() => setConfirmingRemove(true)}
                className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove access
              </button>
            )
          )}
        </div>
      </div>

      {confirmingRemove && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#D9A34A] bg-[#FBF3E3] p-2 text-xs text-[#8b6a00]">
          <span>
            Remove {agent.full_name || "this advisor"}&rsquo;s access? They&rsquo;ll be blocked from logging in and
            their clients move to Unassigned Clients below for you to reassign — nothing is deleted.
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={handleRemove}
            className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-[#FAF8F4] hover:bg-[#6b1414] disabled:opacity-60"
          >
            {saving ? "Removing…" : "Yes, Remove Access"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemove(false)}
            className="text-xs text-[#707070] underline hover:text-[#1C1C1C]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
