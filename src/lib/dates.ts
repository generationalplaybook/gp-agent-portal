// Shared helpers for plain Postgres `date` columns (e.g. issue_date, term_end_date,
// annuity_surrender_end_date — anything that comes back from Supabase as a bare "YYYY-MM-DD"
// string with no time/zone component).
//
// The bug this exists to prevent: `new Date("2026-10-01")` parses that string as UTC midnight.
// Formatting or doing day-math against that result in a "use client" component — which runs in
// the advisor's own browser, in whatever US timezone they're in, always behind UTC — displays or
// computes the PREVIOUS calendar day. A policy entered with a term end date of 10/1/2026 was
// showing up as "Term ends September 30, 2026." Parsing the Y/M/D parts and constructing the Date
// from local-time components instead (same fix ClientPicker.tsx's formatBirthDate already used
// for birth dates) sidesteps the UTC conversion entirely.
//
// Only use these for `date`-only columns. A `timestamptz` column (converted_at,
// conversion_pending_at, term_contacted_at, remind_at, meeting_at, and similar) is a real instant,
// not a calendar date — keep using `new Date(iso)` / `.toLocaleDateString(...)` directly for those,
// since parsing them as UTC and displaying in the viewer's local time is the correct behavior.
export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function formatDateOnly(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, options);
}
