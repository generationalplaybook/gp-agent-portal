"use client";

import { useMemo, useState } from "react";
import {
  computeFA,
  fmt,
  EMPTY_FA_STATE,
  type FAState,
  type FAProfile,
  type FAAdvisor,
  type FAGoals,
  type FACashFlowInputs,
  type FANetWorthInputs,
  type FADebtInputs,
  type FAProtectionInputs,
} from "@/lib/fa";
import { saveFinancialPlan } from "./actions";

type Tab =
  | "dashboard"
  | "goals"
  | "cashflow"
  | "networth"
  | "debt"
  | "protection"
  | "liquidity"
  | "retirement"
  | "education"
  | "estate"
  | "actionplan"
  | "report";

const PRIMARY_TABS: { value: Tab; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "goals", label: "Goals & Dreams" },
  { value: "cashflow", label: "I · Cash Flow" },
  { value: "networth", label: "Net Worth" },
  { value: "debt", label: "II · Debt" },
  { value: "protection", label: "III · Protection" },
];

const SECONDARY_TABS: { value: Tab; label: string; placeholder: string }[] = [
  { value: "liquidity", label: "IV · Liquidity", placeholder: "Emergency Fund Analysis" },
  { value: "retirement", label: "V · Retirement", placeholder: "Asset Accumulation & Retirement" },
  { value: "education", label: "Education", placeholder: "Education Funding" },
  { value: "estate", label: "VI · Estate", placeholder: "Estate Preservation & Legacy" },
  { value: "actionplan", label: "Action Plan", placeholder: "Action Plan" },
  { value: "report", label: "Client Report", placeholder: "Client Report PDF" },
];

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <label className="text-xs text-[#555]">{label}</label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-32 rounded-md border border-[#D9CFBA] px-2 py-1 text-right text-sm outline-none focus:border-[#1C1C1C]"
      />
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
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#999]">{label}</div>
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
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">Pillar Score</div>
          <div className="font-serif text-2xl text-[#1C1C1C]">{pillarScore}</div>
        </div>
      )}
    </div>
  );
}

