"use client";

import { useMemo, useState } from "react";
import {
  computeFA,
  fmt,
  EMPTY_FA_STATE,
  type FAState,
  type FAProfile,
  type FAGoals,
  type FACashFlowInputs,
  type FANetWorthInputs,
  type FADebtInputs,
  type FAProtectionInputs,
} from "@/lib/fa";
import { savePublicFinancialAnalysis } from "./actions";
import DollarInput from "@/app/(app)/clients/[id]/DollarInput";
import { parseMoney } from "@/lib/illustration";

// Client-facing counterpart to the advisor's Full Financial Analysis tool
// (clients/[id]/financial-analysis/FAClient.tsx) — same underlying data (FAState) and math
// (computeFA), reached via a public per-client link instead of a login. Deliberately a separate
// component rather than a shared one: the advisor tool edits an "Advisor on this case" panel and
// exposes placeholder tabs (Liquidity, Retirement, Client Report PDF, ...) that only make sense
// internally, and this one needs a save control that's visible no matter which tab you're on
// (the advisor version's Save button only lives on its Dashboard tab). Karina, 9/9: "can we
// generate a link to send out for the financial needs analysis" — same self-service pattern as
// the Medical Report link: the client fills this out themselves, on their own time, and it lands
// right on their profile for the advisor to pick up.
type Tab = "info" | "goals" | "cashflow" | "networth" | "debt" | "protection";

const TABS: { value: Tab; label: string }[] = [
  { value: "info", label: "Your Info" },
  { value: "goals", label: "Goals & Dreams" },
  { value: "cashflow", label: "I · Cash Flow" },
  { value: "networth", label: "Net Worth" },
  { value: "debt", label: "II · Debt" },
  { value: "protection", label: "III · Protection" },
];

