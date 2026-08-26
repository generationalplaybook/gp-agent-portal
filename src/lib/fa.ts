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

export interface FAState {
  profile: FAProfile;
  advisor: FAAdvisor;
  goals: FAGoals;
  cashflow: FACashFlowInputs;
  networth: FANetWorthInputs;
  debt: FADebtInputs;
  protection: FAProtectionInputs;
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
};

export function fmt(n: number): string {
  const rounded = Math.round(n);
  return "$" + rounded.toLocaleString();
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

export interface FAComputed {
  cashflow: FACashFlowResult;
  networth: FANetWorthResult;
  debt: FADebtResult;
  protection: FAProtectionResult;
  overallScore: number;
}

// faLiquidReserves / faRetirementAssets in the original are populated by the Liquidity and
// Retirement pillars — neither of which was ever built (placeholders in the source tool), so
// they're always 0 here, same as they always were in the original before those parts shipped.
const FA_LIQUID_RESERVES = 0;
const FA_RETIREMENT_ASSETS = 0;

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
  const totalAssets = nw.home + nw.vehicles + nw.investments + nw.business + nw.other + FA_RETIREMENT_ASSETS + FA_LIQUID_RESERVES;
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

  const overallScore = Math.round((cfPillarScore + dtPillarScore + prPillarScore) / 6);

  return { cashflow, networth, debt, protection, overallScore };
}