export default function FAClient({
  clientId,
  clientName,
  clientDob,
  savedState,
  advisorName,
  advisorEmail,
  advisorPhone,
}: {
  clientId: string;
  clientName: string;
  clientDob: string | null;
  savedState: FAState | null;
  advisorName?: string;
  advisorEmail?: string;
  advisorPhone?: string;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<FAState>(() => {
    if (savedState) return savedState;
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

  const computed = useMemo(() => computeFA(state), [state]);

  function updateProfile<K extends keyof FAProfile>(key: K, value: FAProfile[K]) {
    setState((s) => ({ ...s, profile: { ...s.profile, [key]: value } }));
  }
  function updateAdvisor<K extends keyof FAAdvisor>(key: K, value: FAAdvisor[K]) {
    setState((s) => ({ ...s, advisor: { ...s.advisor, [key]: value } }));
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
    try {
      await saveFinancialPlan(clientId, state);
      setSaveMsg("Saved ✓ " + (state.profile.clientName || "Unnamed client"));
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const allTabs = [...PRIMARY_TABS, ...SECONDARY_TABS];
  const activeLabel = allTabs.find((t) => t.value === tab)?.label ?? "";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-[#1C1C1C]">Full Financial Analysis</h1>
          <a href={`/clients/${clientId}`} className="text-xs text-[#666] underline hover:text-[#1C1C1C]">
            ← Back to {clientName}&rsquo;s profile
          </a>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">Financial Wellness</div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-[#EDE8DF]">
            <div
              className="h-full bg-[#1E6B3C] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, computed.overallScore))}%` }}
            />
          </div>
          <div className="mt-1 font-serif text-lg text-[#1C1C1C]">
            {computed.overallScore} <span className="text-xs text-[#999]">/ 100</span>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {PRIMARY_TABS.map((t) => (
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
      <div className="mb-6 flex flex-wrap gap-1.5">
        {SECONDARY_TABS.map((t) => (
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

      {tab === "dashboard" && (
        <div>
          <SectionHeader
            title="New Client Analysis"
            subtitle="Enter client information below, then work through the six pillars using the tabs above."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Profile" title="Client information">
              <TextField label="Client name" value={state.profile.clientName} onChange={(v) => updateProfile("clientName", v)} />
              <TextField label="Spouse / partner" value={state.profile.spouseName} onChange={(v) => updateProfile("spouseName", v)} placeholder="Optional" />
              <TextField label="Client date of birth" type="date" value={state.profile.clientDob} onChange={(v) => updateProfile("clientDob", v)} />
              <TextField label="Spouse date of birth" type="date" value={state.profile.spouseDob} onChange={(v) => updateProfile("spouseDob", v)} />
              <NumberField label="Dependents" value={state.profile.dependents} onChange={(v) => updateProfile("dependents", v)} />
              <TextField label="Location" value={state.profile.location} onChange={(v) => updateProfile("location", v)} placeholder="City, State" />
              <TextField label="Analysis date" type="date" value={state.profile.analysisDate} onChange={(v) => updateProfile("analysisDate", v)} />
            </Panel>
            <Panel label="Profile" title="Advisor on this case">
              <TextField label="Advisor name" value={state.advisor.advisorName} onChange={(v) => updateAdvisor("advisorName", v)} />
              <TextField label="Title" value={state.advisor.advisorTitle} onChange={(v) => updateAdvisor("advisorTitle", v)} placeholder="Financial Strategist" />
              <TextField label="Email" type="email" value={state.advisor.advisorEmail} onChange={(v) => updateAdvisor("advisorEmail", v)} />
              <TextField label="Phone" type="tel" value={state.advisor.advisorPhone} onChange={(v) => updateAdvisor("advisorPhone", v)} />
            </Panel>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save client"}
            </button>
            {saveMsg && <span className="text-xs font-semibold text-[#1E6B3C]">{saveMsg}</span>}
          </div>
        </div>
      )}

      {tab === "goals" && (
        <div>
          <SectionHeader
            title="Goals & Dreams"
            subtitle="Every number in this analysis exists to serve a goal. Capture what the household is working toward — one goal per line."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Panel label="1–3 Years" title="Short Term">
              <textarea
                value={state.goals.goalsShort}
                onChange={(e) => updateGoals("goalsShort", e.target.value)}
                placeholder="One goal per line..."
                rows={6}
                className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </Panel>
            <Panel label="3–7 Years" title="Medium Term">
              <textarea
                value={state.goals.goalsMedium}
                onChange={(e) => updateGoals("goalsMedium", e.target.value)}
                placeholder="One goal per line..."
                rows={6}
                className="w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </Panel>
            <Panel label="7+ Years" title="Long Term">
              <textarea
                value={state.goals.goalsLong}
                onChange={(e) => updateGoals("goalsLong", e.target.value)}
                placeholder="One goal per line..."
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
            title="Cash Flow & Budget Analysis"
            subtitle="Money in, money out, and what's left. Non-discretionary expenses are the 'needs'; discretionary spending is the 'wants' that can flex in an emergency."
            pillarScore={computed.cashflow.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Inflows" title="Monthly income">
              <NumberField label="Client income" value={state.cashflow.incomeClient} onChange={(v) => updateCashflow("incomeClient", v)} />
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
              {computed.cashflow.negative && (
                <span className="mt-2 inline-block rounded-full bg-[#FBEFEF] px-3 py-1 text-xs font-semibold text-[#8B1A1A]">
                  Negative cash flow risk
                </span>
              )}
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
            title="Net Worth Statement"
            subtitle="Everything owned minus everything owed — the single number that tracks whether the plan is working year over year."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Owned" title="Assets">
              <NumberField label="Home / real estate" value={state.networth.home} onChange={(v) => updateNetworth("home", v)} />
              <NumberField label="Vehicles" value={state.networth.vehicles} onChange={(v) => updateNetworth("vehicles", v)} />
              <div className="flex items-center justify-between py-1.5 text-xs text-[#555]">
                <span>Retirement accounts</span>
                <span className="font-semibold text-[#1C1C1C]">$0</span>
              </div>
              <div className="-mt-1 mb-1 text-[10px] italic text-[#999]">from Retirement pillar (not yet built)</div>
              <div className="flex items-center justify-between py-1.5 text-xs text-[#555]">
                <span>Cash & liquid reserves</span>
                <span className="font-semibold text-[#1C1C1C]">$0</span>
              </div>
              <div className="-mt-1 mb-1 text-[10px] italic text-[#999]">from Liquidity pillar (not yet built)</div>
              <NumberField label="Investments (non-retirement)" value={state.networth.investments} onChange={(v) => updateNetworth("investments", v)} />
              <NumberField label="Business interests" value={state.networth.business} onChange={(v) => updateNetworth("business", v)} />
              <NumberField label="Other assets" value={state.networth.other} onChange={(v) => updateNetworth("other", v)} />
              <TotalRow label="Total assets" value={fmt(computed.networth.totalAssets)} />
            </Panel>
            <Panel label="Owed" title="Liabilities & result">
              {computed.networth.totalLiabilities <= 0 && (
                <p className="text-xs italic text-[#888]">No liabilities entered (Debt pillar).</p>
              )}
              <TotalRow label="Total liabilities" value={fmt(computed.networth.totalLiabilities)} />
              <div className="mt-6 rounded-md bg-[#F5F0E8] p-4 text-center">
                <div
                  className="font-serif text-3xl"
                  style={{ color: computed.networth.netWorth < 0 ? "#8B1A1A" : "#1C1C1C" }}
                >
                  {fmt(computed.networth.netWorth)}
                </div>
                <div className="mt-1 text-xs text-[#888]">net worth</div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "debt" && (
        <div>
          <SectionHeader
            title="Debt Management Analysis"
            subtitle="Not all debt is equal. Mortgage and student loans build equity or earning power at low cost; credit cards and personal loans cost more and carry no upside — those get paid off first."
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
            <Panel label="Cost" title="Debt health & payoff priority">
              <NumberField label="Avg. rate on cards / personal loans (%)" value={state.debt.highRate} step={0.1} onChange={(v) => updateDebt("highRate", v)} />
              <div className="mt-4">
                <ResultRow label="Debt-to-income ratio (monthly)" value={computed.debt.dti.toFixed(1) + "%"} negative={computed.debt.dtiHigh} />
                <ResultRow label="Leverage debt (mortgage, auto, student)" value={fmt(computed.debt.goodDebt)} />
                <ResultRow label="Consumer debt (cards, personal, other)" value={fmt(computed.debt.badDebt)} />
                <ResultRow label="Consumer debt share of total" value={computed.debt.badShare.toFixed(1) + "%"} />
                <ResultRow label="Est. annual interest cost — consumer debt" value={fmt(computed.debt.interestCost) + " / yr"} />
              </div>
              {computed.debt.priorityItems.length > 0 && (
                <div className="mt-3 text-xs leading-relaxed text-[#555]">
                  <strong>Suggested payoff order (highest-cost consumer debt first):</strong>
                  <br />
                  {computed.debt.priorityItems.map((it, i) => (
                    <div key={it.name}>
                      {i + 1}. {it.name} — {fmt(it.bal)}
                    </div>
                  ))}
                </div>
              )}
              {computed.debt.dtiHigh ? (
                <span className="mt-3 inline-block rounded-full bg-[#FBEFEF] px-3 py-1 text-xs font-semibold text-[#8B1A1A]">
                  Debt-to-income above the healthy 36% threshold
                </span>
              ) : (
                computed.debt.totalBalance > 0 && (
                  <span className="mt-3 inline-block rounded-full bg-[#EBF5EE] px-3 py-1 text-xs font-semibold text-[#1E6B3C]">
                    Debt-to-income within healthy range
                  </span>
                )
              )}
              <p className="mt-4 text-[11px] text-[#999]">
                Debt-to-income compares total monthly debt payments to total household income (Cash Flow pillar).
                Under 36% is generally considered healthy.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "protection" && (
        <div>
          <SectionHeader
            title="Proper Protection Analysis"
            subtitle="If the primary income earner were gone tomorrow, would the household have enough to replace lost income, clear debt, and fund the goals already on the table?"
            pillarScore={computed.protection.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="In Force" title="Current coverage">
              <NumberField label="Client life insurance (face amount)" value={state.protection.covClient} onChange={(v) => updateProtection("covClient", v)} />
              <NumberField label="Spouse life insurance (face amount)" value={state.protection.covSpouse} onChange={(v) => updateProtection("covSpouse", v)} />
              <NumberField label="Employer / group coverage" value={state.protection.covGroup} onChange={(v) => updateProtection("covGroup", v)} />
              <TotalRow label="Total current coverage" value={fmt(computed.protection.totalCoverage)} />

              <div className="mt-5 flex flex-col gap-2">
                <label className="flex items-center justify-between text-xs text-[#555]">
                  Client has disability insurance?
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
                  Client has long-term care coverage?
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
              <div className="mt-3 flex flex-col gap-2">
                {computed.protection.warnings.map((w) => (
                  <span key={w} className="w-fit rounded-full bg-[#FBEFEF] px-3 py-1 text-xs font-semibold text-[#8B1A1A]">
                    {w}
                  </span>
                ))}
              </div>
            </Panel>
            <Panel label="Needed" title="Coverage need & gap">
              <NumberField label="Years of income to replace" value={state.protection.years} onChange={(v) => updateProtection("years", v)} />
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
              <p className="mt-3 text-[11px] text-[#999]">
                Income, dependents, and debt totals pull automatically from the Cash Flow and Debt pillars.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {SECONDARY_TABS.some((t) => t.value === tab) && (
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-[#D9CFBA] p-10 text-center">
          <div>
            <div className="mb-1 font-serif text-lg text-[#1C1C1C]">{activeLabel}</div>
            <div className="text-sm text-[#888]">
              {SECONDARY_TABS.find((t) => t.value === tab)?.placeholder} — coming soon.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
