"use client";

import { useState } from "react";
import { updateAgentRole } from "./actions";

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
}

export default function AgentRoleRow({ agent, currentUserId }: { agent: Agent; currentUserId: string }) {
  const [role, setRole] = useState(agent.role);
  const [saving, setSaving] = useState(false);
  const isSelf = agent.id === currentUserId;

  async function handleChange(newRole: "agent" | "admin") {
    setRole(newRole);
    setSaving(true);
    try {
      await updateAgentRole(agent.id, newRole);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <div className="text-sm font-semibold text-[#1C1C1C]">
          {agent.full_name || "Unnamed"} {isSelf && <span className="text-xs text-[#999]">(you)</span>}
        </div>
        <div className="text-xs text-[#888]">{agent.email}</div>
      </div>
      <select
        value={role}
        disabled={isSelf || saving}
        onChange={(e) => handleChange(e.target.value as "agent" | "admin")}
        className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs disabled:opacity-60"
      >
        <option value="agent">Advisor</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  );
}
