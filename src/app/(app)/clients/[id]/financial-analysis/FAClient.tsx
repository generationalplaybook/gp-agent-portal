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
  type FALiquidityInputs,
  type FARetirementInputs,
  type FAEducationInputs,
  type FAEstateInputs,
  type YesNoUnsure,
} from "@/lib/fa";
import { saveFinancialPlan } from "./actions";
import DollarInput from "../DollarInput";
import { parseMoney } from "@/lib/illustration";
import { generateFAReportPDF } from "@/lib/fa-pdf";

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

// Karina, 9/11, after a client meeting: money fields in this wizard were a plain
// `<input type="number">` — no $, no commas, no forced cents, and scrolling the mouse wheel over
// one silently changed the value while it had focus (a well-known native-number-input footgun).
// "It should only be enterable... automatic dollar sign, automatic decimal and zero zero...
// automatic comma." Rebuilt on DollarInput — the same component every other money field in the
// app (Illustrations/Scenarios/Products) already uses — which has none of those problems: plain
// text input, no scroll-to-change, comma+cents formatting on blur via formatMoney(). The one
// non-dollar use of this field (the debt interest-rate percentage) gets its own `variant="percent"`
// instead of a dollar sign, but still loses the native spinner/scroll bug the same way.
function NumberField({
  label,
  value,
  onChange,
  variant = "dollar",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  variant?: "dollar" | "percent";
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
      ) : (
        <DollarInput
          value={String(value)}
          onChange={(v) => onChange(parseMoney(v))}
          className={inputClass}
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

// 9/11 — Karina, re: the old editable Advisor Name/Title fields: "do we really need that because
// you're the advisor?" Since this tool is only ever run by the logged-in advisor on their own
// case, that information is already known — no reason to make her type her own name in. Replaced
// the editable name/title inputs with a plain read-only display of her own profile info; dropped
// Title entirely since it was never backed by real profile data (just a freeform box with nothing
// to auto-fill it).
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      <label className="text-xs text-[#555]">{label}</label>
      <div className="rounded-md border border-[#EDE8DF] bg-[#F5F0E8] px-3 py-1.5 text-sm text-[#333]">{value || "—"}</div>
    </div>
  );
}

