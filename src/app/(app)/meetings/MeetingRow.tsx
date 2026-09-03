"use client";

import Link from "next/link";
import { useState } from "react";
import LocalDateTime from "../LocalDateTime";
import { deleteMeeting } from "../clients/actions";
import { buildIcsContent, downloadIcsFile } from "@/lib/ics";

interface Meeting {
  id: string;
  meeting_at: string;
  location: string | null;
  notes: string | null;
  source?: "manual" | "cal.com";
}

function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

// A synced Cal.com meeting's location is a video-call URL (see the webhook receiver) — pasted
// manual locations can be a URL too (a Zoom/Meet link) or just a plain address. Either way, if
// it looks like a URL, make it clickable instead of showing dead plain text (flagged 9/1,
// built 9/3 — "if someone wants to copy and paste they cant cause its cut off right?" from a
// different table applies here too: raw unclickable links are no more useful than truncated
// unselectable ones).
function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
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

export default function MeetingRow({
  meeting,
  clientId,
  clientName,
}: {
  meeting: Meeting;
  clientId: string;
  clientName: string;
}) {
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
        <div className="text-sm font-semibold text-[#1C1C1C]">
          <LocalDateTime iso={meeting.meeting_at} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <Link href={`/clients/${clientId}`} className="text-sm text-[#2E2E2E] underline hover:text-[#1C1C1C]">
            {clientName}
          </Link>
          {meeting.source === "cal.com" && (
            <span className="rounded-full bg-[#EEF3FA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1B4F8A]">
              Via Cal.com
            </span>
          )}
        </div>
        {meeting.location && (
          isUrl(meeting.location) ? (
            <a
              href={meeting.location}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]"
            >
              {meeting.location}
            </a>
          ) : (
            <div className="mt-1 text-xs text-[#707070]">{meeting.location}</div>
          )
        )}
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
