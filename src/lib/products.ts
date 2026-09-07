// Computes the at-a-glance conversion/expiration status for a client's existing product —
// e.g. a term policy that's convertible to a permanent product with no medical exam only
// within a set window, and requires one after that (but before the policy expires).
//
// 9/3: extended for the "final conversion deadline" + "no-exam window declined" fields Karina
// asked for — after the no-exam window closes, conversion is often still possible up to a later,
// absolute cutoff (her example: "5 years no exam and convert until age 75"), but now requires a
// medical exam. And separately, an advisor can record that the no-exam window was specifically
// missed/declined (no_exam_declined_at) rather than just letting the date quietly pass.
//
// 9/4: extended again for term_end_date — the is_convertible checkbox now covers both cases: a
// term policy that converts, and one that doesn't, and either way it has exactly one real "term
// expiration date." Also added getNextTermMilestone/getTermUrgency, which power the new "Term"
// outreach view on the Clients page — a proactive "shop new coverage before this ends" queue,
// separate from this file's reactive conversion-status badge.
//
// 9/4 (later same day): Karina flagged that the generic "Expiration date" field (present on
// every product) and the term-specific "Term end date" field were asking the same question
// twice for a term policy. Resolved by treating term_end_date as the one source of truth going
// forward for term products, but falling back to expiration_date wherever term_end_date hasn't
// been filled in yet — so any term policy that already had an expiration date on file before
// this feature existed lights up immediately, with nothing to re-enter.

import { parseDateOnly } from "./dates";

export interface ProductStatus {
  label: string;
  tone: "good" | "warn" | "bad";
}

