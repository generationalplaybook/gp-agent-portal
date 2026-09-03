"use client";

import { useState } from "react";
import ReminderRow from "../../ReminderRow";
import { addReminder, type ReminderOwner } from "../../reminders/actions";

interface Reminder {
  id: string;
  remind_at: string;
  message: string | null;
  sent_at: string | null;
}

// Shared between a client's profile and (since Team/Recruits) a recruit's profile — `owner`
// says which one this card is attached to; everything else is identical either way.
export default function RemindersCard({ owner, reminders }: { owner: ReminderOwner; reminders: Reminder[] }) {
  const [remindAt, setRemindAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pending = [...reminders].filter((r) => !r.sent_at).sort((a, b) => a.remind_at.localeCompare(b.remind_at));
  const completed = [...reminders].filter((r) => r.sent_at).sort((a, b) => b.remind_at.localeCompare(a.remind_at));

  async function handleAdd() {
    if (!remindAt) {
      setError("Pick a date and time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const iso = new Date(remindAt).toISOString();
      await addReminder(owner, iso, message);
      setRemindAt("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Remind me at
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Note
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What to follow up about"
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={handleAdd}
          className="self-start rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Reminder"}
        </button>
      </div>

      {pending.length === 0 && completed.length === 0 && (
        <p className="text-xs text-[#999]">No reminders yet.</p>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {pending.map((r) => (
            <ReminderRow key={r.id} reminder={r} owner={owner} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <details className="text-xs text-[#999]">
          <summary className="cursor-pointer select-none">
            {completed.length} completed reminder{completed.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 flex flex-col divide-y divide-[#EDE8DF]">
            {completed.map((r) => (
              <ReminderRow key={r.id} reminder={r} owner={owner} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
