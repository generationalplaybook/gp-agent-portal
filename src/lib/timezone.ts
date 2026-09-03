// Works out how far apart two timezones are right now, in whole hours — used to show "N hours
// ahead/behind you" on a client's profile before calling, emailing, or booking something.
//
// Computed live off the current instant (not a fixed offset table) so it's automatically correct
// through daylight saving changes on either side, exactly like every other date/time on this
// portal (see LocalDateTime.tsx) — and since the *viewer's* side of the comparison always comes
// from Intl.DateTimeFormat().resolvedOptions().timeZone (the browser's own current timezone),
// this stays correct even when the advisor is traveling, with nothing to set.

export function getUtcOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

// Positive = `timeZone` is ahead of `relativeToTimeZone`; negative = behind. Rounded to the
// nearest whole hour — every zone offered in US_TIMEZONE_OPTIONS differs from every other by a
// whole number of hours, so this never hides a real half-hour difference for the zones this app
// actually offers.
export function hoursApart(timeZone: string, relativeToTimeZone: string, at: Date = new Date()): number {
  return Math.round((getUtcOffsetMinutes(at, timeZone) - getUtcOffsetMinutes(at, relativeToTimeZone)) / 60);
}

export function describeHoursApart(diff: number): string {
  if (diff === 0) return "same time as you";
  const n = Math.abs(diff);
  const unit = n === 1 ? "hour" : "hours";
  return diff > 0 ? `${n} ${unit} ahead of you` : `${n} ${unit} behind you`;
}
