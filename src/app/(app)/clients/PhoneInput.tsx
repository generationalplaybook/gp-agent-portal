"use client";

import { useState } from "react";

function formatPhoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  return parts.join("-");
}

export default function PhoneInput({
  name,
  defaultValue,
  className,
  onValueChange,
}: {
  name?: string;
  defaultValue?: string | null;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(formatPhoneDigits(defaultValue ?? ""));

  return (
    <input
      type="tel"
      name={name}
      placeholder="000-000-0000"
      value={value}
      onChange={(e) => {
        const formatted = formatPhoneDigits(e.target.value);
        setValue(formatted);
        onValueChange?.(formatted);
      }}
      className={className}
    />
  );
}