// Same Yes/No/Unsure select the Protection tab already uses inline (disability/LTC coverage) —
// pulled out as its own component for the Estate tab's checklist, which needs three of them.
function YesNoUnsureField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNoUnsure;
  onChange: (v: YesNoUnsure) => void;
}) {
  return (
    <label className="mb-2 flex items-center justify-between text-xs text-[#555]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as YesNoUnsure)}
        className="rounded-md border border-[#D9CFBA] px-2 py-1 text-sm"
      >
        <option value="no">No</option>
        <option value="yes">Yes</option>
        <option value="unsure">Unsure</option>
      </select>
    </label>
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
    if (savedState) {
      // 9/11: a plan saved before the Liquidity/Retirement/Education/Estate pillars existed won't
      // have those keys in its saved JSON at all — spreading EMPTY_FA_STATE's defaults first,
      // then the saved data over it, backfills exactly those missing pillars without touching
      // anything the client already has saved (same additive-only spirit as everywhere else in
      // this app). A saved plan that already HAS these keys just overrides the defaults as normal.
      return { ...EMPTY_FA_STATE, ...savedState };
    }
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
  // Advisor info is now read-only (auto-filled from the logged-in advisor's own profile — see
  // ReadOnlyField above), so there's no longer an editable path that needs an updater here.
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
  function updateLiquidity<K extends keyof FALiquidityInputs>(key: K, value: FALiquidityInputs[K]) {
    setState((s) => ({ ...s, liquidity: { ...s.liquidity, [key]: value } }));
  }
  function updateRetirement<K extends keyof FARetirementInputs>(key: K, value: FARetirementInputs[K]) {
    setState((s) => ({ ...s, retirement: { ...s.retirement, [key]: value } }));
  }
  function updateEducation<K extends keyof FAEducationInputs>(key: K, value: FAEducationInputs[K]) {
    setState((s) => ({ ...s, education: { ...s.education, [key]: value } }));
  }
  function updateEstate<K extends keyof FAEstateInputs>(key: K, value: FAEstateInputs[K]) {
    setState((s) => ({ ...s, estate: { ...s.estate, [key]: value } }));
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
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#707070]">Financial Wellness</div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-[#EDE8DF]">
            <div
              className="h-full bg-[#1E6B3C] transition-all"
              style={{ width: `${Math.max(0, Math.min(100, computed.overallScore))}%` }}
            />
          </div>
          <div className="mt-1 font-serif text-lg text-[#1C1C1C]">
            {computed.overallScore} <span className="text-xs text-[#707070]">/ 100</span>
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
              <ReadOnlyField label="Advisor name" value={state.advisor.advisorName} />
              <ReadOnlyField label="Email" value={state.advisor.advisorEmail} />
              <ReadOnlyField label="Phone" value={state.advisor.advisorPhone} />
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
            {/* 9/11 — Karina: "medium term sounds weird," renamed to Mid-Term (parallel with Short/Long Term). */}
            <Panel label="3–7 Years" title="Mid-Term">
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
              <div className="-mt-1 mb-1 text-[10px] italic text-[#707070]">from Retirement pillar (not yet built)</div>
              <div className="flex items-center justify-between py-1.5 text-xs text-[#555]">
                <span>Cash & liquid reserves</span>
                <span className="font-semibold text-[#1C1C1C]">$0</span>
              </div>
              <div className="-mt-1 mb-1 text-[10px] italic text-[#707070]">from Liquidity pillar (not yet built)</div>
              <NumberField label="Investments (non-retirement)" value={state.networth.investments} onChange={(v) => updateNetworth("investments", v)} />
              <NumberField label="Business interests" value={state.networth.business} onChange={(v) => updateNetworth("business", v)} />
              <NumberField label="Other assets" value={state.networth.other} onChange={(v) => updateNetworth("other", v)} />
              <TotalRow label="Total assets" value={fmt(computed.networth.totalAssets)} />
            </Panel>
            <Panel label="Owed" title="Liabilities & result">
              {computed.networth.totalLiabilities <= 0 && (
                <p className="text-xs italic text-[#707070]">No liabilities entered (Debt pillar).</p>
              )}
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
              <NumberField label="Avg. rate on cards / personal loans (%)" value={state.debt.highRate} variant="percent" onChange={(v) => updateDebt("highRate", v)} />
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
              <p className="mt-4 text-[11px] text-[#707070]">
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
              <p className="mt-3 text-[11px] text-[#707070]">
                Income, dependents, and debt totals pull automatically from the Cash Flow and Debt pillars.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {/* 9/11 — Karina, after being embarrassed mid-client-meeting: "that analysis is not fully
          complete... It only went up to protection, liquidity, retirement, education, estate,
          action plan, and client report is not built out." These five tabs were literal
          "coming soon" placeholders (see fa.ts's header comment — never built even in the
          original source tool) — now real, editable-assumption pillars, same pattern as
          Protection above. */}
      {tab === "liquidity" && (
        <div>
          <SectionHeader
            title="Emergency Fund Analysis"
            subtitle="Could the household cover several months of essential expenses from savings alone if income stopped tomorrow — without touching retirement accounts or going into debt?"
            pillarScore={computed.liquidity.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Current" title="Liquid savings on hand">
              <NumberField
                label="Cash / savings / money market (accessible without penalty)"
                value={state.liquidity.currentLiquidSavings}
                onChange={(v) => updateLiquidity("currentLiquidSavings", v)}
              />
              <p className="mt-3 text-[11px] text-[#707070]">
                Included in Net Worth&rsquo;s total assets automatically — don&rsquo;t also count this balance under
                Investments/Other on the Net Worth tab.
              </p>
            </Panel>
            <Panel label="Target" title="Reserve goal & gap">
              <NumberField
                label="Target months of essential expenses"
                value={state.liquidity.targetMonths}
                onChange={(v) => updateLiquidity("targetMonths", v)}
              />
              <div className="mt-4">
                <ResultRow label="Monthly essential expenses (from Cash Flow)" value={fmt(computed.cashflow.essential)} />
                <ResultRow label="Months currently covered" value={computed.liquidity.monthsCovered.toFixed(1)} />
              </div>
              <TotalRow label="Target reserve" value={fmt(computed.liquidity.targetReserve)} />
              <div className="mt-2 flex items-center justify-between rounded-md border-[1.5px] border-[#D9CFBA] px-3 py-2 text-sm font-semibold">
                <span>Reserve gap (target − current)</span>
                <span style={{ color: computed.liquidity.gap > 0 ? "#8B1A1A" : "#1E6B3C" }}>
                  {computed.liquidity.gap > 0
                    ? fmt(computed.liquidity.gap)
                    : "Fully funded (+" + fmt(Math.abs(computed.liquidity.gap)) + ")"}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#707070]">
                Standard planning guidance is 3-6 months of essential expenses; the default here is 6 (the more
                conservative end) — adjust as appropriate for this household.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "retirement" && (
        <div>
          <SectionHeader
            title="Asset Accumulation & Retirement"
            subtitle="Based on today's income, savings, and time horizon, is this household on track to replace enough income to retire comfortably?"
            pillarScore={computed.retirement.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Current" title="Retirement assets & timeline">
              <NumberField
                label="Current retirement assets (401k, IRA, etc.)"
                value={state.retirement.currentRetirementAssets}
                onChange={(v) => updateRetirement("currentRetirementAssets", v)}
              />
              <NumberField
                label="Target retirement age"
                value={state.retirement.retirementAge}
                onChange={(v) => updateRetirement("retirementAge", v)}
              />
              <NumberField
                label="Expected annual growth rate (%)"
                variant="percent"
                value={state.retirement.expectedReturn}
                onChange={(v) => updateRetirement("expectedReturn", v)}
              />
              <div className="mt-4">
                <ResultRow label="Current age" value={computed.retirement.currentAge !== null ? String(computed.retirement.currentAge) : "—"} />
                <ResultRow
                  label="Years to retirement"
                  value={computed.retirement.yearsToRetirement !== null ? String(computed.retirement.yearsToRetirement) : "—"}
                />
                <ResultRow label="Projected assets at retirement" value={fmt(computed.retirement.projectedAssetsAtRetirement)} />
              </div>
              <p className="mt-3 text-[11px] text-[#707070]">
                Projection compounds the CURRENT balance only — it does not assume any future contributions, so
                treat this as a floor estimate, not a full projection.
              </p>
            </Panel>
            <Panel label="Need" title="Income replacement & gap">
              <NumberField
                label="Desired income replacement (%)"
                variant="percent"
                value={state.retirement.desiredIncomeReplacement}
                onChange={(v) => updateRetirement("desiredIncomeReplacement", v)}
              />
              <NumberField
                label="Estimated monthly Social Security"
                value={state.retirement.estimatedSocialSecurity}
                onChange={(v) => updateRetirement("estimatedSocialSecurity", v)}
              />
              <div className="mt-4">
                <ResultRow label="Desired annual retirement income" value={fmt(computed.retirement.desiredAnnualIncome)} />
                <ResultRow label="Annual income gap after Social Security" value={fmt(computed.retirement.incomeGapAnnual)} />
              </div>
              <TotalRow label="Capital needed (4% rule / 25x)" value={fmt(computed.retirement.capitalNeeded)} />
              <div className="mt-2 flex items-center justify-between rounded-md border-[1.5px] border-[#D9CFBA] px-3 py-2 text-sm font-semibold">
                <span>Shortfall (needed − projected)</span>
                <span style={{ color: computed.retirement.shortfall > 0 ? "#8B1A1A" : "#1E6B3C" }}>
                  {computed.retirement.shortfall > 0
                    ? fmt(computed.retirement.shortfall)
                    : "On track (+" + fmt(Math.abs(computed.retirement.shortfall)) + ")"}
                </span>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "education" && (
        <div>
          <SectionHeader
            title="Education Funding"
            subtitle="How much progress has been made toward funding college/education for the dependents already captured on the Profile tab?"
            pillarScore={computed.education.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Current" title="Education savings on hand">
              <NumberField
                label="Current education savings (529s, UTMAs, etc. — combined)"
                value={state.education.currentEducationSavings}
                onChange={(v) => updateEducation("currentEducationSavings", v)}
              />
              <ResultRow label="Dependents (from Profile tab)" value={String(state.profile.dependents)} />
            </Panel>
            <Panel label="Target" title="Projected cost & gap">
              <NumberField
                label="Projected cost per dependent"
                value={state.education.costPerDependent}
                onChange={(v) => updateEducation("costPerDependent", v)}
              />
              <TotalRow label="Total projected cost" value={fmt(computed.education.totalCost)} />
              <div className="mt-2 flex items-center justify-between rounded-md border-[1.5px] border-[#D9CFBA] px-3 py-2 text-sm font-semibold">
                <span>Funding gap (cost − current)</span>
                <span style={{ color: computed.education.gap > 0 ? "#8B1A1A" : "#1E6B3C" }}>
                  {computed.education.gap > 0
                    ? fmt(computed.education.gap)
                    : "Fully funded (+" + fmt(Math.abs(computed.education.gap)) + ")"}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#707070]">
                Distinct from Protection&rsquo;s education line — that&rsquo;s the insurance death-benefit need; this
                is funding progress already in place.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "estate" && (
        <div>
          <SectionHeader
            title="Estate Preservation & Legacy"
            subtitle="Are the basics in place (will, trust, beneficiary designations), and does this household's net worth come anywhere near the federal estate tax exemption?"
            pillarScore={computed.estate.pillarScore}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Panel label="Checklist" title="Estate planning basics">
              <YesNoUnsureField label="Has a will?" value={state.estate.hasWill} onChange={(v) => updateEstate("hasWill", v)} />
              <YesNoUnsureField label="Has a trust?" value={state.estate.hasTrust} onChange={(v) => updateEstate("hasTrust", v)} />
              <YesNoUnsureField
                label="Beneficiary designations up to date?"
                value={state.estate.beneficiariesUpdated}
                onChange={(v) => updateEstate("beneficiariesUpdated", v)}
              />
            </Panel>
            <Panel label="Exposure" title="Federal exemption check">
              <ResultRow label="Marital status (from Profile tab)" value={computed.estate.married ? "Married" : "Single"} />
              <ResultRow label="Net worth (from Net Worth tab)" value={fmt(computed.estate.taxableEstate)} />
              <ResultRow
                label={"Federal exemption (2026, " + (computed.estate.married ? "married" : "individual") + ")"}
                value={fmt(computed.estate.applicableExemption)}
              />
              <div className="mt-2 flex items-center justify-between rounded-md border-[1.5px] border-[#D9CFBA] px-3 py-2 text-sm font-semibold">
                <span>Federal estate tax exposure</span>
                <span style={{ color: computed.estate.exposure > 0 ? "#8B1A1A" : "#1E6B3C" }}>
                  {computed.estate.exposure > 0 ? fmt(computed.estate.exposure) : "None"}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-[#707070]">
                Federal threshold only. State estate/inheritance taxes vary widely — some states apply their own
                tax as low as ~$1M, far below the federal number. Confirm this household&rsquo;s specific state rules
                with an estate attorney/CPA.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {tab === "actionplan" && (
        <div>
          <SectionHeader
            title="Action Plan"
            subtitle="Every number in this analysis exists to serve a goal — this is where the gaps across every pillar turn into a prioritized next-steps list."
          />
          {computed.actionPlan.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#D9CFBA] p-8 text-center text-sm text-[#707070]">
              No gaps flagged — every pillar entered so far looks on track.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {computed.actionPlan.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-[#D9CFBA] bg-white p-4">
                  <span className="mt-0.5 shrink-0 rounded-full bg-[#F5F0E8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#707070]">
                    {item.pillar}
                  </span>
                  <span className="text-sm text-[#2E2E2E]">{item.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "report" && (
        <div>
          <SectionHeader
            title="Client Report"
            subtitle="A client-ready PDF summarizing every pillar of this analysis, in the same light, minimal style as the Illustrations and Client Analyzer PDFs."
          />
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-[#D9CFBA] p-10 text-center">
            <div className="font-serif text-lg text-[#1C1C1C]">{state.profile.clientName || clientName}</div>
            <div className="text-sm text-[#707070]">
              Overall Financial Wellness Score: <span className="font-semibold text-[#1C1C1C]">{computed.overallScore} / 100</span>
            </div>
            <button
              type="button"
              onClick={() => generateFAReportPDF(state, computed)}
              className="rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              Download Client Report (PDF)
            </button>
          </div>
        </div>
      )}

      {/* 9/11 — Karina: "there needs to be a next button at the bottom of the page on each page
          because going up to click the next tab is not intuitive." Walks the same PRIMARY_TABS +
          SECONDARY_TABS order the tab strip above uses, so Next/Back always matches what's
          highlighted up top. */}
      {(() => {
        const idx = allTabs.findIndex((t) => t.value === tab);
        const prevTab = idx > 0 ? allTabs[idx - 1] : null;
        const nextTab = idx >= 0 && idx < allTabs.length - 1 ? allTabs[idx + 1] : null;
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
            <button
              type="button"
              onClick={() => nextTab && go(nextTab.value)}
              disabled={!nextTab}
              className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next{nextTab ? `: ${nextTab.label}` : ""} →
            </button>
          </div>
        );
      })()}
    </div>
  );
}
