"use client";

import { useEffect, useState } from "react";
import ClientPicker, { type PickedClient } from "../ClientPicker";
import ScheduleCallCard from "../clients/[id]/ScheduleCallCard";

// "+ Schedule a Call" on the global Meetings tab (Karina, 9/8, in response to "should this have an
// option to schedule a call too?" on the Add Meeting popup — she meant sending her actual
// scheduling link, not just logging a phone call). This is a different flow from "+ Add Meeting"
// right next to it: Add Meeting logs a time you already agreed on with the client; this one gets
// you the same Open Scheduling Page / Copy Link / Book Here actions already on a client's own
// profile (ScheduleCallCard.tsx), just reachable without opening that profile first — same
// motivation, same ClientPicker, as AddMeetingButton.tsx. Reuses ScheduleCallCard as-is once a
// client is picked, rather than re-implementing the Cal.com link logic a second time.
export default function ScheduleCallButton({ schedulingLink }: { schedulingLink: string | null }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState<PickedClient | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setClient(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[#D9CFBA] px-4 py-2 text-sm font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
      >
        + Schedule a Call
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20 bg-black/20" onClick={close} aria-hidden="true" />
          <div className="fixed left-1/2 top-1/2 z-30 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#D9CFBA] bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#1C1C1C]">Schedule a Call</h2>
              <button type="button" onClick={close} aria-label="Close" className="text-[#707070] hover:text-[#1C1C1C]">
                ✕
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Client
              <ClientPicker picked={client} onPick={setClient} onClear={() => setClient(null)} />
            </label>

            {client && (
              <div className="mt-4">
                <ScheduleCallCard schedulingLink={schedulingLink} clientName={client.full_name} clientEmail={client.email} />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
