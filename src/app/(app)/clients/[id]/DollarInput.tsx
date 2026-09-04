"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/illustration";

// A plain number-ish input with a static "$" shown inside the box — for face amount, premium,
// and minimum-to-avoid-lapse fields, everywhere this app has one (Illustrations, Scenarios,
// Products — DollarInput is the one shared component behind all of them).
//
// Doesn't force comma formatting while actively typing — reformatting mid-keystroke fights the
// cursor and is a well-known way to introduce new bugs (cursor jumping, digits landing in the
// wrong place). Instead, same pattern as the Client Analyzer's CurrencyInput: type freely, and
// on blur (tabbing or clicking away) a plain number like "55000" snaps to "55,000". Flagged 9/2:
// Karina noticed "55000" and "50,000" sitting side by side on the same Final Expense
// budget-options card and wanted commas to "autofill... across all areas of portal" — since this
// component IS "all areas of portal," fixing it here is exactly that. Reuses formatMoney() from
// illustration.ts, the same helper the PDF generator formats every dollar figure through, so what
// an advisor sees on screen now always matches what ends up on the PDF (e.g. "91.50" stays
// "91.50" — cents are kept only if actually entered, never forced).
//
// Flagged again 9/4: opening Edit on a product showed the saved face amount as "227009", no
// commas, until you clicked into the field and blurred it — the very first render wasn't going
// through the format-on-blur path at all, only value CHANGES after mount were. "I need commas
// all of the time everywhere." Fixed so the value this component starts with (and any later
// GENUINE external reset — e.g. Cancel restoring the saved value) is formatted the same way blur
// already does. The tricky part: this component's own onChange also changes the `value` prop
// right back (parent state round-trips it), and that round-trip must NOT get reformatted or
// every keystroke would fight the cursor again. Fixed by having the input's own handlers mark
// `prevValue` as already-synced the moment they emit a new value, so when that exact value comes
// back down as a prop, the resync check below sees nothing has changed and leaves it alone —
// only a value that arrives WITHOUT having been pre-synced this way (a true external change)
// gets reformatted.
function formatForDisplay(v: string): string {
  const raw = v.trim();
  if (!raw) return v;
  const formatted = formatMoney(raw);
  return formatted || v;
}

export default function DollarInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(() => formatForDisplay(value));
  // Tracks the last `value` prop this component has already synced to — the React-recommended
  // way to resync local state from an external change without a setState-in-effect cascade (see
  // "Adjusting state when a prop changes" in the React docs). The input's own onChange/onBlur
  // update this right alongside `local`, so their own round-tripped value never looks "external."
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(formatForDisplay(value));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#707070]">$</span>
      <input
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          setPrevValue(v);
          onChange(v);
        }}
        onBlur={() => {
          const raw = local.trim();
          if (!raw) return;
          const formatted = formatMoney(raw);
          if (formatted && formatted !== raw) {
            setLocal(formatted);
            setPrevValue(formatted);
            onChange(formatted);
          }
        }}
        placeholder={placeholder}
        inputMode="decimal"
        style={{ paddingLeft: "1.35rem" }}
        className={className}
      />
    </div>
  );
}
