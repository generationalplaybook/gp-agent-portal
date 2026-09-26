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

// A quick "what age does this hit $X" highlight — added 9/7 per Karina, distinct from the
// detailed per-age Milestones table (CashValueMilestone) above. That table answers "at age Y,
// what's the cash value / death benefit?" — this answers the inverse: "at what age does the
// death benefit reach a specific target amount, like $500,000 or $1,000,000?" Since Level and
// Increasing grow into a target differently (Level pays the full face amount from day one so it
// may already be there; Increasing starts lower and grows into it over years), the age can
// genuinely differ between the two — so each target gets its own Level age and Increasing age,
// not one shared age. Leave either age blank if that election doesn't apply or hasn't been
// illustrated that far out.
export interface DeathBenefitTarget {
  id: string;
  targetAmount: string;
  levelAge: string;
  increasingAge: string;
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
  // dbIncreaseAge above. 9/2: split into a Level/Increasing pair, same as the milestone fields —
  // carriers can quote a different starting face amount for each election even though both are
  // working toward the same eventual target, so initialDeathBenefit is now specifically the
  // "Level" starting face and initialDeathBenefitIncreasing is the parallel "Increasing" one.
  initialDeathBenefit?: string;
  initialDeathBenefitIncreasing?: string;
  // Policy Premium — added 9/1: what the client actually pays vs. the bare minimum that keeps
  // the policy from lapsing, called out as their own section (deliberately separate from Initial
  // Death Benefit above — Karina's call, different setting/topic even though both are single
  // up-front numbers). Mirrors client_products.minimum_premium's "Minimum to avoid lapse"
  // labeling for consistency with the Products tab. Optional/additive, same reasoning as the
  // fields above — the original per-product Illustration flow doesn't have or need these.
  // monthlyPremium stays a single figure — what the client chooses to actually pay doesn't change
  // with the Level/Increasing election. minimumPremium DOES vary by election (cost of insurance
  // differs between the two), so 9/2 split it the same way as initialDeathBenefit above:
  // minimumPremium is the "Level" minimum, minimumPremiumIncreasing (added 9/2) is the parallel
  // "Increasing" one.
  monthlyPremium?: string;
  minimumPremium?: string;
  minimumPremiumIncreasing?: string;
  // Death Benefit Milestones — added 9/7 per Karina: "should we also have milestone death
  // benefit... so I can show at what age it hits 500K and what age 1M... advisor inputs the age
  // and the amount." Deliberately separate from the Milestones table above (see the comment on
  // DeathBenefitTarget) — a short, quick-read highlight rather than the full growth table.
  // Optional/additive: undefined on every existing scenario; the editor shows 2 blank rows to
  // start (Karina confirmed 2 as the default) but lets an advisor add more.
  deathBenefitTargets?: DeathBenefitTarget[];
  // Multiple budgets — added 9/25 per Karina: "i am doing 3 different budgets for the same
  // product... add additional budget section that opens up another section for the same
  // illustration for all of the same numbers to be inputted." She confirmed with a fully-filled-
  // out real scenario (Policy Premium, Initial Death Benefit, Death Benefit Increase, Death
  // Benefit Milestones, and the main Milestones table) that she wants ALL of that — everything
  // above except `milestones`/`notes` at the top level, plus `milestones` itself — duplicated per
  // budget, capped at 3 ("i think up two 3 budgets is enough"). `notes` deliberately stays OUT of
  // CashValueBudget and shared across every budget on the scenario: the Illustration Scenarios
  // editor's Notes field is actually bound to the scenario's own top-level notes column, not this
  // one, so there's no per-budget notes concept to preserve.
  //
  // Every field above this comment (milestones through deathBenefitTargets) is the ORIGINAL single-
  // budget shape and stays exactly as-is — this is additive, not a replacement. When `budgets` is
  // unset or empty (every scenario/illustration created before 9/25), those flat fields ARE "Budget
  // 1"; see getCashValueBudgets() below, which is what the PDF renderer and the editor UI actually
  // read from so this backward-compat mapping only has to live in one place. Once an advisor adds a
  // 2nd/3rd budget, `budgets` gets populated (budget 1's values copied in from the flat fields) and
  // becomes the sole source of truth going forward; the flat fields are left as they were at that
  // point (unread afterward) rather than cleared, so nothing is destructively lost.
  budgets?: CashValueBudget[];
}

