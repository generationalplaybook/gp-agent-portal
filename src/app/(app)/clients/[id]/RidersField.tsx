"use client";

import { useState } from "react";
import { COMMON_RIDER_OPTIONS } from "@/lib/types";

// Riders attached to a policy — a handful of common ones (accelerated death benefit for
// terminal/critical/chronic illness, etc.) are one-click checkboxes; anything else (carrier
// perks, a less common endorsement) gets typed in free-form below and shows up as a removable
// chip, same as a checked common one.
//
// 9/4: takes an optional `commonOptions` override so an Annuity product can show the annuity-
// specific rider list (ANNUITY_RIDER_OPTIONS) instead of the life-insurance one — riders are
// different enough between the two that reusing the same checklist for both didn't make sense.
export default function RidersField({
  value,
  onChange,
  commonOptions = COMMON_RIDER_OPTIONS,
}: {
  value: string[];
  onChange: (riders: string[]) => void;
  commonOptions?: string[];
}) {
  const [customInput, setCustomInput] = useState("");

  function toggleCommon(rider: string) {
    if (value.includes(rider)) {
      onChange(value.filter((r) => r !== rider));
    } else {
      onChange([...value, rider]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed || value.includes(trimmed)) {
      setCustomInput("");
      return;
    }
    onChange([...value, trimmed]);
    setCustomInput("");
  }

  const customRiders = value.filter((r) => !commonOptions.includes(r));

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-2.5">
      <p className="text-xs font-semibold text-[#666]">Riders</p>
      <div className="flex flex-col gap-1">
        {commonOptions.map((rider) => (
          <label key={rider} className="flex items-center gap-2 text-xs text-[#2E2E2E]">
            <input type="checkbox" checked={value.includes(rider)} onChange={() => toggleCommon(rider)} />
            {rider}
          </label>
        ))}
      </div>

      {customRiders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customRiders.map((rider) => (
            <span
              key={rider}
              className="flex items-center gap-1.5 rounded-full bg-[#F0EDE8] px-2.5 py-1 text-[11px] text-[#555]"
            >
              {rider}
              <button
                type="button"
                onClick={() => onChange(value.filter((r) => r !== rider))}
                className="text-[#707070] hover:text-[#8B1A1A]"
                aria-label={`Remove ${rider}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other rider (e.g. Ethos Perks)"
          className="flex-1 rounded-md border border-[#D9CFBA] px-2.5 py-1 text-xs outline-none focus:border-[#1C1C1C]"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-md border border-[#D9CFBA] px-2.5 py-1 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          Add
        </button>
      </div>
    </div>
  );
}
