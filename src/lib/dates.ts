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

// Added 10/6 for the Add/Edit Product form's "Term length (years)" field — Karina: "if it's a
// term life one and I put the issue date in, can we say just put in how many year term it is and
// it calculates the date on its own so that the agent doesn't have to do the year math." Builds
// the result the same local-Y/M/D-safe way parseDateOnly does (never `new Date(dateStr)` directly,
// per the UTC-off-by-one warning at the top of this file), then formats back to a storable
// "YYYY-MM-DD" using local getters — NOT toISOString(), which would reintroduce the same UTC shift
// this file exists to avoid. A Feb 29 issue date N years later normally lands in a non-leap year;
// JS's own Date rollover (Feb 29 -> Mar 1) handles that the same way a human would.
export function addYearsToDateOnly(dateStr: string, years: number): string {
  const base = parseDateOnly(dateStr);
  const result = new Date(base.getFullYear() + years, base.getMonth(), base.getDate());
  const yyyy = String(result.getFullYear()).padStart(4, "0");
  const mm = String(result.getMonth() + 1).padStart(2, "0");
  const dd = String(result.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