// One full budget's worth of cash-value inputs — see the `budgets` comment on CashValueIllustration
// above for why this exists and what's deliberately excluded (notes). Mirrors CashValueIllustration's
// own field shape (minus kind/notes) exactly so getCashValueBudgets() below can map old flat-field
// records onto this with no data loss.
export interface CashValueBudget {
  id: string;
  label: string; // e.g. "Budget 1" (auto default) or something custom like "$150/mo" — advisor-editable either way
  monthlyPremium?: string;
  minimumPremium?: string;
  minimumPremiumIncreasing?: string;
  initialDeathBenefit?: string;
  initialDeathBenefitIncreasing?: string;
  dbIncreaseAge?: string;
  deathBenefitTargets?: DeathBenefitTarget[];
  milestones: CashValueMilestone[];
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
  // Added 9/25 per Karina: "i ned the convertable max age and note medical exame needed" — the
  // single conversionDeadline field above only captured the NO-EXAM window, but many term
  // policies (e.g. North American's ADDvantage Term) still allow conversion past that age with a
  // new medical exam, up to a later hard cutoff. Mirrors the same two-tier
  // conversion_deadline/final_conversion_deadline split already used for Outreach milestones (see
  // getNextOutreachMilestone in lib/products.ts). Optional/additive — undefined on every existing
  // scenario/illustration.
  finalConversionDeadline?: string;
  notes: string;
  // Second and third options — added 9/24 per Karina, same pattern as Final Expense's
  // deathBenefit2/3 (see FinalExpenseIllustration below): "there are different options like i
  // want to show my client 500,000 and another option... allow up to 3 options". Term length is
  // included per-option too (unlike Final Expense) since term policies commonly get compared at
  // different lengths (e.g. 20 vs 30 year), not just different face amounts — left blank, an
  // option falls back to the scenario's primary termLength above. deathBenefit/levelPremium/
  // termLength above stay the primary (first) option, optional/additive, so every existing Term
  // scenario is unaffected.
  deathBenefit2?: string;
  levelPremium2?: string;
  termLength2?: string;
  deathBenefit3?: string;
  levelPremium3?: string;
  termLength3?: string;
  // Added 9/25 per Karina: the level premium was always shown with no payment-frequency label
  // (or, on Final Expense below, silently assumed monthly), but plenty of clients pay annually,
  // semi-annually, or quarterly instead. One frequency applies to every option on the
  // illustration/scenario (they're all the same policy, just quoted a few ways), not per-option.
  // Optional/additive — undefined on every existing scenario/illustration, and the PDF renderer
  // treats undefined the same as "monthly" so nothing already generated changes appearance.
  premiumFrequency?: PremiumFrequency;
}

// Added 9/25 — see the comment on TermIllustration.premiumFrequency above.
export type PremiumFrequency = "monthly" | "annual" | "semi_annual" | "quarterly";

// Final Expense Whole Life is guaranteed- or simplified-issue and permanent from day one — the
// premium and death benefit are both locked for life. Unlike an IUL (where the credited value
// genuinely depends on index performance), there's no "non-guaranteed" side to it, so it gets
// Term's simple, no-chart shape rather than the Guaranteed/Non-Guaranteed milestone table.
export interface FinalExpenseIllustration {
  kind: "final_expense";
  deathBenefit: string;
  levelPremium: string;
  // Second and third budget options — added 9/2. Karina wants to show a client more than one
  // face-value/premium pairing on the same scenario ("sometimes people have room in their
  // budget, so I want to enter more" — at least 3 total). Final Expense pricing is a
  // straightforward face-value-to-premium table per carrier, so unlike cash_value's Milestones
  // this isn't an age-by-age table — just up to 3 flat pairs. deathBenefit/levelPremium above
  // stay the primary (first) option, optional/additive like everywhere else in this app, so
  // every existing Final Expense scenario is unaffected.
  deathBenefit2?: string;
  levelPremium2?: string;
  deathBenefit3?: string;
  levelPremium3?: string;
  // Product name for options 2/3 — added 9/13. Karina: "when we are doing multiple final expense
  // options can we have the option to enter another product name and list out on multiple
  // policies so its easy to glance at" — comparing entirely different carriers/products side by
  // side (e.g. TruStage vs. Living Promise vs. Banner Life), not just bigger/smaller budget tiers
  // of the one primary product. Left blank, an option still reads as just another budget tier of
  // the scenario's own primary product (product_name, set when the scenario was created) — every
  // existing Final Expense scenario is unaffected.
  productName2?: string;
  productName3?: string;
  riders: string[];
  notes: string;
  // See the comment on TermIllustration.premiumFrequency above — same field, same meaning, just
  // mirrored here since Final Expense is its own interface. Undefined = monthly, matching the
  // "/mo" that was hardcoded here before.
  premiumFrequency?: PremiumFrequency;
}

