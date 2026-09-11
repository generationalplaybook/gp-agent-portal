// Full Financial Analysis — ported logic-for-logic from the original GP Agent Portal's
// showFA()/calcCashFlow()/calcNetWorth()/calcDebt()/calcProtection()/updateFAScore() functions.
//
// The original tool only ever fully built six sections: Dashboard, Goals, Cash Flow, Net Worth,
// Debt, and Protection — Liquidity, Retirement, Education, Estate, Action Plan, and Client Report
// were left as "coming soon" placeholders (see the original HTML's fa-placeholder divs), and the
// overall score is deliberately divided by 6 pillars even though only 3 are scored today. We keep
// that exact behavior here rather than silently "fixing" it, since a from-scratch pillar isn't
// something we can port faithfully — it was never built in the source tool.

export interface FAProfile {
  clientName: string;
  spouseName: string;
  clientDob: string;
  spouseDob: string;
  dependents: number;
  location: string;
  analysisDate: string;
}

export interface FAAdvisor {
  advisorName: string;
  advisorTitle: string;
  advisorEmail: string;
  advisorPhone: string;
}

export interface FAGoals {
  goalsShort: string;
  goalsMedium: string;
  goalsLong: string;
}

export interface FACashFlowInputs {
  incomeClient: number;
  incomeSpouse: number;
  incomeOther: number;
  mortgage: number;
  utilities: number;
  food: number;
  auto: number;
  health: number;
  insurance: number;
  childcare: number;
  taxes: number;
  debtpay: number;
  lifestyle: number;
  savings: number;
  other: number;
}

export interface FANetWorthInputs {
  home: number;
  vehicles: number;
  investments: number;
  business: number;
  other: number;
}

export interface FADebtInputs {
  mortgageBal: number;
  mortgagePmt: number;
  autoBal: number;
  autoPmt: number;
  studentBal: number;
  studentPmt: number;
  ccBal: number;
  ccPmt: number;
  personalBal: number;
  personalPmt: number;
  otherBal: number;
  otherPmt: number;
  highRate: number;
}

export type YesNoUnsure = "no" | "yes" | "unsure";

export interface FAProtectionInputs {
  covClient: number;
  covSpouse: number;
  covGroup: number;
  years: number;
  finalExpense: number;
  eduPerDep: number;
  disability: YesNoUnsure;
  ltc: YesNoUnsure;
}

// The five pillars below (Liquidity, Retirement, Education, Estate, Action Plan) plus the Client
// Report were never built in the original source tool — see this file's header comment. Karina,
// 9/11, after being embarrassed mid-client-meeting when the wizard stopped at Protection: "that
// analysis is not fully complete. I have told you to complete it." Built the same way Protection
// already works — editable assumptions with sensible defaults, not hardcoded methodology — since
// this is a real tool used with real clients and every number here should be something an advisor
// can see and adjust, not a black box.
export interface FALiquidityInputs {
  // Cash/savings/money-market the household could actually get to without penalty — not
  // retirement accounts (those are the Retirement pillar) and not home equity.
  currentLiquidSavings: number;
  // Standard planning rule of thumb is 3-6 months of essential expenses; default to 6 (the more
  // conservative end) same as Protection defaults toward the safer assumption (10 years income
  // replacement). Editable — some households reasonably target less or more.
  targetMonths: number;
}

export interface FARetirementInputs {
  // Balance already saved specifically for retirement (401k, IRA, etc.) — kept separate from the
  // Net Worth tab's "Investments" field so an advisor isn't forced to double up one balance in two
  // places; see the note in computeFA below on how this feeds into total net worth.
  currentRetirementAssets: number;
  retirementAge: number;
  // % of today's income the household wants replaced in retirement — 70-80% is the commonly cited
  // range (lower than 100% since mortgage/childcare/retirement-savings itself typically shrink or
  // disappear by then); default 80, the more conservative/higher end.
  desiredIncomeReplacement: number;
  // Estimated monthly Social Security benefit, if known — reduces how much the portfolio itself
  // needs to cover. Defaults to 0 (unknown/not yet estimated) rather than guessing a number.
  estimatedSocialSecurity: number;
  // Expected annual growth rate on retirement assets between now and retirementAge, for a simple
  // compounding projection of the CURRENT balance only (see computeFA's own caveat: this does not
  // assume any future contributions, so it's a floor estimate, not a full projection).
  expectedReturn: number;
}