// 9/11: was a native type="number" input — Karina, after a client meeting: scrolling the mouse
// wheel over the field silently changed the value, and dollar amounts showed no $, commas, or
// cents. Converged on the same dollar/percent NumberField as the advisor's FAClient.tsx: "dollar"
// wraps DollarInput (fixes both formatting and the scroll-wheel bug), "percent" is a plain
// text/decimal input (also scroll-bug-free, just no $).
// 9/11, second pass: matches the identical fix in the advisor tool's FAClient.tsx — a field like
// "Years of income to replace" isn't money, and was defaulting to the "dollar" variant along with
// everything else in the original currency-formatting fix. Added a "count" variant: plain
// whole-number text input, no $ sign, no forced decimals, still none of the native-number-input
// scroll-wheel bug.
function NumberField({
  label,
  value,
  onChange,
  variant = "dollar",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  variant?: "dollar" | "percent" | "count";
}) {
  const inputClass = "w-32 rounded-md border border-[#D9CFBA] py-1 text-right text-sm outline-none focus:border-[#1C1C1C]";
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <label className="text-xs text-[#555]">{label}</label>
      {variant === "percent" ? (
        <div className="relative w-32">
          <input
            type="text"
            inputMode="decimal"
            value={String(value)}
            onChange={(e) => {
              const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
              onChange(isNaN(n) ? 0 : n);
            }}
            className={inputClass.replace("py-1", "py-1 pr-6 pl-2")}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[#707070]">%</span>
        </div>
      ) : variant === "count" ? (
        <input
          type="text"
          inputMode="numeric"
          value={String(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
            onChange(isNaN(n) ? 0 : n);
          }}
          className={inputClass.replace("py-1", "py-1 px-2")}
        />
      ) : (
        // pr-3 added 9/11 — matches the identical fix in the advisor tool's FAClient.tsx: the
        // right-aligned "0.00" had no right padding and sat flush against the border.
        <DollarInput
          value={String(value)}
          onChange={(v) => onChange(parseMoney(v))}
          className={inputClass + " pr-3"}
        />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      <label className="text-xs text-[#555]">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
      />
    </div>
  );
}

function ResultRow({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-[#555]">{label}</span>
      <span className={`font-semibold ${negative ? "text-[#8B1A1A]" : "text-[#1E6B3C]"}`}>{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-md bg-[#F5F0E8] px-3 py-2 text-sm font-semibold text-[#1C1C1C]">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Panel({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-5">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#707070]">{label}</div>
      <div className="mb-3 text-sm font-semibold text-[#1C1C1C]">{title}</div>
      {children}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  pillarScore,
}: {
  title: string;
  subtitle: string;
  pillarScore?: number;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <div className="font-serif text-xl text-[#1C1C1C]">{title}</div>
        <div className="mt-1 max-w-2xl text-sm text-[#666]">{subtitle}</div>
      </div>
      {pillarScore !== undefined && (
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#707070]">Pillar Score</div>
          <div className="font-serif text-2xl text-[#1C1C1C]">{pillarScore}</div>
        </div>
      )}
    </div>
  );
}

export default function PublicFAClient({
  token,
  clientName,
  clientDob,
  savedState,
  advisorName,
  advisorEmail,
  advisorPhone,
}: {
  token: string;
  clientName: string;
  clientDob: string | null;
  savedState: FAState | null;
  advisorName?: string;
  advisorEmail?: string;
  advisorPhone?: string;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [state, setState] = useState<FAState>(() => {
    // 9/11: backfill any pillar keys a plan saved before Liquidity/Retirement/Education/Estate
    // existed won't have — this form never edits those pillars, but computeFA() now always reads
    // them, so a plan missing those keys would otherwise crash this page. Same fix as FAClient.tsx.
    if (savedState) return { ...EMPTY_FA_STATE, ...savedState };
    return {
      ...EMPTY_FA_STATE,
      profile: {
        ...EMPTY_FA_STATE.profile,
        clientName,
        clientDob: clientDob ?? "",
        analysisDate: new Date().toISOString().split("T")[0],
      },
      advisor: {
        ...EMPTY_FA_STATE.advisor,
        advisorName: advisorName ?? "",
        advisorEmail: advisorEmail ?? "",
        advisorPhone: advisorPhone ?? "",
      },
    };
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  const computed = useMemo(() => computeFA(state), [state]);

  function updateProfile<K extends keyof FAProfile>(key: K, value: FAProfile[K]) {
    setState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));
  }
  function updateGoals<K extends keyof FAGoals>(key: K, value: FAGoals[K]) {
    setState((s) => ({ ...s, goals: { ...s.goals, [key]: value } }));
  }
  function updateCashflow<K extends keyof FACashFlowInputs>(key: K, value: number) {
    setState((s) => ({ ...s, cashflow: { ...s.cashflow, [key]: value } }));
  }
  function updateNetworth<K extends keyof FANetWorthInputs>(key: K, value: number) {
    setState((s) => ({ ...s, networth: { ...s.networth, [key]: value } }));
  }
  function updateDebt<K extends keyof FADebtInputs>(key: K, value: number) {
    setState((s) => ({ ...s, debt: { ...s.debt, [key]: value } }));
  }
  function updateProtection<K extends keyof FAProtectionInputs>(key: K, value: FAProtectionInputs[K]) {
    setState((s) => ({ ...s, protection: { ...s.protection, [key]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      const res = await savePublicFinancialAnalysis(token, state);
      if (res.ok) {
        setSaveMsg("Saved — thank you!");
        setTimeout(() => setSaveMsg(""), 4000);
      } else {
        setSaveError(res.error);
      }
    } catch {
      setSaveError("Something went wrong saving this — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl text-[#1C1C1C]">Financial Needs Analysis</h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-[#666]">
          For {clientName} — prepared with {advisorName ?? "your advisor"}. Work through each section below at your
          own pace; you can save partway through and come back anytime using this same link.
        </p>
      </div>

      {/* Save control lives up here, outside the tabs, so it's reachable no matter which section
          you're on — unlike the advisor tool's own Save button, which only lives on its first tab. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9CFBA] bg-white px-4 py-3">
        <div className="text-xs text-[#666]">Financial Wellness Score: <span className="font-semibold text-[#1C1C1C]">{computed.overallScore} / 100</span></div>
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-xs font-semibold text-[#1E6B3C]">{saveMsg}</span>}
          {saveError && <span className="text-xs font-semibold text-[#8B1A1A]">{saveError}</span>}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save My Answers"}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.value ? "bg-[#1C1C1C] text-[#FAF8F4]" : "bg-[#F5F0E8] text-[#555] hover:bg-[#EDE8DF]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div>
          <SectionHeader
            title="About You"
            subtitle="A little background so your advisor can put the rest of this in context."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Profile" title="Your information">
              <TextField label="Your name" value={state.profile.clientName} onChange={(v) => updateProfile("clientName", v)} />
              <TextField label="Spouse / partner" value={state.profile.spouseName} onChange={(v) => updateProfile("spouseName", v)} placeholder="Optional" />
              <TextField label="Your date of birth" type="date" value={state.profile.clientDob} onChange={(v) => updateProfile("clientDob", v)} />
              <TextField label="Spouse date of birth" type="date" value={state.profile.spouseDob} onChange={(v) => updateProfile("spouseDob", v)} />
              <div className="flex items-center justify-between gap-2 py-1.5">
                <label className="text-xs text-[#555]">Dependents</label>
                <input
                  type="number"
                  value={state.profile.dependents}
                  onChange={(e) => updateProfile("dependents", parseInt(e.target.value, 10) || 0)}
                  className="w-32 rounded-md border border-[#D9CFBA] px-2 py-1 text-right text-sm outline-none focus:border-[#1C1C1C]"
                />
              </div>
              <TextField label="State" value={state.profile.location} onChange={(v) => updateProfile("location", v)} placeholder="State" />
            </Panel>
            {(advisorName || advisorEmail || advisorPhone) && (
              <Panel label="Advisor" title="Your advisor on this analysis">
                {advisorName && <p className="text-sm text-[#2E2E2E]">{advisorName}</p>}
                {advisorEmail && <p className="mt-1 text-xs text-[#707070]">{advisorEmail}</p>}
                {advisorPhone && <p className="mt-1 text-xs text-[#707070]">{advisorPhone}</p>}
                <p className="mt-3 text-[11px] text-[#707070]">
                  Questions about anything below? Reach out anytime — nothing here is final until you talk it
                  through together.
                </p>
              </Panel>
            )}
          </div>
        </div>
      )}

      {tab === "goals" && (
        <div>
          <SectionHeader
            title="Goals & Dreams"
            subtitle="Every number in this analysis exists to serve a goal. Tell us what you're working toward."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Panel label="1–3 Years" title="Short Term">
              <textarea
                value={state.goals.goalsShort}
                onChange={(e) => updateGoals("goalsShort", e.target.value)}
                placeholder="What are you working toward?"
                rows={6}
                className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </Panel>
            {/* 9/11 — matches the advisor tool's rename: "Medium Term" → "Mid-Term". */}
            <Panel label="3–7 Years" title="Mid-Term">
              <textarea
                value={state.goals.goalsMedium}
                onChange={(e) => updateGoals("goalsMedium", e.target.value)}
                placeholder="What are you working toward?"
                rows={6}
                className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </Panel>
            <Panel label="7+ Years" title="Long Term">
              <textarea
                value={state.goals.goalsLong}
                onChange={(e) => updateGoals("goalsLong", e.target.value)}
                placeholder="What are you working toward?"
                rows={6}
                className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </Panel>
          </div>
        </div>
      )}

      {tab === "cashflow" && (
        <div>
          <SectionHeader
            title="Cash Flow & Budget"
            subtitle="Money in, money out, and what's left. Non-discretionary expenses are the 'needs'; discretionary spending is the 'wants' that can flex in an emergency."
            pillarScore={computed.cashflow.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Inflows" title="Monthly income">
              <NumberField label="Your income" value={state.cashflow.incomeClient} onChange={(v) => updateCashflow("incomeClient", v)} />
              <NumberField label="Spouse income" value={state.cashflow.incomeSpouse} onChange={(v) => updateCashflow("incomeSpouse", v)} />
              <NumberField label="Other income" value={state.cashflow.incomeOther} onChange={(v) => updateCashflow("incomeOther", v)} />
              <TotalRow label="Total household income" value={fmt(computed.cashflow.totalIncome) + " / mo"} />
              <div className="mt-4">
                <ResultRow
                  label="Discretionary income (income − all expenses)"
                  value={fmt(computed.cashflow.discretionaryIncome) + " / mo"}
                  negative={computed.cashflow.negative}
                />
                <ResultRow label="Non-discretionary (essential) expenses" value={fmt(computed.cashflow.essential) + " / mo"} />
                <ResultRow label="Discretionary spending (lifestyle + other)" value={fmt(computed.cashflow.discSpend) + " / mo"} />
                <ResultRow label="Savings rate" value={computed.cashflow.savingsRate.toFixed(1) + "%"} />
                <ResultRow label="Expense-to-income ratio" value={computed.cashflow.expenseRatio.toFixed(1) + "%"} />
              </div>
            </Panel>
            <Panel label="Outflows" title="Monthly budget">
              <NumberField label="Mortgage or rent" value={state.cashflow.mortgage} onChange={(v) => updateCashflow("mortgage", v)} />
              <NumberField label="Utilities" value={state.cashflow.utilities} onChange={(v) => updateCashflow("utilities", v)} />
              <NumberField label="Food" value={state.cashflow.food} onChange={(v) => updateCashflow("food", v)} />
              <NumberField label="Auto & transportation" value={state.cashflow.auto} onChange={(v) => updateCashflow("auto", v)} />
              <NumberField label="Health / medical" value={state.cashflow.health} onChange={(v) => updateCashflow("health", v)} />
              <NumberField label="Insurance premiums" value={state.cashflow.insurance} onChange={(v) => updateCashflow("insurance", v)} />
              <NumberField label="Childcare & education" value={state.cashflow.childcare} onChange={(v) => updateCashflow("childcare", v)} />
              <NumberField label="Estimated taxes" value={state.cashflow.taxes} onChange={(v) => updateCashflow("taxes", v)} />
              <NumberField label="Debt payments (non-mortgage)" value={state.cashflow.debtpay} onChange={(v) => updateCashflow("debtpay", v)} />
              <NumberField label="Lifestyle & entertainment" value={state.cashflow.lifestyle} onChange={(v) => updateCashflow("lifestyle", v)} />
              <NumberField label="Savings contributions" value={state.cashflow.savings} onChange={(v) => updateCashflow("savings", v)} />
              <NumberField label="Other expenses" value={state.cashflow.other} onChange={(v) => updateCashflow("other", v)} />
              <TotalRow label="Total monthly expenses" value={fmt(computed.cashflow.totalExpenses)} />
            </Panel>
          </div>
        </div>
      )}

      {tab === "networth" && (
        <div>
          <SectionHeader
            title="Net Worth"
            subtitle="Everything you own minus everything you owe."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Owned" title="Assets">
              <NumberField label="Home / real estate" value={state.networth.home} onChange={(v) => updateNetworth("home", v)} />
              <NumberField label="Vehicles" value={state.networth.vehicles} onChange={(v) => updateNetworth("vehicles", v)} />
              <NumberField label="Investments (non-retirement)" value={state.networth.investments} onChange={(v) => updateNetworth("investments", v)} />
              <NumberField label="Business interests" value={state.networth.business} onChange={(v) => updateNetworth("business", v)} />
              <div className="-mt-1 mb-1 text-[10px] italic text-[#707070]">The value of your ownership stake in a business you own or co-own — equity, not revenue.</div>
              <NumberField label="Other assets" value={state.networth.other} onChange={(v) => updateNetworth("other", v)} />
              <TotalRow label="Total assets" value={fmt(computed.networth.totalAssets)} />
            </Panel>
            <Panel label="Owed" title="Liabilities & result">
              <TotalRow label="Total liabilities" value={fmt(computed.networth.totalLiabilities)} />
              <div className="mt-6 rounded-md bg-[#F5F0E8] p-4 text-center">
                <div
                  className="font-serif text-3xl"
                  style={{ color: computed.networth.netWorth < 0 ? "#8B1A1A" : "#1C1C1C" }}
                >
                  {fmt(computed.networth.netWorth)}
                </div>
                <div className="mt-1 text-xs text-[#707070]">net worth</div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "debt" && (
        <div>
          <SectionHeader
            title="Debt"
            subtitle="Not all debt is equal — mortgage and student loans build equity or earning power at low cost, while credit cards and personal loans cost more with no upside."
            pillarScore={computed.debt.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Owed" title="Balances & monthly payments">
              <NumberField label="Mortgage balance" value={state.debt.mortgageBal} onChange={(v) => updateDebt("mortgageBal", v)} />
              <NumberField label="Mortgage monthly payment" value={state.debt.mortgagePmt} onChange={(v) => updateDebt("mortgagePmt", v)} />
              <NumberField label="Auto loan balance" value={state.debt.autoBal} onChange={(v) => updateDebt("autoBal", v)} />
              <NumberField label="Auto monthly payment" value={state.debt.autoPmt} onChange={(v) => updateDebt("autoPmt", v)} />
              <NumberField label="Student loan balance" value={state.debt.studentBal} onChange={(v) => updateDebt("studentBal", v)} />
              <NumberField label="Student loan monthly payment" value={state.debt.studentPmt} onChange={(v) => updateDebt("studentPmt", v)} />
              <NumberField label="Credit card balance" value={state.debt.ccBal} onChange={(v) => updateDebt("ccBal", v)} />
              <NumberField label="Credit card monthly payment" value={state.debt.ccPmt} onChange={(v) => updateDebt("ccPmt", v)} />
              <NumberField label="Personal loan balance" value={state.debt.personalBal} onChange={(v) => updateDebt("personalBal", v)} />
              <NumberField label="Personal loan monthly payment" value={state.debt.personalPmt} onChange={(v) => updateDebt("personalPmt", v)} />
              <NumberField label="Other debt balance" value={state.debt.otherBal} onChange={(v) => updateDebt("otherBal", v)} />
              <NumberField label="Other monthly payment" value={state.debt.otherPmt} onChange={(v) => updateDebt("otherPmt", v)} />
              <TotalRow label="Total debt balance" value={fmt(computed.debt.totalBalance)} />
              <TotalRow label="Total monthly debt payments" value={fmt(computed.debt.totalPayment) + " / mo"} />
            </Panel>
            <Panel label="Cost" title="Debt health">
              <NumberField label="Avg. rate on cards / personal loans (%)" value={state.debt.highRate} variant="percent" onChange={(v) => updateDebt("highRate", v)} />
              <div className="mt-4">
                <ResultRow label="Debt-to-income ratio (monthly)" value={computed.debt.dti.toFixed(1) + "%"} negative={computed.debt.dtiHigh} />
              </div>
              <p className="mt-4 text-[11px] text-[#707070]">
                Debt-to-income compares total monthly debt payments to total household income. Under 36% is
                generally considered healthy.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "protection" && (
        <div>
          <SectionHeader
            title="Protection"
            subtitle="If the primary income earner were gone tomorrow, would the household have enough to replace lost income, clear debt, and fund the goals already on the table? This is the heart of a financial needs analysis."
            pillarScore={computed.protection.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="In Force" title="Current coverage">
              <NumberField label="Your face amount" value={state.protection.covClient} onChange={(v) => updateProtection("covClient", v)} />
              <NumberField label="Spouse's face amount" value={state.protection.covSpouse} onChange={(v) => updateProtection("covSpouse", v)} />
              <NumberField label="Employer / group coverage" value={state.protection.covGroup} onChange={(v) => updateProtection("covGroup", v)} />
              <TotalRow label="Total current coverage" value={fmt(computed.protection.totalCoverage)} />

              <div className="mt-5 flex flex-col gap-2">
                <label className="flex items-center justify-between text-xs text-[#555]">
                  Do you have disability insurance?
                  <select
                    value={state.protection.disability}
                    onChange={(e) => updateProtection("disability", e.target.value as "no" | "yes" | "unsure")}
                    className="rounded-md border border-[#D9CFBA] px-2 py-1 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unsure">Unsure</option>
                  </select>
                </label>
                <label className="flex items-center justify-between text-xs text-[#555]">
                  Do you have long-term care coverage?
                  <select
                    value={state.protection.ltc}
                    onChange={(e) => updateProtection("ltc", e.target.value as "no" | "yes" | "unsure")}
                    className="rounded-md border border-[#D9CFBA] px-2 py-1 text-sm"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="unsure">Unsure</option>
                  </select>
                </label>
              </div>
            </Panel>
            <Panel label="Needed" title="Coverage need & gap">
              <NumberField label="Years of income to replace" variant="count" value={state.protection.years} onChange={(v) => updateProtection("years", v)} />
              <NumberField label="Final expense allowance" value={state.protection.finalExpense} onChange={(v) => updateProtection("finalExpense", v)} />
              <NumberField label="Education fund per dependent" value={state.protection.eduPerDep} onChange={(v) => updateProtection("eduPerDep", v)} />
              <div className="mt-4">
                <ResultRow label="Income replacement need" value={fmt(computed.protection.needIncome)} />
                <ResultRow label="Debt payoff need" value={fmt(computed.protection.needDebt)} />
                <ResultRow label="Final expenses" value={fmt(computed.protection.needFinal)} />
                <ResultRow label="Education funding" value={fmt(computed.protection.needEducation)} />
              </div>
              <TotalRow label="Total coverage need" value={fmt(computed.protection.totalNeed)} />
              <div className="mt-2 flex items-center justify-between rounded-md border-[1.5px] border-[#D9CFBA] px-3 py-2 text-sm font-semibold">
                <span>Coverage gap (need − current)</span>
                <span style={{ color: computed.protection.gap > 0 ? "#8B1A1A" : "#1E6B3C" }}>
                  {computed.protection.gap > 0
                    ? fmt(computed.protection.gap)
                    : "Fully covered (+" + fmt(Math.abs(computed.protection.gap)) + ")"}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#707070]">
                Income, dependents, and debt totals pull automatically from the Cash Flow and Debt sections above.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {/* 9/11 — matches the advisor tool's Next/Back buttons (Karina: going up to click the next
          tab isn't intuitive), same idea here since this is the client's own self-serve version. */}
      {(() => {
        const idx = TABS.findIndex((t) => t.value === tab);
        const prevTab = idx > 0 ? TABS[idx - 1] : null;
        const nextTab = idx >= 0 && idx < TABS.length - 1 ? TABS[idx + 1] : null;
        function go(t: Tab) {
          setTab(t);
          if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return (
          <div className="mt-6 flex items-center justify-between border-t border-[#EDE8DF] pt-4">
            <button
              type="button"
              onClick={() => prevTab && go(prevTab.value)}
              disabled={!prevTab}
              className="rounded-md border border-[#D9CFBA] px-4 py-2 text-sm font-semibold text-[#2E2E2E] hover:border-[#1C1C1C] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Back{prevTab ? `: ${prevTab.label}` : ""}
            </button>
            {nextTab ? (
              <button
                type="button"
                onClick={() => go(nextTab.value)}
                className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
              >
                Next: {nextTab.label} →
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-md bg-[#1C1C1C] px-6 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save My Answers"}
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
