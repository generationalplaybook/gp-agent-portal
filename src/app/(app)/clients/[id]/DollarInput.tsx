"use client";

// A plain number-ish input with a static "$" shown inside the box — for face amount, premium,
// and minimum-to-avoid-lapse fields. No auto-formatting (no forced commas/decimals), just a
// visual $ so it's clear these are dollar figures.
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
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#999]">$</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        style={{ paddingLeft: "1.35rem" }}
        className={className}
      />
    </div>
  );
}