export interface AnnuityIllustration {
  kind: "annuity";
  initialPremium: string;
  milestones: AnnuityMilestone[];
  notes: string;
  // Income rider — added 9/6 per Karina: when the annuity has a lifetime-income rider attached,
  // record when the income turns on and what it pays, so that shows on the summary alongside the
  // accumulation/death-benefit milestones above. Optional/additive — every existing annuity
  // scenario has none of these set and behaves exactly as before.
  hasIncomeRider?: boolean;
  // "immediate" = income is already turned on / starts right away; "deferred" = income starts at
  // a future age (incomeStartAge). Only meaningful when hasIncomeRider is true.
  incomeStartTiming?: "immediate" | "deferred";
  incomeStartAge?: string; // only used/entered when incomeStartTiming is "deferred"
  incomeMonthlyAmount?: string; // the monthly income amount once it starts, either way
  // Surrender term length — added 9/25 per Karina: "we need a spot for how many year annuity it
  // is." Free text (e.g. "7-Year", "10-Year") rather than a number, same pattern as
  // TermIllustration.termLength — carriers commonly sell the same FIA in several term-length
  // variants (Athene Performance Elite 7 vs 10 vs 15, etc.) with different caps/participation
  // rates, and this is what actually identifies which variant is being illustrated. Optional/
  // additive.
  termLength?: string;
  // Current cap rate — added 9/25 per Karina, same conversation as termLength above: the
  // Accumulation Value milestones are driven by an assumed index crediting rate the client never
  // otherwise sees. capRateStrategy is the index strategy the rate applies to (e.g. "S&P 500
  // Annual Point-to-Point"); optional on its own since a strategy name isn't always relevant to
  // note, but capRate is the number that actually needs disclosing. Both optional/additive.
  capRate?: string;
  capRateStrategy?: string;
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

export function emptyDeathBenefitTarget(): DeathBenefitTarget {
  return { id: newId(), targetAmount: "", levelAge: "", increasingAge: "" };
}

export function emptyCashValueBudget(label: string): CashValueBudget {
  return {
    id: newId(),
    label,
    monthlyPremium: "",
    minimumPremium: "",
    minimumPremiumIncreasing: "",
    initialDeathBenefit: "",
    initialDeathBenefitIncreasing: "",
    dbIncreaseAge: "",
    deathBenefitTargets: [emptyDeathBenefitTarget(), emptyDeathBenefitTarget()],
    milestones: [emptyCashValueMilestone()],
  };
}

// The single source of truth for "what budgets does this cash_value illustration have" — both the
// Illustration Scenarios editor and the PDF renderer read through this rather than ever touching
// `data.budgets` directly, so the backward-compat fallback (treat pre-9/25 flat fields as an
// implicit "Budget 1") only has to be right in one place. Returns `data.budgets` unchanged when
// it's populated; otherwise wraps the legacy flat fields into a single-item array.
export function getCashValueBudgets(data: CashValueIllustration): CashValueBudget[] {
  if (data.budgets && data.budgets.length > 0) return data.budgets;
  return [
    {
      id: "legacy-budget-1",
      label: "Budget 1",
      monthlyPremium: data.monthlyPremium ?? "",
      minimumPremium: data.minimumPremium ?? "",
      minimumPremiumIncreasing: data.minimumPremiumIncreasing ?? "",
      initialDeathBenefit: data.initialDeathBenefit ?? "",
      initialDeathBenefitIncreasing: data.initialDeathBenefitIncreasing ?? "",
      dbIncreaseAge: data.dbIncreaseAge ?? "",
      deathBenefitTargets:
        data.deathBenefitTargets && data.deathBenefitTargets.length > 0
          ? data.deathBenefitTargets
          : [emptyDeathBenefitTarget(), emptyDeathBenefitTarget()],
      milestones: data.milestones.length > 0 ? data.milestones : [emptyCashValueMilestone()],
    },
  ];
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
// time only (nothing stored changes) — always "50,000.00", or "50,000.25" if real cents were
// entered. Blank/non-numeric input passes through untouched so a "—" placeholder upstream still
// works.
//
// 9/11: was only forcing 2 decimals when cents were actually present (an even "$50,000" showed
// with none) — Karina, after a client meeting: "automatic decimal and zero zero needs to be
// there automatic comma throughout the entire financial analysis... across the entire platform
// wherever there is money." This is the one function nearly every dollar figure in the app
// (DollarInput's on-screen formatting, every Illustration/Scenario PDF) already routes through,
// so always forcing 2 decimals here is what makes that true everywhere at once.
export function formatMoney(str: string | undefined | null): string {
  if (!str || !String(str).trim()) return "";
  const n = parseMoney(str);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