export interface FAEducationInputs {
  // What's already saved across all dependents (529s, UTMAs, etc.) combined.
  currentEducationSavings: number;
  // Projected total cost per dependent — defaults to the same $25,000 Protection already defaults
  // to for its own education-funding line, since that's the same rough per-child planning figure,
  // but kept independently editable here (this pillar is about funding progress, not insurance
  // need).
  costPerDependent: number;
}

export type YesNoUnsureField = YesNoUnsure;

export interface FAEstateInputs {
  hasWill: YesNoUnsureField;
  hasTrust: YesNoUnsureField;
  beneficiariesUpdated: YesNoUnsureField;
}

export interface FAState {
  profile: FAProfile;
  advisor: FAAdvisor;
  goals: FAGoals;
  cashflow: FACashFlowInputs;
  networth: FANetWorthInputs;
  debt: FADebtInputs;
  protection: FAProtectionInputs;
  liquidity: FALiquidityInputs;
  retirement: FARetirementInputs;
  education: FAEducationInputs;
  estate: FAEstateInputs;
}

export const EMPTY_FA_STATE: FAState = {
  profile: {
    clientName: "",
    spouseName: "",
    clientDob: "",
    spouseDob: "",
    dependents: 0,
    location: "",
    analysisDate: "",
  },
  advisor: {
    advisorName: "",
    advisorTitle: "",
    advisorEmail: "",
    advisorPhone: "",
  },
  goals: {
    goalsShort: "",
    goalsMedium: "",
    goalsLong: "",
  },
  cashflow: {
    incomeClient: 0,
    incomeSpouse: 0,
    incomeOther: 0,
    mortgage: 0,
    utilities: 0,
    food: 0,
    auto: 0,
    health: 0,
    insurance: 0,
    childcare: 0,
    taxes: 0,
    debtpay: 0,
    lifestyle: 0,
    savings: 0,
    other: 0,
  },
  networth: {
    home: 0,
    vehicles: 0,
    investments: 0,
    business: 0,
    other: 0,
  },
  debt: {
    mortgageBal: 0,
    mortgagePmt: 0,
    autoBal: 0,
    autoPmt: 0,
    studentBal: 0,
    studentPmt: 0,
    ccBal: 0,
    ccPmt: 0,
    personalBal: 0,
    personalPmt: 0,
    otherBal: 0,
    otherPmt: 0,
    highRate: 0,
  },
  protection: {
    covClient: 0,
    covSpouse: 0,
    covGroup: 0,
    years: 10,
    finalExpense: 15000,
    eduPerDep: 25000,
    disability: "no",
    ltc: "no",
  },
  liquidity: {
    currentLiquidSavings: 0,
    targetMonths: 6,
  },
  retirement: {
    currentRetirementAssets: 0,
    retirementAge: 65,
    desiredIncomeReplacement: 80,
    estimatedSocialSecurity: 0,
    expectedReturn: 6,
  },
  education: {
    currentEducationSavings: 0,
    costPerDependent: 25000,
  },
  estate: {
    hasWill: "no",
    hasTrust: "no",
    beneficiariesUpdated: "no",
  },
};

// 9/11: was whole-dollars-only (no cents, ever) — Karina, after a client meeting: "automatic
// dollar sign, automatic decimal and zero zero needs to be there automatic comma throughout the
// entire financial analysis." Every computed result row (Cash Flow, Net Worth, Debt, Protection,
// and the new pillars) renders through this one function, so forcing 2 decimals here is what
// makes that true everywhere in the FA tool at once — matches formatMoney()'s behavior
// (illustration.ts), used the same way for Illustrations/Scenarios/Products.
export function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface FACashFlowResult {
  totalIncome: number;
  essential: number;
  discSpend: number;
  savingsContrib: number;
  totalExpenses: number;
  discretionaryIncome: number;
  savingsRate: number;
  expenseRatio: number;
  pillarScore: number;
  negative: boolean;
}

