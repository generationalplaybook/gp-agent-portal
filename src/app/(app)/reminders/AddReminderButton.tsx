"use client";

import { useEffect, useState } from "react";
import ClientPicker, { type PickedClient } from "../ClientPicker";
import { addReminder } from "./actions";

// "+ Add Reminder" on the global Reminders tab — same motivation and pattern as
// AddMeetingButton.tsx in the Meetings tab (see that file's comment). Only clients are pickable
// here, not recruits — Karina's request was specifically about clients ("start typing in the
// client's name"), and ReminderOwner already supports a recruitId form for the existing
// recruit-profile flow (RemindersCard.tsx on /team/[id]), which this doesn't touch.
export default function AddReminderButton() {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<PickedClient | null>(null);
  const [remindAt, setRemindAt] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setClient(null);
    setRemindAt("");
    setMessage("");
    setError("");
  }

  async function handleAdd() {
    if (!client) {
      setError("Pick a client.");
      return;
    }
    if (!remindAt) {
      setError("Pick a date and time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const iso = new Date(remindAt).toISOString();
      await addReminder({ clientId: client.id }, iso, message);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save reminder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
      >
        + Add Reminder
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/20"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            aria-hidden="true"
          />
          <div className="fixed left-1/2 top-1/2 z-30 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#D9CFBA] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#1C1C1C]">Add Reminder</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                aria-label="Close"
                className="text-[#707070] hover:text-[#1C1C1C]"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Client
                <ClientPicker picked={client} onPick={setClient} onClear={() => setClient(null)} />
              </label>
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
                className="self-start rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
              >
                {saving ? "Adding..." : "Add Reminder"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
