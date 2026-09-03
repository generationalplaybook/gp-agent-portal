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
  const [local, setLocal] = useState(value);
  // Tracks the last `value` prop this component actually rendered with — the React-recommended
  // way to resync local state from an external change without a setState-in-effect cascade (see
  // "Adjusting state when a prop changes" in the React docs). Covers `value` changing from
  // outside without going through this input's own onChange — e.g. loading a saved scenario's
  // data after this component has already mounted.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#707070]">$</span>
      <input
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => {
          const raw = local.trim();
          if (!raw) return;
          const formatted = formatMoney(raw);
          if (formatted && formatted !== raw) {
            setLocal(formatted);
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
