// Client Analyzer recommendation engine — ported verbatim (logic-for-logic) from the
// original GP Agent Portal HTML's runAnalyzer()/buildRolloverRec() functions.
//
// Goal is multi-select: the client can have more than one primary goal, and we build one
// full recommendation block per selected goal (falling back to a single "general" block
// when no goal is selected, matching the original tool's default behavior).

export type YesNoSkip = "yes" | "no" | "skip";

export type Goal = "accumulation" | "income" | "protection" | "legacy" | "college" | "income_now";

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "accumulation", label: "Build cash value / savings" },
  { value: "income", label: "Guaranteed lifetime income" },
  { value: "protection", label: "Pure protection at lowest cost" },
  { value: "legacy", label: "Maximize legacy / estate" },
  { value: "college", label: "College funding for a child" },
  { value: "income_now", label: "Income starting immediately" },
];

const GOAL_LABELS: Record<Goal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((o) => [o.value, o.label])
) as Record<Goal, string>;

export interface AnalyzerInputs {
  name: string;
  dob: string;
  phone: string;
  email: string;
  // Freeform: what the client already has on the books (existing policies/products), so the
  // advisor isn't recommending something redundant and can see the fuller picture at a glance.
  // Auto-filled from the client's Products list when the analysis is started from their
  // profile; editable either way.
  existingCoverage?: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  tobacco?: "none" | "former" | "current" | "marijuana" | "skip";
  health?: "none" | "managed" | "significant" | "skip";
  declined?: "no" | "rated" | "declined" | "skip";
  money?: "qualified" | "nonqualified" | "both" | "skip";
  otherRetirement?: "yes" | "no" | "skip";
  otherAmount?: string;
  funding?: "monthly" | "lumpsum" | "both" | "periodic" | "skip";
  // Approx one-time amount available, when funding includes a lump sum.
  lumpSumAmount?: string;
  // Approx monthly budget available, when funding includes ongoing premiums.
  monthlyBudget?: string;
  // Approx amount per contribution, when funding is periodic (a few times a year rather than
  // monthly or a single lump sum) — common for high earners dumping in extra money for tax
  // purposes around bonus season or year-end.
  periodicAmount?: string;
  income?: string;
  debt?: string;
  goals?: Goal[];
  horizon?: "short" | "mid" | "long" | "never" | "skip";
  risk?: "guaranteed" | "protected" | "growth" | "skip";
  earlyAccess?: "yes" | "no" | "both" | "skip";
}

export interface RolloverRec {
  product: string;
  reasons: string[];
}

export interface GoalRecommendation {
  goal: Goal | null;
  goalLabel: string;
  primary: string;
  secondary: string;
  avoid: string;
  reasons: string[];
  talking: string[];
  avoidReasons: string[];
  // A pairing suggestion rather than a hard avoid — e.g. qualified money can't fund an IUL
  // directly, but the client may still be a good fit for one funded with other money alongside
  // the annuity. Shown as a distinct "combo option" callout, never mixed into avoid/avoidReasons.
  combo: string;
  comboReasons: string[];
}

export interface AnalyzerResult {
  name: string;
  phone: string;
  email: string;
  age: number | null;
  dob: string;
  existingCoverage?: string;
  heightFt: string;
  heightIn: string;
  weight: string;
  tobacco?: string;
  health?: string;
  declined?: string;
  money?: string;
  funding?: string;
  lumpSumAmount?: string;
  monthlyBudget?: string;
  periodicAmount?: string;
  income: number;
  debt: number;
  suggestedDB: number | null;
  suggestedReserveLow: number | null;
  suggestedReserveHigh: number | null;
  goals: Goal[];
  horizon?: string;
  risk?: string;
  earlyAccess?: string;
  recommendations: GoalRecommendation[];
  hasRollover: boolean;
  rolloverProduct: string | null;
  rolloverReasons: string[] | null;
}

