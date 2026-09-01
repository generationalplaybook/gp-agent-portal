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
  // Increasing-death-benefit-option numbers — added 9/1 for the Illustration Scenarios' two-part
  // Level vs. Increasing comparison. cvNonGuaranteed/dbGuaranteed above are already what the
  // Scenario editor uses as this milestone's "Level" track (Level pays the full elected face
  // amount from day one); these two are the parallel "Increasing" track (starts lower, grows
  // into that same target over years) at the same milestone age, entered side by side so a
  // client can see both. Optional/additive — the original per-product Illustration flow
  // (Guaranteed/Non-Guaranteed) never sets or reads these.
  cvIncreasing?: string;
  dbIncreasing?: string;
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
  // The policy's starting face amount at issue — flagged 9/1: the milestone Death Benefit numbers
  // show the (possibly increasing) DB at each future age, but there was nowhere to record the
  // initial face amount the policy is actually issued at. Optional/additive, same reasoning as
  // dbIncreaseAge above.
  initialDeathBenefit?: string;
  // Policy Premium — added 9/1: what the client actually pays vs. the bare minimum that keeps
  // the policy from lapsing, called out as their own section (deliberately separate from Initial
  // Death Benefit above — Karina's call, different setting/topic even though both are single
  // up-front numbers). Mirrors client_products.minimum_premium's "Minimum to avoid lapse"
  // labeling for consistency with the Products tab. Optional/additive, same reasoning as the
  // fields above — the original per-product Illustration flow doesn't have or need these.
  monthlyPremium?: string;
  minimumPremium?: string;
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
  return {
    id: newId(),
    label: "",
    cvGuaranteed: "",
    cvNonGuaranteed: "",
    dbGuaranteed: "",
    dbNonGuaranteed: "",
    cvIncreasing: "",
    dbIncreasing: "",
  };
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

// Every dollar figure on an Illustration/Scenario PDF is free-typed by an advisor into a plain
// DollarInput (no forced formatting there — see DollarInput.tsx's own comment on why). One
// advisor types "50000", another types "50,000" — so two PDFs for the same numbers could come
// out looking different depending on who typed it. Flagged 9/1: Karina wants every PDF to look
// the same regardless of advisor typing habits. This re-formats through parseMoney at PDF-render
// time only (nothing stored changes) — always "50,000", or "50,000.25" if real cents were
// entered. Blank/non-numeric input passes through untouched so a "—" placeholder upstream still
// works.
export function formatMoney(str: string | undefined | null): string {
  if (!str || !String(str).trim()) return "";
  const n = parseMoney(str);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return n.toLocaleString("en-US", hasCents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {});
}
