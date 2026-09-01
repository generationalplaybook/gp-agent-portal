// Policy Illustration Summary — advisor-entered highlights from a carrier's own illustration
// (cash value, death benefit, income projections, etc. at a few milestone ages), condensed into
// a one-page, visual PDF for a client. What gets entered depends entirely on the product type —
// a term policy has no cash value to chart, an annuity has no traditional death benefit growth,
// so each type gets its own field shape rather than one generic form.

export type IllustrationKind = "cash_value" | "term" | "final_expense" | "annuity";

export interface CashValueMilestone {
  id: string;
  label: string; // freeform, e.g. "Age 18", "Year 10", "Retirement (65)"
  cvGuaranteed: string;
  cvNonGuaranteed: string;
  dbGuaranteed: string;
  dbNonGuaranteed: string;
}

export interface AnnuityMilestone {
  id: string;
  label: string;
  accumulationValue: string;
  incomeValue: string;
  deathBenefit: string;
}

// IUL, Whole Life, and "Other" all get the same cash-value-over-time shape — the growth
// mechanics differ but what's worth showing a client is the same: cash value and death benefit,
// guaranteed vs. non-guaranteed, at a handful of milestone ages. Final Expense Whole Life is
// deliberately NOT included here (see FinalExpenseIllustration below) — it doesn't have a real
// non-guaranteed side to compare against.
export interface CashValueIllustration {
  kind: "cash_value";
  milestones: CashValueMilestone[];
  notes: string;
  // Age the death benefit starts stepping up (common on some IUL designs — juvenile policies in
  // particular). Optional and additive: the original per-product Illustration flow never sets or
  // reads this, so existing records are unaffected. Only the Illustration Scenarios editor uses it.
  dbIncreaseAge?: string;
}

// Term has no cash value to chart — what matters is the flat death benefit, the term itself,
// the level premium, and which living-benefit riders are attached.
export interface TermIllustration {
  kind: "term";
  deathBenefit: string;
  termLength: string;
  levelPremium: string;
  riders: string[];
  conversionDeadline: string;
  notes: string;
}

// Final Expense Whole Life is guaranteed- or simplified-issue and permanent from day one — the
// premium and death benefit are both locked for life. Unlike an IUL (where the credited value
// genuinely depends on index performance), there's no "non-guaranteed" side to it, so it gets
// Term's simple, no-chart shape rather than the Guaranteed/Non-Guaranteed milestone table.
export interface FinalExpenseIllustration {
  kind: "final_expense";
  deathBenefit: string;
  levelPremium: string;
  riders: string[];
  notes: string;
}

export interface AnnuityIllustration {
  kind: "annuity";
  initialPremium: string;
  milestones: AnnuityMilestone[];
  notes: string;
}

export type IllustrationData = CashValueIllustration | TermIllustration | FinalExpenseIllustration | AnnuityIllustration;

export function illustrationKindForProductType(productType: string | null | undefined): IllustrationKind {
  if (productType === "Term Life") return "term";
  if (productType === "Final Expense") return "final_expense";
  if (productType === "Annuity") return "annuity";
  return "cash_value"; // IUL, Whole Life, Other
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function emptyCashValueMilestone(): CashValueMilestone {
  return { id: newId(), label: "", cvGuaranteed: "", cvNonGuaranteed: "", dbGuaranteed: "", dbNonGuaranteed: "" };
}

export function emptyAnnuityMilestone(): AnnuityMilestone {
  return { id: newId(), label: "", accumulationValue: "", incomeValue: "", deathBenefit: "" };
}

export function emptyIllustrationFor(productType: string | null | undefined): IllustrationData {
  const kind = illustrationKindForProductType(productType);
  if (kind === "term") {
    return { kind: "term", deathBenefit: "", termLength: "", levelPremium: "", riders: [], conversionDeadline: "", notes: "" };
  }
  if (kind === "final_expense") {
    return { kind: "final_expense", deathBenefit: "", levelPremium: "", riders: [], notes: "" };
  }
  if (kind === "annuity") {
    return { kind: "annuity", initialPremium: "", milestones: [emptyAnnuityMilestone()], notes: "" };
  }
  return { kind: "cash_value", milestones: [emptyCashValueMilestone()], notes: "" };
}

export function parseMoney(str: string | undefined | null): number {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}
