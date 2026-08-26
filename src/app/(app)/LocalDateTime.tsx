"use client";

// Server Components render on Vercel's servers (UTC), not in the advisor's
// browser — so any date/time formatted directly inside a Server Component
// shows up in the SERVER's timezone, not the advisor's. This tiny client
// component defers formatting to the browser, where `toLocaleString()`
// correctly uses the viewer's real local timezone.
export default function LocalDateTime({
  iso,
  options = { dateStyle: "medium", timeStyle: "short" },
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  return <>{new Date(iso).toLocaleString(undefined, options)}</>;
}
