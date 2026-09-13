"use client";

import { useState } from "react";
import { requestEmailChange } from "./actions";

// Deliberately separate from ProfileInfoForm's main Save button (added 9/3, "i think they should
// have freedom to do it themselves" — Karina, after noticing Email was locked). Changing a login
// email isn't like the other fields here: it goes through Supabase Auth's own confirmation flow
// rather than writing straight to the database, so "Send confirmation" has different semantics
// than "Save" — nothing actually changes here until the agent clicks the link Supabase emails
// them (see profile/actions.ts requestEmailChange and schema.sql section 34, which keeps
// profiles.email in sync automatically once the change actually goes through).
export default function ChangeEmailField({ currentEmail }: { currentEmail: string | null }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSend() {
    if (!newEmail.trim()) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("email", newEmail);
    const result = await requestEmailChange(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(newEmail.trim().toLowerCase());
    setEditing(false);
    setNewEmail("");
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-[#666]">
      <div className="flex items-center justify-between">
        <span>Email</span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setSentTo(null);
              setError(null);
            }}
            className="text-[11px] font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]"
          >
            Change
          </button>
        )}
      </div>
      <input
        disabled
        value={currentEmail ?? ""}
        className="rounded-md border border-[#D9CFBA] bg-[#F5F0E8] px-3 py-1.5 text-sm text-[#707070]"
      />

      {editing && (
        <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-[#D9CFBA] p-2.5">
          <span className="text-[11px] text-[#707070]">
            We&rsquo;ll send a confirmation link to the new address before it takes effect — your login
            email won&rsquo;t change until you click it.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new-email@example.com"
              className="min-w-0 flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <button
              type="button"
              disabled={busy || !newEmail.trim()}
              onClick={handleSend}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send confirmation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setNewEmail("");
                setError(null);
              }}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-[11px] font-semibold text-[#B23B3B]">{error}</p>}
        </div>
      )}

      {sentTo && (
        <p className="mt-0.5 text-[11px] font-semibold text-[#1E6B3C]">
          Confirmation sent to {sentTo} — check that inbox and click the link to finish the change.
        </p>
      )}
    </label>
  );
}
