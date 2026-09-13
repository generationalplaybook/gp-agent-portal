"use client";

import { useEffect, useState } from "react";
import ClientPicker, { type PickedClient } from "../ClientPicker";
import { addMeeting } from "../clients/actions";

// "+ Add Meeting" on the global Meetings tab — added 9/7 per Karina: "for meetings and reminders
// when you're on that tab, you should be able to put in... add meeting... where somebody can
// create a meeting... right from that tab, and then they can start typing in the client's name and
// it auto populates." Before this, a meeting could only be logged from inside a specific client's
// profile (MeetingsCard.tsx) — same underlying addMeeting action, just reached through a client
// picker (ClientPicker.tsx) instead of already having clientId in scope from the page you're on.
export default function AddMeetingButton() {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<PickedClient | null>(null);
  const [meetingAt, setMeetingAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
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
    setMeetingAt("");
    setLocation("");
    setNotes("");
    setError("");
  }

  async function handleAdd() {
    if (!client) {
      setError("Pick a client.");
      return;
    }
    if (!meetingAt) {
      setError("Pick a date and time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const iso = new Date(meetingAt).toISOString();
      await addMeeting(client.id, iso, location, notes);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save meeting.");
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
        + Add Meeting
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
              <h2 className="font-serif text-lg text-[#1C1C1C]">Add Meeting</h2>
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
                Meeting date &amp; time
                <input
                  type="datetime-local"
                  value={meetingAt}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Location
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Client's office, 123 Main St"
                  className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Notes
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What's this meeting about"
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
                {saving ? "Adding..." : "Add Meeting"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
