"use client";

import { useState } from "react";
import { parseCurrencyValue } from "@/lib/analyzer";

// Mirrors the original portal's behavior: only auto-formats values that are purely
// numeric (with optional $ and commas) on blur — free text like "$300/month" or
// "lump sum" is left untouched.
export default function CurrencyInput({
  id,
  placeholder,
  value,
  onChange,
  className,
}: {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [local, setLocal] = useState(value);

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => {
        const raw = local.trim();
        if (!raw) return;
        if (/^\$?[\d,]*\.?\d*$/.test(raw) && /\d/.test(raw)) {
          const n = parseCurrencyValue(raw);
          const formatted = "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setLocal(formatted);
          onChange(formatted);
        }
      }}
      className={className}
    />
  );
}