// All of expirationDate/conversionDeadline/finalConversionDeadline/termEndDate/etc. below are
// plain `date` columns — parsed via parseDateOnly (see lib/dates.ts) rather than `new Date(...)`
// directly, since this file is imported from both server and client components and the latter
// would otherwise display/compute one day early for any advisor west of UTC.
function fmtDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateOnly(dateStr);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getProductStatus(
  expirationDate: string | null,
  conversionDeadline: string | null,
  finalConversionDeadline?: string | null,
  noExamDeclinedAt?: string | null,
  termEndDate?: string | null
): ProductStatus | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expirationDate) {
    const exp = parseDateOnly(expirationDate);
    if (today > exp) return { label: "Expired", tone: "bad" };
  }

  // No-exam window was specifically declined/missed (advisor-recorded), rather than just having
  // quietly passed — still show whether an exam-required conversion is still possible.
  if (noExamDeclinedAt) {
    if (finalConversionDeadline) {
      const final = parseDateOnly(finalConversionDeadline);
      if (today <= final) {
        return { label: `No-exam window declined — exam required to convert until ${fmtDate(finalConversionDeadline)}`, tone: "warn" };
      }
      return { label: "Conversion window closed", tone: "bad" };
    }
    return { label: "No-exam conversion declined", tone: "warn" };
  }

  if (conversionDeadline) {
    const deadline = parseDateOnly(conversionDeadline);
    if (today <= deadline) {
      return { label: `Convertible, no exam until ${fmtDate(conversionDeadline)}`, tone: "good" };
    }
    // No-exam window has passed (but wasn't explicitly declared declined) — exam-required
    // conversion may still be open up to the final deadline, if one was recorded.
    if (finalConversionDeadline) {
      const final = parseDateOnly(finalConversionDeadline);
      if (today <= final) {
        return { label: `Convertible — exam now required (until ${fmtDate(finalConversionDeadline)})`, tone: "warn" };
      }
      return { label: "Conversion window closed", tone: "bad" };
    }
    return { label: "Convertible — exam now required", tone: "warn" };
  }

  if (finalConversionDeadline) {
    const final = parseDateOnly(finalConversionDeadline);
    if (today <= final) {
      return { label: `Convertible — exam required (until ${fmtDate(finalConversionDeadline)})`, tone: "warn" };
    }
    return { label: "Conversion window closed", tone: "bad" };
  }

  // Straight, non-convertible term — the only date on file is when the term itself ends.
  if (termEndDate) {
    const days = daysUntil(termEndDate);
    if (days < 0) return { label: "Term ended", tone: "bad" };
    if (days <= 30) return { label: `Term ends ${fmtDate(termEndDate)}`, tone: "bad" };
    if (days <= 60) return { label: `Term ends ${fmtDate(termEndDate)}`, tone: "warn" };
    return { label: `Term ends ${fmtDate(termEndDate)}`, tone: "good" };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Outreach — powers the "Outreach" view on the Clients page and the "Time-Sensitive" banner on
// the home page (Karina, 9/4: "it needs to just go to the term tab in order of what's expiring
// first so the adviser can go in and start looking at them"). Originally term-only, gated behind
// the is_convertible ("this is a term policy") checkbox — broadened 9/7 per Karina: "this also
// shouldn't be just term policies. It should be for anything that has an end date that an adviser
// would need to touch base with the client for." So this no longer depends on is_convertible at
// all — any product with a relevant date on file (term or annuity) is a candidate; a product with
// none of these fields set (permanent life, a quote with nothing filled in yet, etc.) simply
// yields no milestone and drops out of the queue on its own.
// ─────────────────────────────────────────────────────────────

export interface TermMilestone {
  date: string;
  label: string;
}

export interface OutreachMilestoneSource {
  conversion_deadline: string | null;
  final_conversion_deadline: string | null;
  term_end_date: string | null;
  // Fallback for term_end_date — see the 9/4 note above the ProductStatus section. Only used
  // when term_end_date itself is empty.
  expiration_date?: string | null;
  // Annuity-specific dates (annuity_contract_end_date added 9/7 alongside this broadening) —
  // never populated on the same row as the term fields above, since a product is either an
  // annuity or it isn't.
  annuity_surrender_end_date?: string | null;
  annuity_contract_end_date?: string | null;
}

// Prefer the earliest of the tracked dates that's still upcoming (today or later). If everything
// tracked has already passed, fall back to the most recently passed one — an overdue milestone is
// exactly why the advisor still needs to see it, not a reason for it to quietly disappear.
export function getNextOutreachMilestone(product: OutreachMilestoneSource): TermMilestone | null {
  const candidates: TermMilestone[] = [];
  if (product.conversion_deadline) candidates.push({ date: product.conversion_deadline, label: "No-exam conversion window" });
  if (product.final_conversion_deadline) candidates.push({ date: product.final_conversion_deadline, label: "Final conversion deadline" });
  const termExpiration = product.term_end_date ?? product.expiration_date ?? null;
  if (termExpiration) candidates.push({ date: termExpiration, label: "Term expiration date" });
  if (product.annuity_surrender_end_date) candidates.push({ date: product.annuity_surrender_end_date, label: "Surrender charge period ends" });
  if (product.annuity_contract_end_date) candidates.push({ date: product.annuity_contract_end_date, label: "Annuity contract end date" });
  if (candidates.length === 0) return null;

  const upcoming = candidates.filter((c) => daysUntil(c.date) >= 0).sort((a, b) => parseDateOnly(a.date).getTime() - parseDateOnly(b.date).getTime());
  if (upcoming.length > 0) return upcoming[0];

  return candidates.sort((a, b) => parseDateOnly(b.date).getTime() - parseDateOnly(a.date).getTime())[0];
}

export type TermUrgency = "overdue" | "critical" | "soon" | "later";

// overdue: already past. critical: 30 days or less. soon: 60 days or less. later: everything
// else. Karina, 9/4: "the ones that are sixty and then thirty days out should have a red tab or
// something so it's like, this is high level, check this."
export function getTermUrgency(dateIso: string): TermUrgency {
  const days = daysUntil(dateIso);
  if (days < 0) return "overdue";
  if (days <= 30) return "critical";
  if (days <= 60) return "soon";
  return "later";
}

export function termUrgencyLabel(dateIso: string, urgency: TermUrgency): string {
  const days = daysUntil(dateIso);
  if (urgency === "overdue") return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  return `${days}d`;
}
