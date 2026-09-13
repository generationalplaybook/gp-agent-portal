"use client";

import { hoursApart, describeHoursApart } from "@/lib/timezone";

// Shown right under the client's name so it's the first thing you see before calling, emailing,
// or booking something with them — e.g. "Dallas, TX — 1 hour behind you." The comparison is
// computed against whatever timezone THIS device currently reports, so it stays correct while
// the advisor is traveling with no setting to update (see src/lib/timezone.ts).
export default function ClientLocationLine({
  city,
  state,
  timezone,
}: {
  city: string | null;
  state: string | null;
  timezone: string | null;
}) {
  const location = [city, state].filter(Boolean).join(", ");

  let diffLabel: string | null = null;
  if (timezone) {
    try {
      const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      diffLabel = describeHoursApart(hoursApart(timezone, viewerTimeZone));
    } catch {
      diffLabel = null;
    }
  }

  if (!location && !diffLabel) return null;

  return (
    <p className="-mt-1 mb-4 text-xs text-[#707070]">
      {location}
      {location && diffLabel && " — "}
      {diffLabel}
    </p>
  );
}