export function parseCurrencyValue(str: string): number {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function calcAgeFromDob(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function buildRolloverRec(ageGroup: "young" | "mid" | "preretiree" | "retiree", otherAmount: string): RolloverRec {
  let rProduct = "";
  let rReasons: string[] = [];
  if (ageGroup === "young") {
    rProduct = "Athene Performance Elite or Athene Agility";
    rReasons = [
      "Direct rollover from the old 401k/IRA — no tax event at transfer",
      "Performance Elite: participation rates up to 335%, pure accumulation",
      "Agility: built-in income rider at no charge if income may be needed later in life",
    ];
  } else if (ageGroup === "mid") {
    rProduct = "Athene Agility";
    rReasons = [
      "Direct rollover — no tax event at transfer",
      "Built-in Income and Death Benefit Rider at no additional charge",
      "Activate income whenever ready — not required now",
    ];
  } else {
    rProduct = "Athene Ascent Pro Bonus";
    rReasons = [
      "Direct rollover — no tax event at transfer",
      "10% premium bonus + 20% income base bonus + guaranteed 10% roll-up for 10 years",
      "Routinely the highest guaranteed income payout from any A+ carrier — ideal for consolidating an old 401k into guaranteed retirement income",
    ];
  }
  if (otherAmount) rReasons = ["Approximate rollover amount: " + otherAmount, ...rReasons];
  return { product: rProduct, reasons: rReasons };
}

interface RecommendationContext {
  insurable: "no" | "maybe" | "yes";
  money?: "qualified" | "nonqualified" | "both";
  ageGroup: "young" | "mid" | "preretiree" | "retiree";
  horizon?: "short" | "mid" | "long" | "never";
  funding?: "monthly" | "lumpsum" | "both" | "periodic";
  earlyAccess?: "yes" | "no" | "both";
}

function computeRecommendation(goal: Goal | undefined, ctx: RecommendationContext): Omit<GoalRecommendation, "goal" | "goalLabel"> {
  const { insurable, money, ageGroup, horizon, funding, earlyAccess } = ctx;

  let primary = "";
  let secondary = "";
  let avoid = "";
  let reasons: string[] = [];
  let talking: string[] = [];
  let avoidReasons: string[] = [];
  let combo = "";
  let comboReasons: string[] = [];

  if (insurable === "no") {
    if (goal === "income_now") {
      primary = "Athene Activate SPIA";
      reasons = [
        "No underwriting required — uninsurable clients fully qualify",
        "Income starts within 30 days",
        "Payments guaranteed — Athene cannot reduce them",
      ];
      secondary = "F&G Safe Income Advantage — if income can be deferred to grow first";
    } else if (goal === "income" || ageGroup === "retiree" || ageGroup === "preretiree") {
      primary = "Athene Ascent Pro Bonus";
      reasons = [
        "No underwriting required — annuity is the right tool for uninsurable clients",
        "10% premium bonus + 20% income base bonus at issue",
        "Guaranteed 10% simple interest roll-up for 10 years",
        "Routinely the highest guaranteed income payout from any A+ carrier",
      ];
      secondary = "F&G Safe Income Advantage — 7.2% guaranteed roll-up with inflation-linked payout";
    } else {
      primary = "Athene Performance Elite";
      reasons = ["No underwriting required", "0% floor with participation rates up to 335%", "No income rider fee drag — pure accumulation"];
      secondary = "Athene Agility — built-in income rider at no charge if income may be needed later";
    }
    avoid = "Any IUL or Term product";
    avoidReasons = ["Client cannot pass life insurance underwriting — annuities require none"];
  } else if (money === "qualified" && goal !== "protection" && goal !== "legacy") {
    if (goal === "income_now") {
      primary = "Athene Activate SPIA";
      reasons = [
        "Direct 401k/IRA rollover — no tax event at transfer",
        "Income starts within 30 days",
        "Payments guaranteed once set",
      ];
      secondary = "Athene Agility — if income can wait, built-in rider at no charge";
    } else if (goal === "income" || ageGroup === "retiree" || ageGroup === "preretiree") {
      primary = "Athene Ascent Pro Bonus";
      reasons = [
        "Qualified money rolls directly into an annuity — no tax event at transfer",
        "10% premium bonus + 20% income base bonus + guaranteed 10% roll-up for 10 years",
        "Taxes deferred until income distributions begin",
      ];
      secondary = "F&G Safe Income Advantage — 7.2% roll-up, inflation-linked payout option";
    } else {
      primary = "Athene Performance Elite or Athene Agility";
      reasons = [
        "Direct rollover — no tax event at transfer",
        "Performance Elite: participation up to 335%, pure accumulation",
        "Agility: built-in income rider at no charge if income may be needed later",
      ];
      secondary = "F&G Safe Income Advantage — if guaranteed income is the end goal";
    }
    // Not a blanket "avoid IUL" — qualified money specifically can't fund one directly. If the
    // client has other, non-qualified money (income, savings, a second account), a separately
    // funded IUL alongside this annuity is still worth raising, not ruled out.
    combo = "Pair with a separately-funded IUL";
    comboReasons = [
      "Qualified money can't fund an IUL directly — it would need to be distributed first, triggering taxes",
      "If the client has other income or savings outside this qualified account, a separately-funded IUL alongside this annuity adds tax-free cash value growth and extra legacy protection",
    ];
    talking = [
      "Your 401k rolls directly into an annuity with zero taxes due today",
      "The same 59 1/2 restriction already applies to your 401k — this does not make your timeline worse",
      "The annuity adds a 0% floor so market crashes cannot touch your balance",
    ];
  } else {
    if (goal === "protection") {
      primary = "ADDvantage Term (North American)";
      reasons = [
        "Maximum death benefit at lowest cost",
        "All three living benefits included at no extra cost",
        "Convertible to any North American IUL later with no new medical exam",
      ];
      secondary = "Ethos Term With Living Benefits (Ameritas) — if conversion to North American is not a priority";
      avoid = "IUL for pure protection";
      avoidReasons = ["IUL cost of insurance is higher than term — for pure protection, term is more efficient"];
    } else if (goal === "legacy") {
      if (horizon === "long" || horizon === "never" || !horizon) {
        primary = "North American Protection Builder IUL 2";
        reasons = [
          "Guaranteed death benefit to age 120 via Premium Guaranteed Rider",
          "Premium Recovery Endorsement — 50% back at Year 15, 100% back at Year 20/25",
          "Living benefits included at no extra cost",
        ];
        secondary = "F&G Everlast IUL — maximizes death benefit with InstApproval";
      } else {
        primary = "ADDvantage Term (North American) with conversion plan";
        reasons = ["Lock in coverage now at lowest cost", "Convert to Protection Builder IUL 2 later when income supports higher premiums"];
        secondary = "North American Protection Builder IUL 2 — if client can fund now";
      }
    } else if (goal === "college") {
      primary = "North American Accumulation IUL — College Planning Juvenile (via Ethos)";
      reasons = [
        "Cash value NOT counted as a FAFSA asset — unlike 529 plans",
        "Distributions start at age 18 — tax-free policy loans",
        "No restrictions on use",
        "Permanently locks in child's insurability",
      ];
      secondary = "Accumulation IUL — Max Cash Value Juvenile — if maximum long-term growth is the priority";
      avoid = "529 Plan";
      avoidReasons = ["529 plans count against FAFSA financial aid. IUL cash value does not appear on FAFSA and has no use restrictions"];
    } else if (goal === "income_now") {
      primary = "Athene Activate SPIA";
      reasons = ["Income starts within 30 days", "Payments guaranteed once set", "Life only, period certain, or joint life options available"];
      secondary = "F&G Safe Income Advantage — if client can wait 1-2 years, roll-up produces more";
      avoid = "IUL for immediate income";
      avoidReasons = ["IUL requires years to build meaningful cash value — not suitable for immediate income"];
      talking = ["You put in your lump sum and within 30 days your guaranteed paycheck begins", "It never stops — even if you live to 100"];
    } else if (goal === "income") {
      if (ageGroup === "young" || horizon === "long") {
        primary = "North American Builder Plus IUL 4";
        reasons = [
          "At a younger age, IUL can provide more tax-free income over a longer retirement than an annuity",
          "Net-zero cost loans — tax-free income with no restrictions",
          "Exclusive Fidelity index bonuses compound over 20+ years",
        ];
        secondary = "Athene Agility FIA — if client also has qualified money needing rollover";
      } else {
        primary = "Athene Ascent Pro Bonus";
        reasons = [
          "10% premium bonus + 20% income base bonus + 10% roll-up = maximum guaranteed income",
          "Routinely the highest guaranteed income payout from any A+ carrier",
        ];
        secondary = "North American Builder Plus IUL 4 — if client is under 55 and can defer 15+ years";
        talking = [
          "This is the highest guaranteed income available from an A+ rated carrier",
          "Your income is locked in regardless of what markets do",
          "You cannot outlive it even if you live to 120",
        ];
      }
    } else {
      // Builder Plus IUL 4 is the default here — it's what most clients end up in, and unlike
      // Smart Builder IUL 3 it carries no waiver-of-surrender-charge cost. IUL 3 only takes over
      // as primary when the client has a firm, explicit need for early access (not just a
      // mid-length horizon or an "either way" answer on access).
      if (earlyAccess === "yes") {
        primary = "North American Smart Builder IUL 3";
        reasons = [
          "0% premium load — 100% of every dollar goes to cash value from Day 1",
          "Waiver of Surrender Charge Rider = Day 1 access with no surrender penalties",
          "Policy loans available at any age — no IRS age restriction",
        ];
        if (funding === "lumpsum" || funding === "both" || funding === "periodic") {
          reasons.push("LUMP SUM FRIENDLY — 0% load means 100% of every deposit goes to work immediately, whether it's one lump sum or a few a year");
        }
        secondary = "North American Builder Plus IUL 4 — if time horizon is actually 15+ years";
        avoid = "Builder Plus IUL 4 for short-term goals";
        avoidReasons = ["Builder Plus 4 is designed for 20+ year strategies — not optimized for early access"];
      } else {
        primary = "North American Builder Plus IUL 4";
        reasons = [
          "Exclusive Fidelity Multifactor Yield Index — not available at any other carrier",
          "Interest bonus: 1% Years 1-10, increases to 1.5% after Year 10",
          "Net-zero cost loans — full balance earns even on loaned amount",
        ];
        if (horizon === "short" || horizon === "mid" || earlyAccess === "both") {
          secondary = "North American Smart Builder IUL 3 — if early access before 59½ turns out to be a firm need";
        } else {
          secondary = "Ethos Protection IUL — 14-15% below national average pricing";
        }
        if (funding === "lumpsum" || funding === "both" || funding === "periodic") {
          reasons.push("Flexible premium — accepts lump sum deposits including 1035 exchanges, on whatever schedule works for the client");
        }
      }
      talking = [
        "Your money grows linked to the market but can never go backwards — 0% floor",
        "When ready to access it, you take a policy loan — no tax, no credit check, no monthly payment required",
        "Your full balance keeps compounding even while borrowing against it",
      ];
    }
  }

  // Periodic funding (a few deposits a year rather than monthly or a single lump sum — common
  // for higher earners adding extra around bonus season or year-end for tax reasons) behaves
  // like a lump sum for an IUL's flexible-premium design, but annuities vary: most only accept
  // additional deposits during an initial purchase-payment window, not indefinitely. Flag that
  // distinction so the advisor double-checks the specific product rather than assuming.
  if (funding === "periodic" && primary) {
    if (primary.includes("IUL")) {
      reasons.push(
        "Flexible-premium product — deposits a few times a year (bonus season, year-end tax planning, etc.) work fine, no fixed schedule required"
      );
    } else if (!primary.includes("Term")) {
      reasons.push(
        "Confirm this specific annuity's purchase-payment window — most only accept additional deposits during an initial period (often the first several years), not indefinitely"
      );
    }
  }

  return { primary, secondary, avoid, reasons, talking, avoidReasons, combo, comboReasons };
}

export function runAnalyzer(inputs: AnalyzerInputs): AnalyzerResult {
  const age = calcAgeFromDob(inputs.dob);
  const income = parseCurrencyValue(inputs.income ?? "");
  const debt = parseCurrencyValue(inputs.debt ?? "");
  const suggestedDB = income > 0 ? income * 10 + debt : null;
  const suggestedReserveLow = income > 0 ? Math.round(income * 0.5) : null;
  const suggestedReserveHigh = income > 0 ? income : null;

  const money = inputs.money !== "skip" ? inputs.money : undefined;
  const insurable: "no" | "maybe" | "yes" =
    inputs.declined === "declined" ? "no" : inputs.declined === "rated" || inputs.health === "significant" ? "maybe" : "yes";
  const goals: Goal[] = inputs.goals ?? [];
  const horizon = inputs.horizon !== "skip" ? inputs.horizon : undefined;
  const funding = inputs.funding !== "skip" ? inputs.funding : undefined;
  const earlyAccess = inputs.earlyAccess !== "skip" ? inputs.earlyAccess : undefined;

  let ageGroup: "young" | "mid" | "preretiree" | "retiree" = "mid";
  if (age !== null) {
    if (age < 40) ageGroup = "young";
    else if (age <= 55) ageGroup = "mid";
    else if (age <= 65) ageGroup = "preretiree";
    else ageGroup = "retiree";
  }

  const ctx: RecommendationContext = { insurable, money, ageGroup, horizon, funding, earlyAccess };

  // One full recommendation block per selected goal. If no goal was selected, fall back to a
  // single general-purpose recommendation (matches the original tool's "goal skipped" behavior).
  const goalsToUse: (Goal | undefined)[] = goals.length > 0 ? goals : [undefined];
  const recommendations: GoalRecommendation[] = goalsToUse.map((g) => ({
    goal: g ?? null,
    goalLabel: g ? GOAL_LABELS[g] : "General Recommendation",
    ...computeRecommendation(g, ctx),
  }));

  const otherRetirement = inputs.otherRetirement !== "skip" ? inputs.otherRetirement : undefined;
  const otherAmount = inputs.otherAmount ?? "";
  const rollover = otherRetirement === "yes" ? buildRolloverRec(ageGroup, otherAmount) : null;

  return {
    name: inputs.name,
    phone: inputs.phone,
    email: inputs.email,
    age,
    dob: inputs.dob,
    existingCoverage: inputs.existingCoverage?.trim() || undefined,
    heightFt: inputs.heightFt,
    heightIn: inputs.heightIn,
    weight: inputs.weight,
    tobacco: inputs.tobacco !== "skip" ? inputs.tobacco : undefined,
    health: inputs.health !== "skip" ? inputs.health : undefined,
    declined: inputs.declined !== "skip" ? inputs.declined : undefined,
    money,
    funding,
    lumpSumAmount: inputs.lumpSumAmount?.trim() || undefined,
    monthlyBudget: inputs.monthlyBudget?.trim() || undefined,
    periodicAmount: inputs.periodicAmount?.trim() || undefined,
    income,
    debt,
    suggestedDB,
    suggestedReserveLow,
    suggestedReserveHigh,
    goals,
    horizon,
    risk: inputs.risk !== "skip" ? inputs.risk : undefined,
    earlyAccess,
    recommendations,
    hasRollover: otherRetirement === "yes",
    rolloverProduct: rollover?.product ?? null,
    rolloverReasons: rollover?.reasons ?? null,
  };
}
