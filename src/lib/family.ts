// Small shared helpers for the family-linking feature (client detail page's Family section).
// calculateAge / daysUntilNextBirthday are deliberately generic — the planned guardian-tracking
// backlog item (auto-flagging minors who turn 18) can reuse these instead of re-deriving age math.

export function calculateAge(birthDateIso: string, asOf: Date = new Date()): number {
  const dob = new Date(birthDateIso);
  let age = asOf.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > dob.getMonth() ||
    (asOf.getMonth() === dob.getMonth() && asOf.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// Days until this person's next birthday (0 = today). Used to flag a minor approaching 18
// soon, not just currently under 18.
export function daysUntilNextBirthday(birthDateIso: string, asOf: Date = new Date()): number {
  const dob = new Date(birthDateIso);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const FAMILY_RELATIONSHIP_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];

// Family linking (Karina, 9/5): family_relationship is a single flat field per client row, so
// linking B to A only ever recorded "B is A's ___" — A's own page never got a relationship back.
// For the four standard, reliably-invertible types, this fills in what A is to B automatically
// (Spouse<->Spouse, Child<->Parent, Parent<->Child, Sibling<->Sibling). Returns null for anything
// else — "Other" and free-text values have no single reliable inverse (e.g. "Stepchild" doesn't
// obviously invert), so callers should offer an explicit reverse-relationship field instead and
// leave it blank if not provided, rather than guessing.
export function inverseRelationship(relationship: string): string | null {
  const inverses: Record<string, string> = {
    spouse: "Spouse",
    child: "Parent",
    parent: "Child",
    sibling: "Sibling",
  };
  return inverses[relationship.trim().toLowerCase()] ?? null;
}

// True when this person turns exactly `age` plus six months today — e.g. isHalfBirthdayToday(dob,
// 59) is true on someone's 59 1/2 birthday. Added 9/4 for the annuity IRS early-withdrawal-
// penalty milestone, which (unlike calculateAge/daysUntilNextBirthday above) isn't a whole-year
// birthday.
export function isHalfBirthdayToday(birthDateIso: string, age: number, asOf: Date = new Date()): boolean {
  const dob = new Date(birthDateIso);
  const target = new Date(dob.getFullYear() + age, dob.getMonth() + 6, dob.getDate());
  target.setHours(0, 0, 0, 0);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return target.getTime() === today.getTime();
}
