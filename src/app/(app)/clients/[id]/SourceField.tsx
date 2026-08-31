"use client";

import { useRef, useState } from "react";
import { updateLeadSource } from "../actions";

// Lightweight, optional — where this client came from (Referral, Facebook ad, walk-in, etc).
// Lives in the sidebar rather than the main Contact Info card since it's lead-tracking metadata,
// not a contact detail, and nothing an advisor needs to fill in right away.
export default function SourceField({ clientId, source }: { clientId: string; source: string | null }) {
  const [value, setValue] = useState(source ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function save() {
    setStatus("saving");
    await updateLeadSource(clientId, value);
    setStatus("saved");
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="mt-4 border-t border-[#EDE8DF] pt-3">
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Source <span className="font-normal text-[#999]">(optional)</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          placeholder="Referral, Facebook ad, walk-in..."
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <p className="mt-1 h-3 text-[11px] font-semibold text-[#1E6B3C]">
        {status === "saving" && "Saving..."}
        {status === "saved" && "Saved ✓"}
      </p>
    </div>
  );
}
