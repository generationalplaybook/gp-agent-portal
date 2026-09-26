"use client";

import { useState } from "react";

// A plain number-ish input with a static "%" shown inside the box, after the number — mirrors
// DollarInput's automatic "$" (same directory), just on the trailing side since a percent reads
// number-then-symbol ("9.75%") rather than symbol-then-number. Added 9/26 per Karina, after typing
// a bare "9.75" into the Annuity Cap Rate field and noticing the PDF's disclosure sentence print
// "...assume a 9.75 current cap rate" with no percent sign: "percent sign should be automatic
// after numbers are entered just like all dollar signs are automatic."
//
// Same split as DollarInput between what's shown and what's stored: the "%" here is a visual
// overlay only, never part of the value this component reports back — same as DollarInput's "$"
// never ending up in its value. Any "%" already in the incoming value (a record saved back when
// Cap Rate was plain free text, before this component existed) is stripped on load and on every
// change, so the field never shows a doubled "99.75%%" and the stored value self-heals to
// "%"-free the next time it's touched. Whatever displays this value outside the input (the PDF's
// cap-rate disclosure sentence) adds the "%" back — see formatPercent() in lib/illustration.ts.
function stripPercent(v: string): string {
  return v.replace(/%+\s*$/, "");
}

export default function PercentInput({
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
  const [local, setLocal] = useState(() => stripPercent(value));
  // Same resync pattern as DollarInput — see its comment for why this is needed to tell a genuine
  // external change (Cancel restoring a saved value) apart from this input's own round-tripped
  // onChange, without fighting the cursor on every keystroke.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(stripPercent(value));
  }

  return (
    <div className="relative">
      <input
        value={local}
        onChange={(e) => {
          const v = stripPercent(e.target.value);
          setLocal(v);
          setPrevValue(v);
          onChange(v);
        }}
        placeholder={placeholder}
        inputMode="decimal"
        style={{ paddingRight: "1.5rem" }}
        className={className}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-[#707070]">%</span>
    </div>
  );
}