export interface FANetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface FADebtResult {
  goodDebt: number;
  badDebt: number;
  totalBalance: number;
  totalPayment: number;
  dti: number;
  dtiHigh: boolean;
  badShare: number;
  interestCost: number;
  priorityItems: { name: string; bal: number }[];
  pillarScore: number;
}

export interface FAProtectionResult {
  totalCoverage: number;
  needIncome: number;
  needDebt: number;
  needFinal: number;
  needEducation: number;
  totalNeed: number;
  gap: number;
  warnings: string[];
  pillarScore: number;
}

export interface FALiquidityResult {
  targetReserve: number;
  gap: number;
  monthsCovered: number;
  pillarScore: number;
}

export interface FARetirementResult {
  currentAge: number | null;
  yearsToRetirement: number | null;
  desiredAnnualIncome: number;
  incomeGapAnnual: number;
  capitalNeeded: number;
  projectedAssetsAtRetirement: number;
  shortfall: number;
  pillarScore: number;
}

export interface FAEducationResult {
  totalCost: number;
  gap: number;
  pillarScore: number;
}

export interface FAEstateResult {
  // Married is inferred from whether a spouse's name was entered on the Profile tab — same signal
  // Protection already relies on implicitly (covSpouse only means something if there's a spouse).
  married: boolean;
  applicableExemption: number;
  taxableEstate: number;
  exposure: number;
  checklistScore: number;
  pillarScore: number;
}

export interface FAActionItem {
  pillar: string;
  message: string;
  // Lower = more urgent. Purely a sort key for display order — not shown to the client directly.
  priority: number;
}

export interface FAComputed {
  cashflow: FACashFlowResult;
  networth: FANetWorthResult;
  debt: FADebtResult;
  protection: FAProtectionResult;
  liquidity: FALiquidityResult;
  retirement: FARetirementResult;
  education: FAEducationResult;
  estate: FAEstateResult;
  actionPlan: FAActionItem[];
  overallScore: number;
}

// faLiquidReserves / faRetirementAssets in the original are populated by the Liquidity and
// Retirement pillars — neither of which was ever built (placeholders in the source tool), so they
// were always 0 there. Now that both pillars exist, they're wired from the advisor's own entries
// on those tabs (see computeFA below) instead of staying hardcoded at 0.

