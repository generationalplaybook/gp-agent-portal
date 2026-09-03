"use client";

import { useState } from "react";
import LocalDateTime from "../../LocalDateTime";
import { addMeeting, deleteMeeting } from "../actions";
import { buildIcsContent, downloadIcsFile } from "@/lib/ics";

interface Meeting {
  id: string;
  meeting_at: string;
  location: string | null;
  notes: string | null;
  // 'cal.com' means this row was created automatically by the Cal.com Auto-Sync webhook (see
  // /api/webhooks/cal/[agentId]) rather than typed in here — deleting it removes it from this
  // view only, it does NOT cancel the real booking over on Cal.com.
  source?: "manual" | "cal.com";
}

function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

function downloadInvite(meeting: Meeting, clientName: string) {
  const content = buildIcsContent({
    uid: `meeting-${meeting.id}@generationalplaybook.com`,
    title: `Meeting with ${clientName}`,
    start: new Date(meeting.meeting_at),
    location: meeting.location ?? undefined,
    description: meeting.notes ?? undefined,
  });
  downloadIcsFile(`Meeting_${clientName.replace(/\s+/g, "_")}.ics`, content);
}

function MeetingRow({ meeting, clientId, clientName }: { meeting: Meeting; clientId: string; clientName: string }) {
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState("");
  const past = isPast(meeting.meeting_at);

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteMeeting(meeting.id, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete meeting.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className={`flex items-center justify-between gap-4 border-l-2 py-3 pl-3 ${past ? "border-[#D9CFBA]" : "border-[#1E6B3C]"}`}>
      <div className={past ? "opacity-60" : ""}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#2E2E2E]">{meeting.location || "In-person meeting"}</span>
          {meeting.source === "cal.com" && (
            <span className="rounded-full bg-[#EEF3FA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1B4F8A]">
              Via Cal.com
            </span>
          )}
        </div>
        <div className="text-xs text-[#707070]">
          <LocalDateTime iso={meeting.meeting_at} />
        </div>
        {meeting.notes && <div className="mt-1 text-xs text-[#666]">{meeting.notes}</div>}
        {error && <p className="mt-1 text-xs text-[#8B1A1A]">{error}</p>}
      </div>
      {!confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => downloadInvite(meeting, clientName)}
            className="text-xs font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
          >
            Add to Calendar
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
          >
            Delete
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[#8B1A1A]">
            {meeting.source === "cal.com" ? "Remove from here (won't cancel on Cal.com)?" : "Delete?"}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
          >
            {busy ? "Deleting..." : "Yes"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function MeetingsCard({
  clientId,
  clientName,
  meetings,
}: {
  clientId: string;
  clientName: string;
  meetings: Meeting[];
}) {
  const [meetingAt, setMeetingAt] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastAdded, setLastAdded] = useState<Meeting | null>(null);

  const upcoming = [...meetings].filter((m) => !isPast(m.meeting_at)).sort((a, b) => a.meeting_at.localeCompare(b.meeting_at));
  const past = [...meetings].filter((m) => isPast(m.meeting_at)).sort((a, b) => b.meeting_at.localeCompare(a.meeting_at));

  async function handleAdd() {
    if (!meetingAt) {
      setError("Pick a date and time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const iso = new Date(meetingAt).toISOString();
      await addMeeting(clientId, iso, location, notes);
      // Real row (with its DB id) shows up in the list below once the page revalidates — this
      // is just a same-tick "here's your invite" convenience, so a fresh random id is fine for
      // the .ics UID rather than waiting on a round trip.
      setLastAdded({
        id: crypto.randomUUID(),
        meeting_at: iso,
        location: location.trim() || null,
        notes: notes.trim() || null,
      });
      setMeetingAt("");
      setLocation("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save meeting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
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
          className="self-start rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
        >
          {saving ? "Adding..." : "Add Meeting"}
        </button>
        {lastAdded && (
          <div className="mt-1 flex items-center gap-2 rounded-md bg-[#F5F0E8] px-3 py-2 text-xs text-[#2E2E2E]">
            Meeting added.
            <button
              type="button"
              onClick={() => {
                downloadInvite(lastAdded, clientName);
                setLastAdded(null);
              }}
              className="font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
            >
              Download calendar invite
            </button>
            <span className="text-[#707070]">— add it to your calendar, or forward the file to {clientName.split(" ")[0]}.</span>
          </div>
        )}
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <p className="text-xs text-[#707070]">No meetings logged yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {upcoming.map((m) => (
            <MeetingRow key={m.id} meeting={m} clientId={clientId} clientName={clientName} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details className="text-xs text-[#707070]">
          <summary className="cursor-pointer select-none">
            {past.length} past meeting{past.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 flex flex-col divide-y divide-[#EDE8DF]">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} clientId={clientId} clientName={clientName} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
