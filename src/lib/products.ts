// Computes the at-a-glance conversion/expiration status for a client's existing product —
// e.g. a term policy that's convertible to a permanent product with no medical exam only
// within a set window, and requires one after that (but before the policy expires).
//
// 9/3: extended for the "final conversion deadline" + "no-exam window declined" fields Karina
// asked for — after the no-exam window closes, conversion is often still possible up to a later,
// absolute cutoff (her example: "5 years no exam and convert until age 75"), but now requires a
// medical exam. And separately, an advisor can record that the no-exam window was specifically
// missed/declined (no_exam_declined_at) rather than just letting the date quietly pass.

export interface ProductStatus {
  label: string;
  tone: "good" | "warn" | "bad";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function getProductStatus(
  expirationDate: string | null,
  conversionDeadline: string | null,
  finalConversionDeadline?: string | null,
  noExamDeclinedAt?: string | null
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

  return null;
}