function calcAgeFromDob(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// 2026 federal estate tax exemption, per the One Big Beautiful Bill Act (made permanent, indexed
// for inflation going forward): $15,000,000 per individual, $30,000,000 per married couple — up
// from ~$13.99M/$27.98M in 2025. Source: irs.gov / widely reported (e.g. Kiplinger) coverage of
// the 2026 inflation adjustments, current as of this being written (9/11).
//
// IMPORTANT caveat surfaced in the UI, not just here: this is the FEDERAL threshold only. State
// estate/inheritance taxes vary enormously — several states apply their own tax at exemption
// levels as low as ~$1M, far below the federal number. A household can owe state estate tax while
// owing zero federal estate tax. This tool does not know which state's rules apply and does not
// attempt to model them.
const FEDERAL_ESTATE_EXEMPTION_INDIVIDUAL = 15_000_000;
const FEDERAL_ESTATE_EXEMPTION_MARRIED = 30_000_000;

export function computeFA(state: FAState): FAComputed {
  const cf = state.cashflow;
  const income = cf.incomeClient + cf.incomeSpouse + cf.incomeOther;
  const essential =
    cf.mortgage + cf.utilities + cf.food + cf.auto + cf.health + cf.insurance + cf.childcare + cf.taxes + cf.debtpay;
  const discSpend = cf.lifestyle + cf.other;
  const savingsContrib = cf.savings;
  const totalExpenses = essential + discSpend + savingsContrib;
  const discretionaryIncome = income - totalExpenses;
  const savingsRate = income > 0 ? (savingsContrib / income) * 100 : 0;
  const expenseRatio = income > 0 ? (totalExpenses / income) * 100 : 0;

  const savingsScore = Math.min(savingsRate / 15, 1) * 50;
  const surplusRatio = income > 0 ? (discretionaryIncome / income) * 100 : 0;
  const surplusScore = Math.min(Math.max(surplusRatio, 0) / 20, 1) * 50;
  const cfPillarScore = Math.round(savingsScore + surplusScore);

  const cashflow: FACashFlowResult = {
    totalIncome: income,
    essential,
    discSpend,
    savingsContrib,
    totalExpenses,
    discretionaryIncome,
    savingsRate,
    expenseRatio,
    pillarScore: cfPillarScore,
    negative: discretionaryIncome < 0,
  };

  const dt = state.debt;
  const goodDebt = dt.mortgageBal + dt.autoBal + dt.studentBal;
  const badDebt = dt.ccBal + dt.personalBal + dt.otherBal;
  const totalBalance = goodDebt + badDebt;
  const totalPayment = dt.mortgagePmt + dt.autoPmt + dt.studentPmt + dt.ccPmt + dt.personalPmt + dt.otherPmt;
  const dti = income > 0 ? (totalPayment / income) * 100 : 0;
  const badShare = totalBalance > 0 ? (badDebt / totalBalance) * 100 : 0;
  const interestCost = badDebt * (dt.highRate / 100);
  const priorityItems = [
    { name: "Credit cards", bal: dt.ccBal },
    { name: "Personal loans", bal: dt.personalBal },
    { name: "Other debt", bal: dt.otherBal },
  ]
    .filter((i) => i.bal > 0)
    .sort((a, b) => b.bal - a.bal);

  const dtiScore = income > 0 ? Math.min(Math.max(1 - (dti - 36) / 36, 0), 1) * 60 : 30;
  const shareScore = Math.min(Math.max(1 - (badShare - 20) / 60, 0), 1) * 40;
  const dtPillarScore = totalBalance > 0 ? Math.round(dtiScore + shareScore) : 100;

  const debt: FADebtResult = {
    goodDebt,
    badDebt,
    totalBalance,
    totalPayment,
    dti,
    dtiHigh: dti > 36,
    badShare,
    interestCost,
    priorityItems,
    pillarScore: dtPillarScore,
  };

  const nw = state.networth;
  const faRetirementAssets = state.retirement.currentRetirementAssets;
  const faLiquidReserves = state.liquidity.currentLiquidSavings;
  const totalAssets = nw.home + nw.vehicles + nw.investments + nw.business + nw.other + faRetirementAssets + faLiquidReserves;
  const totalLiabilities = totalBalance;
  const netWorth = totalAssets - totalLiabilities;
  const networth: FANetWorthResult = { totalAssets, totalLiabilities, netWorth };

  const pr = state.protection;
  const annualIncome = income * 12;
  const needIncome = annualIncome * pr.years;
  const needDebt = totalBalance;
  const needFinal = pr.finalExpense;
  const needEducation = state.profile.dependents * pr.eduPerDep;
  const totalNeed = needIncome + needDebt + needFinal + needEducation;
  const totalCoverage = pr.covClient + pr.covSpouse + pr.covGroup;
  const gap = totalNeed - totalCoverage;

  const warnings: string[] = [];
  if (pr.disability !== "yes") warnings.push("No confirmed disability insurance — income is unprotected if the client can't work.");
  if (pr.ltc !== "yes") warnings.push("No confirmed long-term care coverage.");

  const coverageRatio = totalNeed > 0 ? Math.min(totalCoverage / totalNeed, 1) : 1;
  const coverageScore = coverageRatio * 80;
  const bonusScore = (pr.disability === "yes" ? 10 : 0) + (pr.ltc === "yes" ? 10 : 0);
  const prPillarScore = Math.round(coverageScore + bonusScore);

  const protection: FAProtectionResult = {
    totalCoverage,
    needIncome,
    needDebt,
    needFinal,
    needEducation,
    totalNeed,
    gap,
    warnings,
    pillarScore: prPillarScore,
  };

  // Liquidity — standard 3-6-months-of-essential-expenses emergency fund rule. essential is
  // already a MONTHLY figure (see cashflow above), so targetMonths multiplies directly.
  const liq = state.liquidity;
  const targetReserve = essential * liq.targetMonths;
  const liquidityGap = targetReserve - liq.currentLiquidSavings;
  const monthsCovered = essential > 0 ? liq.currentLiquidSavings / essential : liq.currentLiquidSavings > 0 ? liq.targetMonths : 0;
  const liqPillarScore = targetReserve > 0 ? Math.round(Math.min(liq.currentLiquidSavings / targetReserve, 1) * 100) : 100;
  const liquidity: FALiquidityResult = {
    targetReserve,
    gap: liquidityGap,
    monthsCovered,
    pillarScore: liqPillarScore,
  };

  // Retirement — capital-needs analysis using the 4%-rule / 25x-multiplier: whatever annual
  // income gap Social Security doesn't cover needs a portfolio of ~25x that gap to sustainably
  // support a 4%/year withdrawal rate. Current retirement assets are projected forward with
  // simple compounding ONLY (no assumed future contributions) — a deliberately conservative floor
  // estimate, not a full projection, since assuming a specific future savings rate on the
  // client's behalf isn't this tool's call to make.
  const ret = state.retirement;
  const currentAge = calcAgeFromDob(state.profile.clientDob);
  const yearsToRetirement = currentAge !== null ? Math.max(0, ret.retirementAge - currentAge) : null;
  const desiredAnnualIncome = annualIncome * (ret.desiredIncomeReplacement / 100);
  const incomeGapAnnual = Math.max(0, desiredAnnualIncome - ret.estimatedSocialSecurity * 12);
  const capitalNeeded = incomeGapAnnual * 25;
  const projectedAssetsAtRetirement =
    yearsToRetirement !== null ? ret.currentRetirementAssets * Math.pow(1 + ret.expectedReturn / 100, yearsToRetirement) : ret.currentRetirementAssets;
  const retirementShortfall = capitalNeeded - projectedAssetsAtRetirement;
  const retPillarScore = capitalNeeded > 0 ? Math.round(Math.min(Math.max(projectedAssetsAtRetirement / capitalNeeded, 0), 1) * 100) : 100;
  const retirement: FARetirementResult = {
    currentAge,
    yearsToRetirement,
    desiredAnnualIncome,
    incomeGapAnnual,
    capitalNeeded,
    projectedAssetsAtRetirement,
    shortfall: retirementShortfall,
    pillarScore: retPillarScore,
  };

  // Education — aggregate cost-per-dependent funding progress (529s/UTMAs/etc. saved so far vs.
  // projected total cost across every dependent). Distinct from Protection's own education line,
  // which is about insurance NEED (what a death benefit should cover) rather than funding already
  // in progress.
  const edu = state.education;
  const eduTotalCost = state.profile.dependents * edu.costPerDependent;
  const eduGap = eduTotalCost - edu.currentEducationSavings;
  const eduPillarScore = eduTotalCost > 0 ? Math.round(Math.min(edu.currentEducationSavings / eduTotalCost, 1) * 100) : 100;
  const education: FAEducationResult = {
    totalCost: eduTotalCost,
    gap: eduGap,
    pillarScore: eduPillarScore,
  };

  // Estate — federal exemption checklist + exposure check. married is inferred from whether a
  // spouse's name was entered on Profile (same implicit signal Protection already relies on for
  // covSpouse). See FEDERAL_ESTATE_EXEMPTION_* above for the state-tax caveat this doesn't model.
  const est = state.estate;
  const married = state.profile.spouseName.trim().length > 0;
  const applicableExemption = married ? FEDERAL_ESTATE_EXEMPTION_MARRIED : FEDERAL_ESTATE_EXEMPTION_INDIVIDUAL;
  const taxableEstate = Math.max(0, netWorth);
  const estateExposure = Math.max(0, taxableEstate - applicableExemption);
  const checklistScore =
    (est.hasWill === "yes" ? 40 : 0) + (est.hasTrust === "yes" ? 30 : 0) + (est.beneficiariesUpdated === "yes" ? 30 : 0);
  const estatePillarScore = estateExposure > 0 ? Math.round(checklistScore * 0.7) : checklistScore;
  const estate: FAEstateResult = {
    married,
    applicableExemption,
    taxableEstate,
    exposure: estateExposure,
    checklistScore,
    pillarScore: estatePillarScore,
  };

  // Action Plan — synthesized, not a data-entry tab: one prioritized punch list pulled from every
  // pillar's own gaps, sorted most-urgent first. "Every number in this analysis exists to serve a
  // goal" (Karina's own words on the Goals tab) — this is where the numbers turn into next steps.
  const actionPlan: FAActionItem[] = [];
  if (cashflow.negative) {
    actionPlan.push({ pillar: "Cash Flow", message: "Spending exceeds income — address the shortfall before funding new goals.", priority: 0 });
  }
  if (liquidityGap > 0) {
    actionPlan.push({
      pillar: "Liquidity",
      message: `Build emergency reserves — ${fmt(liquidityGap)} short of a ${liq.targetMonths}-month cushion.`,
      priority: 1,
    });
  }
  if (protection.gap > 0) {
    actionPlan.push({ pillar: "Protection", message: `Life insurance coverage gap of ${fmt(protection.gap)}.`, priority: 1 });
  }
  if (debt.badDebt > 0 && debt.badShare > 20) {
    actionPlan.push({
      pillar: "Debt",
      message: `High-cost consumer debt is ${debt.badShare.toFixed(0)}% of total balances — prioritize payoff.`,
      priority: 2,
    });
  }
  if (retirementShortfall > 0) {
    actionPlan.push({
      pillar: "Retirement",
      message: `Projected retirement shortfall of ${fmt(retirementShortfall)} at current savings/growth assumptions.`,
      priority: 2,
    });
  }
  if (eduGap > 0 && state.profile.dependents > 0) {
    actionPlan.push({ pillar: "Education", message: `Education funding gap of ${fmt(eduGap)} across ${state.profile.dependents} dependent(s).`, priority: 3 });
  }
  if (estateExposure > 0) {
    actionPlan.push({
      pillar: "Estate",
      message: `Taxable estate exceeds the federal exemption by ${fmt(estateExposure)} — coordinate with an estate attorney/CPA.`,
      priority: 1,
    });
  }
  if (est.hasWill !== "yes") actionPlan.push({ pillar: "Estate", message: "No confirmed will on file.", priority: 3 });
  if (est.beneficiariesUpdated !== "yes") actionPlan.push({ pillar: "Estate", message: "Beneficiary designations not confirmed as up to date.", priority: 3 });
  if (protection.warnings.length) {
    protection.warnings.forEach((w) => actionPlan.push({ pillar: "Protection", message: w, priority: 3 }));
  }
  actionPlan.sort((a, b) => a.priority - b.priority);

  // Overall score — the original tool divided by 6 even though only 3 pillars (Cash Flow, Debt,
  // Protection) were ever scored, deliberately preserved elsewhere in this file as "don't silently
  // reinterpret what already shipped." Now that Liquidity, Retirement, and Education/Estate are
  // real, scored pillars too (7 total — Action Plan is synthesized, not separately scored), this
  // divides by 7 instead of continuing to divide by the old placeholder count of 6.
  const overallScore = Math.round(
    (cfPillarScore + dtPillarScore + prPillarScore + liqPillarScore + retPillarScore + eduPillarScore + estatePillarScore) / 7
  );

  return { cashflow, networth, debt, protection, liquidity, retirement, education, estate, actionPlan, overallScore };
}
