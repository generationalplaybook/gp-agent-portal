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

export interface ProductStatus {
  label: string;
  tone: "good" | "warn" | "bad";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso);
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
    const exp = new Date(expirationDate);
    if (today > exp) return { label: "Expired", tone: "bad" };
  }

  // No-exam window was specifically declined/missed (advisor-recorded), rather than just having
  // quietly passed — still show whether an exam-required conversion is still possible.
  if (noExamDeclinedAt) {
    if (finalConversionDeadline) {
      const final = new Date(finalConversionDeadline);
      if (today <= final) {
        return { label: `No-exam window declined — exam required to convert until ${fmtDate(finalConversionDeadline)}`, tone: "warn" };
      }
      return { label: "Conversion window closed", tone: "bad" };
    }
    return { label: "No-exam conversion declined", tone: "warn" };
  }

  if (conversionDeadline) {
    const deadline = new Date(conversionDeadline);
    if (today <= deadline) {
      return { label: `Convertible, no exam until ${fmtDate(conversionDeadline)}`, tone: "good" };
    }
    // No-exam window has passed (but wasn't explicitly declared declined) — exam-required
    // conversion may still be open up to the final deadline, if one was recorded.
    if (finalConversionDeadline) {
      const final = new Date(finalConversionDeadline);
      if (today <= final) {
        return { label: `Convertible — exam now required (until ${fmtDate(finalConversionDeadline)})`, tone: "warn" };
      }
      return { label: "Conversion window closed", tone: "bad" };
    }
    return { label: "Convertible — exam now required", tone: "warn" };
  }

  if (finalConversionDeadline) {
    const final = new Date(finalConversionDeadline);
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
// Term outreach — powers the new "Term" view on the Clients page (Karina, 9/4: "it needs to just
// go to the term tab in order of what's expiring first so the adviser can go in and start looking
// at them"). A term product can have up to three tracked dates (no-exam conversion deadline,
// final/exam-required conversion deadline, or a plain term end date for a non-convertible term) —
// this picks the ONE that's actually relevant right now to sort and color the list by.
// ─────────────────────────────────────────────────────────────

export interface TermMilestone {
  date: string;
  label: string;
}

export interface TermMilestoneSource {
  conversion_deadline: string | null;
  final_conversion_deadline: string | null;
  term_end_date: string | null;
  // Fallback for term_end_date — see the 9/4 note above the ProductStatus section. Only used
  // when term_end_date itself is empty.
  expiration_date?: string | null;
}

// Prefer the earliest of the three dates that's still upcoming (today or later). If everything
// tracked has already passed, fall back to the most recently passed one — an overdue term is
// exactly why the advisor still needs to see it, not a reason for it to quietly disappear.
export function getNextTermMilestone(product: TermMilestoneSource): TermMilestone | null {
  const candidates: TermMilestone[] = [];
  if (product.conversion_deadline) candidates.push({ date: product.conversion_deadline, label: "No-exam conversion window" });
  if (product.final_conversion_deadline) candidates.push({ date: product.final_conversion_deadline, label: "Final conversion deadline" });
  const termExpiration = product.term_end_date ?? product.expiration_date ?? null;
  if (termExpiration) candidates.push({ date: termExpiration, label: "Term expiration date" });
  if (candidates.length === 0) return null;

  const upcoming = candidates.filter((c) => daysUntil(c.date) >= 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcoming.length > 0) return upcoming[0];

  return candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
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
