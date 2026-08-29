// Computes the at-a-glance conversion/expiration status for a client's existing product —
// e.g. a term policy that's convertible to a permanent product with no medical exam only
// within a set window, and requires one after that (but before the policy expires).

export interface ProductStatus {
  label: string;
  tone: "good" | "warn" | "bad";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function getProductStatus(
  expirationDate: string | null,
  conversionDeadline: string | null
): ProductStatus | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expirationDate) {
    const exp = new Date(expirationDate);
    if (today > exp) return { label: "Expired", tone: "bad" };
  }

  if (conversionDeadline) {
    const deadline = new Date(conversionDeadline);
    if (today <= deadline) {
      return { label: `Convertible, no exam until ${fmtDate(conversionDeadline)}`, tone: "good" };
    }
    return { label: "Convertible — exam now required", tone: "warn" };
  }

  return null;
}
