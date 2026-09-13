"use client";

// Server Components render on Vercel's servers (UTC), not in the advisor's
// browser — so any date/time formatted directly inside a Server Component
// shows up in the SERVER's timezone, not the advisor's. This tiny client
// component defers formatting to the browser, where `toLocaleString()`
// correctly uses the viewer's real local timezone.
//
// Default includes the weekday (Karina, 9/8: "we should show the day, like, if it's Tuesday...
// if I'm looking at this at a glance, I might say, oh, no, I'm good to go on that day when
// you're really not" — because dateStyle/timeStyle can't be combined with an explicit weekday
// field, this spells every field out instead of using the old { dateStyle, timeStyle } shorthand.
export default function LocalDateTime({
  iso,
  options = { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" },
}: {
  iso: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  return <>{new Date(iso).toLocaleString(undefined, options)}</>;
}
