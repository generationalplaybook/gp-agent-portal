"use client";

import { useRef, useState } from "react";
import { updateRecruitNotes } from "../actions";

// Freeform "at a glance" field — same idea as notes_summary on a Client, not a timestamped log.
export default function RecruitNotesField({ recruitId, notes }: { recruitId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    setStatus("saving");
    await updateRecruitNotes(recruitId, value);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={4}
        placeholder="Where things stand, what was last discussed, next steps..."
        className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
      />
      <p className="mt-1 h-3 text-[11px] font-semibold text-[#1E6B3C]">
        {status === "saving" && "Saving..."}
        {status === "saved" && "Saved ✓"}
      </p>
    </div>
  );
}
