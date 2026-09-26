"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DollarInput from "../../DollarInput";
import RidersField from "../../RidersField";
import {
  emptyCashValueMilestone,
  emptyAnnuityMilestone,
  emptyDeathBenefitTarget,
  emptyCashValueBudget,
  getCashValueBudgets,
  type IllustrationData,
  type CashValueMilestone,
  type AnnuityMilestone,
  type DeathBenefitTarget,
  type CashValueIllustration,
  type CashValueBudget,
  type FinalExpenseIllustration,
  type TermIllustration,
} from "@/lib/illustration";
import { generateScenarioIllustrationPDF, type AdvisorInfo } from "@/lib/illustration-pdf";
import { KB_PRODUCTS } from "@/lib/kb-data";

const MAX_CASH_VALUE_MILESTONES = 5;
// Death Benefit Milestones (the quick "hits $X at age Y" highlight, distinct from the detailed
// per-age table above) always shows at least 2 rows — Karina's own example was two targets
// ($500K/$1M) — and caps at 4, same reasoning as the 5-cap above: keep it to a quick highlight,
// not another full table.
const MAX_DEATH_BENEFIT_TARGETS = 4;
const MIN_DEATH_BENEFIT_TARGETS = 2;
// Multiple budgets — added 9/25 per Karina: "i think up two 3 budgets is enough" (comparing the
// same product across 3 different premium levels for the same client).
const MAX_CASH_VALUE_BUDGETS = 3;
import { saveScenario, markScenarioChosen, undoScenarioChosen, deleteScenario } from "../actions";

interface Scenario {
  id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
  data: IllustrationData;
  notes: string | null;
  converted_product_id: string | null;
  chosen_at: string | null;
}

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]";

// Suggestions for the Final Expense Option 2/3 "Product name" fields — added 9/13 per Karina,
// after seeing the field was a bare free-text input with no connection to the Knowledge Base
// ("this should auto populate the products so if its in the portal KB we can select it"). Same
// native <datalist> pattern already used for product_name elsewhere (ProductsSection.tsx's "Add
// Product" field, ScenariosSection.tsx's "+ Add Illustration" picker) — still just a plain text
// input underneath, so an advisor can type a carrier that isn't in the KB, but one that IS shows
// up as a pick. Narrowed to Final Expense products specifically (unlike those other two, which
// suggest the whole KB) since that's the only illustration kind these two fields ever appear on.
const FINAL_EXPENSE_PRODUCT_SUGGESTIONS = KB_PRODUCTS.filter((p) => p.productType === "Final Expense").map((p) => p.name);

// Duplicated from illustrations/[productId]/IllustrationForm.tsx rather than shared — same
// pattern used elsewhere in this app (e.g. the two MeetingRow components) so the existing,
// working per-product illustration flow can never be affected by changes made here.
// Reworked 9/1 per Karina, twice: first to Age → Cash Value → Death Benefit (one number each,
// not a Guaranteed/Non-Guaranteed grid), then reworked again same day into a two-part Level vs.
// Increasing comparison — Karina found the two death benefit options can land very differently
// (which one grows cash value faster isn't a fixed rule, it's product-specific; the reliable
// difference is that Level pays the full elected face amount from day one while Increasing
// starts lower and grows into that same target over years), so both tracks are entered side by
// side at each age. Level uses the original cvNonGuaranteed/dbGuaranteed fields; Increasing uses
// the newer cvIncreasing/dbIncreasing fields. cvGuaranteed/dbNonGuaranteed are left blank and
// unused for scenarios — kept in the shared type only so this stays compatible with the original
// per-product Illustration flow, which is untouched. Capped at 5 milestones — Karina's real
// usage is 3-4 (e.g. 18/35/65).
function CashValueMilestonesEditor({
  milestones,
  onChange,
}: {
  milestones: CashValueMilestone[];
  onChange: (m: CashValueMilestone[]) => void;
}) {
  function update(id: string, patch: Partial<CashValueMilestone>) {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function remove(id: string) {
    onChange(milestones.filter((m) => m.id !== id));
  }
  return (
    <div className="flex flex-col gap-3">
      {milestones.map((m, i) => (
        <div key={m.id} className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-3 flex items-end justify-between gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              {i === 0 ? "Age" : `Age (Milestone ${i + 1})`}
              <input
                value={m.label}
                onChange={(e) => update(m.id, { label: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="e.g. 18"
                inputMode="numeric"
                className={inputClass + " max-w-[120px]"}
              />
            </label>
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="mb-1.5 text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                Level Death Benefit
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Cash Value
                  <DollarInput value={m.cvNonGuaranteed} onChange={(v) => update(m.id, { cvNonGuaranteed: v })} className={inputClass + " w-full"} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Death Benefit
                  <DollarInput value={m.dbGuaranteed} onChange={(v) => update(m.id, { dbGuaranteed: v })} className={inputClass + " w-full"} />
                </label>
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                Increasing Death Benefit
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Cash Value
                  <DollarInput value={m.cvIncreasing ?? ""} onChange={(v) => update(m.id, { cvIncreasing: v })} className={inputClass + " w-full"} />
                </label>
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Death Benefit
                  <DollarInput value={m.dbIncreasing ?? ""} onChange={(v) => update(m.id, { dbIncreasing: v })} className={inputClass + " w-full"} />
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
      {milestones.length < MAX_CASH_VALUE_MILESTONES ? (
        <button
          type="button"
          onClick={() => onChange([...milestones, emptyCashValueMilestone()])}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Milestone
        </button>
      ) : (
        <p className="text-xs text-[#707070]">Maximum of {MAX_CASH_VALUE_MILESTONES} milestones.</p>
      )}
    </div>
  );
}

// The quick "at what age does the death benefit hit $X" highlight — added 9/7 per Karina.
// Deliberately lighter than CashValueMilestonesEditor above: one target dollar amount per row,
// plus the age it's reached under each election (Level and Increasing can hit the same target at
// different ages, since Increasing starts lower and grows into it). Always at least
// MIN_DEATH_BENEFIT_TARGETS rows — Remove only appears once there are more than the minimum, so
// an advisor can never end up with zero or one row and lose the two-target layout Karina asked for.
function DeathBenefitTargetsEditor({
  targets,
  onChange,
}: {
  targets: DeathBenefitTarget[];
  onChange: (t: DeathBenefitTarget[]) => void;
}) {
  function update(id: string, patch: Partial<DeathBenefitTarget>) {
    onChange(targets.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function remove(id: string) {
    onChange(targets.filter((t) => t.id !== id));
  }
  return (
    <div className="flex flex-col gap-3">
      {targets.map((t, i) => (
        <div key={t.id} className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-3 flex items-end justify-between gap-2">
            <label className="flex max-w-[200px] flex-col gap-1 text-xs text-[#666]">
              {i === 0 ? "Death Benefit Target" : `Death Benefit Target ${i + 1}`}
              <DollarInput
                value={t.targetAmount}
                onChange={(v) => update(t.id, { targetAmount: v })}
                placeholder="e.g. 500,000"
                className={inputClass + " w-full"}
              />
            </label>
            {targets.length > MIN_DEATH_BENEFIT_TARGETS && (
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="mb-1.5 text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              <span className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-[#1C1C1C]">Age It&rsquo;s Reached</span>
                <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                  Level
                </span>
              </span>
              <input
                value={t.levelAge}
                onChange={(e) => update(t.id, { levelAge: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="e.g. 45"
                inputMode="numeric"
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              <span className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold text-[#1C1C1C]">Age It&rsquo;s Reached</span>
                <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                  Increasing
                </span>
              </span>
              <input
                value={t.increasingAge}
                onChange={(e) => update(t.id, { increasingAge: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="e.g. 52"
                inputMode="numeric"
                className={inputClass + " w-full"}
              />
            </label>
          </div>
        </div>
      ))}
      {targets.length < MAX_DEATH_BENEFIT_TARGETS ? (
        <button
          type="button"
          onClick={() => onChange([...targets, emptyDeathBenefitTarget()])}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Target
        </button>
      ) : (
        <p className="text-xs text-[#707070]">Maximum of {MAX_DEATH_BENEFIT_TARGETS} targets.</p>
      )}
    </div>
  );
}

// One full budget's worth of the cash_value editing surface — extracted 9/25 per Karina: "i am
// doing 3 different budgets for the same product... add additional budget section that opens up
// another section for the same illustration for all of the same numbers to be inputted." Same
// fields and copy as the original single-budget section, just scoped to one CashValueBudget
// instead of the top-level IllustrationData so it can render once per budget. `notes` is
// deliberately NOT part of this — see the comment on CashValueIllustration.budgets in
// lib/illustration.ts for why Notes stays shared/scenario-level instead of per-budget.
function CashValueBudgetEditor({
  budget,
  onChange,
}: {
  budget: CashValueBudget;
  onChange: (b: CashValueBudget) => void;
}) {
  return (
    <>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Premium</h2>
      <p className="mb-2 text-xs text-[#707070]">
        What the client actually pays, and the bare minimum that keeps this policy from lapsing. The
        minimum to avoid lapse differs by election, since cost of insurance isn&rsquo;t the same under Level vs.
        Increasing, so enter both from the carrier&rsquo;s illustration. All optional.
      </p>
      <label className="mb-5 flex max-w-xs flex-col gap-1 text-xs text-[#666]">
        Monthly Premium
        <DollarInput
          value={budget.monthlyPremium ?? ""}
          onChange={(v) => onChange({ ...budget, monthlyPremium: v })}
          className={inputClass}
        />
      </label>
      <div className="mb-1.5 grid max-w-md grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-[#1C1C1C]">Minimum to Avoid Lapse</span>
            <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
              Level
            </span>
          </span>
          <DollarInput
            value={budget.minimumPremium ?? ""}
            onChange={(v) => onChange({ ...budget, minimumPremium: v })}
            className={inputClass + " w-full"}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-[#1C1C1C]">Minimum to Avoid Lapse</span>
            <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
              Increasing
            </span>
          </span>
          <DollarInput
            value={budget.minimumPremiumIncreasing ?? ""}
            onChange={(v) => onChange({ ...budget, minimumPremiumIncreasing: v })}
            className={inputClass + " w-full"}
          />
        </label>
      </div>
      <p className="mb-5 max-w-md text-[11px] text-[#8b6a00]">
        Increasing keeps the death benefit&rsquo;s full face amount at risk for life, so cost of insurance is
        higher and this minimum typically keeps climbing every year. Level&rsquo;s net amount at risk shrinks
        as cash value grows, which can help offset that rise, though it isn&rsquo;t a guarantee it stops climbing;
        confirm the actual year-by-year schedule on the carrier&rsquo;s illustration.
      </p>

      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Initial Death Benefit</h2>
      <p className="mb-2 text-xs text-[#707070]">
        The policy&rsquo;s starting face amount at issue under each election: separate from the
        Level/Increasing numbers entered per milestone below, which show what it grows (or steps up) to at
        each age. Carriers can quote a different starting face amount for Level vs. Increasing even though
        both work toward the same eventual target.
      </p>
      <div className="mb-5 grid max-w-md grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-[#1C1C1C]">Face Value</span>
            <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
              Level
            </span>
          </span>
          <DollarInput
            value={budget.initialDeathBenefit ?? ""}
            onChange={(v) => onChange({ ...budget, initialDeathBenefit: v })}
            className={inputClass + " w-full"}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          <span className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-[#1C1C1C]">Face Value</span>
            <span className="self-start rounded-full bg-[#F0EDE8] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
              Increasing
            </span>
          </span>
          <DollarInput
            value={budget.initialDeathBenefitIncreasing ?? ""}
            onChange={(v) => onChange({ ...budget, initialDeathBenefitIncreasing: v })}
            className={inputClass + " w-full"}
          />
        </label>
      </div>

      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Death Benefit Increase</h2>
      <p className="mb-1 text-xs text-[#707070]">
        On a Level death benefit, if cash value is left untouched the policy is required to step the death
        benefit up at a certain age (common on some IUL designs, especially juvenile policies); note that
        age here so it&rsquo;s called out on the summary. If the client starts taking withdrawals, the death
        benefit stays level instead. It does not step up. Leave blank if it doesn&rsquo;t apply.
      </p>
      <p className="mb-2 text-xs text-[#707070]">
        Either way, the Level/Increasing election itself can be changed at any time by calling the
        carrier. We recommend periodic policy reviews, which we schedule as part of our service regardless.
      </p>
      <label className="mb-5 flex max-w-[200px] flex-col gap-1 text-xs text-[#666]">
        Age it increases (optional)
        <input
          value={budget.dbIncreaseAge ?? ""}
          onChange={(e) => onChange({ ...budget, dbIncreaseAge: e.target.value.replace(/[^0-9]/g, "") })}
          placeholder="e.g. 20"
          inputMode="numeric"
          className={inputClass}
        />
      </label>

      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Death Benefit Milestones</h2>
      <p className="mb-4 text-xs text-[#707070]">
        A quick highlight for the client: at what age does the death benefit reach a target amount, like
        $500,000 or $1,000,000? Since Level and Increasing grow into a target differently, the age can be
        different for each; leave one blank if it doesn&rsquo;t apply. This is separate from the detailed
        age-by-age table below.
      </p>
      <DeathBenefitTargetsEditor
        targets={
          budget.deathBenefitTargets && budget.deathBenefitTargets.length > 0
            ? budget.deathBenefitTargets
            : [emptyDeathBenefitTarget(), emptyDeathBenefitTarget()]
        }
        onChange={(deathBenefitTargets) => onChange({ ...budget, deathBenefitTargets })}
      />

      <h2 className="mb-1 mt-5 text-sm font-semibold uppercase tracking-wide text-[#555]">Milestones</h2>
      <p className="mb-4 text-xs text-[#707070]">
        For each age that matters, enter the illustrated numbers under both death benefit options, Level
        and Increasing, pulled straight from the carrier&rsquo;s side-by-side illustration, so the client can
        see exactly how they compare.
      </p>
      <CashValueMilestonesEditor
        milestones={budget.milestones}
        onChange={(milestones) => onChange({ ...budget, milestones })}
      />
    </>
  );
}

// Wraps 1-3 CashValueBudgetEditor sections — added 9/25, same conversation as the component above.
// getCashValueBudgets(data) is the single source of truth for what budgets exist (falls back to
// the pre-9/25 flat fields as an implicit "Budget 1" for every existing scenario) — this component
// always writes back through `data.budgets`, so the first edit made anywhere on a legacy
// single-budget scenario quietly upgrades it to the new shape (still just the one budget, nothing
// visibly changes) without a separate migration step. The budget name input and Remove button only
// show once there's more than one budget — with just one, this looks and behaves exactly like the
// original single-budget section always did.
function CashValueBudgetsSection({
  data,
  setData,
}: {
  data: CashValueIllustration;
  setData: (d: CashValueIllustration) => void;
}) {
  const budgets = getCashValueBudgets(data);
  const multi = budgets.length > 1;

  function setBudgets(next: CashValueBudget[]) {
    setData({ ...data, budgets: next });
  }
  function updateBudget(index: number, updated: CashValueBudget) {
    setBudgets(budgets.map((b, i) => (i === index ? updated : b)));
  }
  function addBudget() {
    setBudgets([...budgets, emptyCashValueBudget(`Budget ${budgets.length + 1}`)]);
  }
  function removeBudget(index: number) {
    setBudgets(budgets.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-6">
      {budgets.map((budget, i) => (
        <div key={budget.id} className={multi ? "rounded-md border border-[#D9CFBA] p-4" : undefined}>
          {multi && (
            <div className="mb-4 flex items-end justify-between gap-2">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Budget name
                <input
                  value={budget.label}
                  onChange={(e) => updateBudget(i, { ...budget, label: e.target.value })}
                  placeholder={`Budget ${i + 1}`}
                  className={inputClass + " max-w-[220px] font-semibold"}
                />
              </label>
              <button
                type="button"
                onClick={() => removeBudget(i)}
                className="mb-1.5 text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove budget
              </button>
            </div>
          )}
          <CashValueBudgetEditor budget={budget} onChange={(b) => updateBudget(i, b)} />
        </div>
      ))}
      {budgets.length < MAX_CASH_VALUE_BUDGETS ? (
        <button
          type="button"
          onClick={addBudget}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Budget
        </button>
      ) : (
        <p className="text-xs text-[#707070]">Maximum of {MAX_CASH_VALUE_BUDGETS} budgets.</p>
      )}
    </div>
  );
}

function AnnuityMilestonesEditor({
  milestones,
  onChange,
}: {
  milestones: AnnuityMilestone[];
  onChange: (m: AnnuityMilestone[]) => void;
}) {
  function update(id: string, patch: Partial<AnnuityMilestone>) {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function remove(id: string) {
    onChange(milestones.filter((m) => m.id !== id));
  }
  return (
    <div className="flex flex-col gap-3">
      {milestones.map((m, i) => (
        <div key={m.id} className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              value={m.label}
              onChange={(e) => update(m.id, { label: e.target.value })}
              placeholder={`Milestone ${i + 1} (e.g. Year 10)`}
              className={inputClass + " flex-1"}
            />
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Accumulation Value
              <DollarInput
                value={m.accumulationValue}
                onChange={(v) => update(m.id, { accumulationValue: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Income Value
              <DollarInput value={m.incomeValue} onChange={(v) => update(m.id, { incomeValue: v })} className={inputClass + " w-full"} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit
              <DollarInput value={m.deathBenefit} onChange={(v) => update(m.id, { deathBenefit: v })} className={inputClass + " w-full"} />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...milestones, emptyAnnuityMilestone()])}
        className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
      >
        + Add Milestone
      </button>
    </div>
  );
}

const MAX_TERM_OPTIONS = 3;

// Term budget/length options — added 9/24 per Karina: "i need an option to add another option
// because there are different options like i want to show my client 500,000 and another option
// ... maybe allow up to 3 options?" Same pattern as FinalExpenseOptionsEditor below (up to 3 flat
// Death Benefit + Level Premium pairs), plus Term Length per option since term policies commonly
// get compared at different lengths too (20 vs 30 year), not just different face amounts — left
// blank, an option falls back to reading as the same term length shown above. deathBenefit/
// levelPremium/termLength on TermIllustration stay the primary (first) option, so every existing
// Term scenario is unaffected. Options 2 and 3 use local show/hide state (not just "is there
// data") so a newly-added, still-empty option row doesn't disappear the moment it's added — same
// reasoning as Final Expense's version.
function TermOptionsEditor({
  data,
  setData,
}: {
  data: TermIllustration;
  setData: (d: TermIllustration) => void;
}) {
  const hasOption2 = !!(
    (data.deathBenefit2 && data.deathBenefit2.trim()) ||
    (data.levelPremium2 && data.levelPremium2.trim()) ||
    (data.termLength2 && data.termLength2.trim())
  );
  const hasOption3 = !!(
    (data.deathBenefit3 && data.deathBenefit3.trim()) ||
    (data.levelPremium3 && data.levelPremium3.trim()) ||
    (data.termLength3 && data.termLength3.trim())
  );
  const [showOption2, setShowOption2] = useState(hasOption2);
  const [showOption3, setShowOption3] = useState(hasOption3);

  function removeOption2() {
    setShowOption2(false);
    setData({ ...data, deathBenefit2: "", levelPremium2: "", termLength2: "" });
  }
  function removeOption3() {
    setShowOption3(false);
    setData({ ...data, deathBenefit3: "", levelPremium3: "", termLength3: "" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Death Benefit
          <DollarInput value={data.deathBenefit} onChange={(v) => setData({ ...data, deathBenefit: v })} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Level Premium
          <DollarInput value={data.levelPremium} onChange={(v) => setData({ ...data, levelPremium: v })} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Term Length
          <input
            value={data.termLength}
            onChange={(e) => setData({ ...data, termLength: e.target.value })}
            placeholder="e.g. 20"
            className={inputClass}
          />
        </label>
      </div>

      {showOption2 && (
        <div className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666]">Option 2</div>
            <button type="button" onClick={removeOption2} className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit
              <DollarInput
                value={data.deathBenefit2 ?? ""}
                onChange={(v) => setData({ ...data, deathBenefit2: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Level Premium
              <DollarInput
                value={data.levelPremium2 ?? ""}
                onChange={(v) => setData({ ...data, levelPremium2: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Term Length
              <input
                value={data.termLength2 ?? ""}
                onChange={(e) => setData({ ...data, termLength2: e.target.value })}
                placeholder="e.g. 30"
                className={inputClass + " w-full"}
              />
              <span className="font-normal normal-case text-[#8b8b8b]">Optional: leave blank to match the term length above</span>
            </label>
          </div>
        </div>
      )}

      {showOption3 && (
        <div className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666]">Option 3</div>
            <button type="button" onClick={removeOption3} className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit
              <DollarInput
                value={data.deathBenefit3 ?? ""}
                onChange={(v) => setData({ ...data, deathBenefit3: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Level Premium
              <DollarInput
                value={data.levelPremium3 ?? ""}
                onChange={(v) => setData({ ...data, levelPremium3: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Term Length
              <input
                value={data.termLength3 ?? ""}
                onChange={(e) => setData({ ...data, termLength3: e.target.value })}
                placeholder="e.g. 30"
                className={inputClass + " w-full"}
              />
              <span className="font-normal normal-case text-[#8b8b8b]">Optional: leave blank to match the term length above</span>
            </label>
          </div>
        </div>
      )}

      {!showOption2 || !showOption3 ? (
        <button
          type="button"
          onClick={() => (!showOption2 ? setShowOption2(true) : setShowOption3(true))}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add another option
        </button>
      ) : (
        <p className="text-xs text-[#707070]">Maximum of {MAX_TERM_OPTIONS} options.</p>
      )}
    </div>
  );
}

const MAX_FINAL_EXPENSE_OPTIONS = 3;

// Final Expense budget options — added 9/2. Karina wants to show a client more than one
// face-value/premium pairing on the same scenario ("sometimes people have room in their
// budget, so I want to enter more" — at least 3 total). Final Expense pricing is a
// straightforward face-value-to-premium table per carrier (guaranteed/simplified issue, no
// cash value or Level/Increasing complexity like IUL) — so unlike the cash_value Milestones
// editor, this isn't an age-by-age table, just up to 3 flat Death Benefit + Level Premium
// pairs. Fixed at 3 (not an open-ended "+ Add" list like Milestones) since that's what was
// actually asked for; deathBenefit/levelPremium on FinalExpenseIllustration stay the primary
// (first) option so every existing Final Expense scenario is unaffected. Options 2 and 3 use
// local show/hide state (not just "is there data") so a newly-added, still-empty option row
// doesn't disappear the moment it's added.
function FinalExpenseOptionsEditor({
  data,
  setData,
}: {
  data: FinalExpenseIllustration;
  setData: (d: FinalExpenseIllustration) => void;
}) {
  const hasOption2 = !!((data.deathBenefit2 && data.deathBenefit2.trim()) || (data.levelPremium2 && data.levelPremium2.trim()));
  const hasOption3 = !!((data.deathBenefit3 && data.deathBenefit3.trim()) || (data.levelPremium3 && data.levelPremium3.trim()));
  const [showOption2, setShowOption2] = useState(hasOption2);
  const [showOption3, setShowOption3] = useState(hasOption3);

  function removeOption2() {
    setShowOption2(false);
    setData({ ...data, deathBenefit2: "", levelPremium2: "", productName2: "" });
  }
  function removeOption3() {
    setShowOption3(false);
    setData({ ...data, deathBenefit3: "", levelPremium3: "", productName3: "" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Guaranteed Death Benefit
          <DollarInput value={data.deathBenefit} onChange={(v) => setData({ ...data, deathBenefit: v })} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Guaranteed Level Premium
          <DollarInput value={data.levelPremium} onChange={(v) => setData({ ...data, levelPremium: v })} className={inputClass} />
        </label>
      </div>

      {showOption2 && (
        <div className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666]">
              {data.productName2?.trim() || "Option 2"}
            </div>
            <button type="button" onClick={removeOption2} className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]">
              Remove
            </button>
          </div>
          <label className="mb-2 flex flex-col gap-1 text-xs text-[#666]">
            Product name{" "}
            <span className="font-normal normal-case text-[#8b8b8b]">
              (optional: leave blank if it&rsquo;s just a bigger budget tier of the same product above; fill in
              when this is a different product/carrier entirely)
            </span>
            <input
              value={data.productName2 ?? ""}
              onChange={(e) => setData({ ...data, productName2: e.target.value })}
              list="fe-option-product-suggestions"
              placeholder="e.g. Mutual of Omaha Living Promise"
              className={inputClass + " w-full"}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Guaranteed Death Benefit
              <DollarInput
                value={data.deathBenefit2 ?? ""}
                onChange={(v) => setData({ ...data, deathBenefit2: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Guaranteed Level Premium
              <DollarInput
                value={data.levelPremium2 ?? ""}
                onChange={(v) => setData({ ...data, levelPremium2: v })}
                className={inputClass + " w-full"}
              />
            </label>
          </div>
        </div>
      )}

      {showOption3 && (
        <div className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#666]">
              {data.productName3?.trim() || "Option 3"}
            </div>
            <button type="button" onClick={removeOption3} className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]">
              Remove
            </button>
          </div>
          <label className="mb-2 flex flex-col gap-1 text-xs text-[#666]">
            Product name{" "}
            <span className="font-normal normal-case text-[#8b8b8b]">
              (optional: leave blank if it&rsquo;s just a bigger budget tier of the same product above; fill in
              when this is a different product/carrier entirely)
            </span>
            <input
              value={data.productName3 ?? ""}
              onChange={(e) => setData({ ...data, productName3: e.target.value })}
              list="fe-option-product-suggestions"
              placeholder="e.g. Banner Life Final Expense"
              className={inputClass + " w-full"}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Guaranteed Death Benefit
              <DollarInput
                value={data.deathBenefit3 ?? ""}
                onChange={(v) => setData({ ...data, deathBenefit3: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Guaranteed Level Premium
              <DollarInput
                value={data.levelPremium3 ?? ""}
                onChange={(v) => setData({ ...data, levelPremium3: v })}
                className={inputClass + " w-full"}
              />
            </label>
          </div>
        </div>
      )}

      {!showOption2 || !showOption3 ? (
        <button
          type="button"
          onClick={() => (!showOption2 ? setShowOption2(true) : setShowOption3(true))}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add another option
        </button>
      ) : (
        <p className="text-xs text-[#707070]">Maximum of {MAX_FINAL_EXPENSE_OPTIONS} options.</p>
      )}

      <datalist id="fe-option-product-suggestions">
        {FINAL_EXPENSE_PRODUCT_SUGGESTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}

export default function ScenarioForm({
  clientId,
  clientName,
  clientPhone,
  clientEmail,
  scenario,
  advisor,
}: {
  clientId: string;
  clientName: string;
  // Added 9/13 (second pass) so the PDF header's client info card can show phone/email — see
  // illustration-pdf.ts's header comment for the full history.
  clientPhone?: string | null;
  clientEmail?: string | null;
  scenario: Scenario;
  advisor?: AdvisorInfo;
}) {
  const router = useRouter();
  const [productName, setProductName] = useState(scenario.product_name);
  const [carrier, setCarrier] = useState(scenario.carrier ?? "");

  // Same KB datalist convenience as the Final Expense Option 2/3 fields below (see the comment
  // on FINAL_EXPENSE_PRODUCT_SUGGESTIONS) — added 9/13 per Karina, extended here too since this
  // is the scenario's own primary product name and had the same gap: a bare free-text field with
  // no link to the Knowledge Base. Unfiltered (every KB product, not just Final Expense) since a
  // scenario can be any product type. Picking a known name auto-fills Carrier, same convenience
  // ProductsSection.tsx's "Add Product" field already has — Product Type isn't touched since it's
  // fixed at scenario creation and read-only here.
  function handleProductNameChange(value: string) {
    setProductName(value);
    const match = KB_PRODUCTS.find((p) => p.name === value);
    if (match) setCarrier(match.carrier);
  }
  const [data, setData] = useState<IllustrationData>(scenario.data);
  const [notes, setNotes] = useState(scenario.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);
  const [confirmingChosen, setConfirmingChosen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const converted = !!scenario.converted_product_id;
  const [chosenAt, setChosenAt] = useState<string | null>(scenario.chosen_at);

  const handleSave = useCallback(async () => {
    setStatus("saving");
    setError("");
    try {
      await saveScenario(scenario.id, clientId, { product_name: productName, carrier, notes }, data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save scenario.");
      setStatus("idle");
    }
  }, [scenario.id, clientId, productName, carrier, notes, data]);

  // Autosave — added 9/7 per Karina: "can illustration input auto save like the client profile
  // info does? not hitting save and losing info can be tedious." Same reasoning as the identical
  // block in IllustrationForm.tsx: the client profile form saves per-field on blur, but that
  // doesn't map cleanly onto this form's deeply nested milestone/target editors (none of which
  // have an onBlur of their own) — so instead this watches the whole editable surface
  // (productName, carrier, notes, data) and autosaves 1.5s after the last change. The manual Save
  // button, and handleMarkChosen's own explicit save-before-marking below, are both left in place
  // exactly as they were — autosave just means neither should ever actually find unsaved work
  // waiting for it.
  const hasMountedRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hasMountedRef.current) {
      // Skip the very first run — this state just loaded from the database, nothing new to save.
      hasMountedRef.current = true;
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      handleSave();
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [productName, carrier, notes, data, handleSave]);

  function handleDownload() {
    generateScenarioIllustrationPDF(
      {
        clientName,
        clientPhone,
        clientEmail,
        productName,
        carrier: carrier.trim() || null,
        productType: scenario.product_type,
        data,
        advisor,
      },
      "download"
    );
  }

  // Karina, 9/5: downloading every time is overkill for just glancing at the summary — this opens
  // the same PDF in a new tab (the browser's built-in viewer) instead of saving it to disk.
  function handleView() {
    generateScenarioIllustrationPDF(
      {
        clientName,
        clientPhone,
        clientEmail,
        productName,
        carrier: carrier.trim() || null,
        productType: scenario.product_type,
        data,
        advisor,
      },
      "view"
    );
  }

  async function handleMarkChosen() {
    setMarking(true);
    setError("");
    try {
      // Save whatever's currently on screen first, so the dated record reflects the actual
      // numbers that were on screen when the client said yes.
      await saveScenario(scenario.id, clientId, { product_name: productName, carrier, notes }, data);
      await markScenarioChosen(scenario.id, clientId);
      setChosenAt(new Date().toISOString());
      setConfirmingChosen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark this scenario as chosen.");
    } finally {
      setMarking(false);
    }
  }

  async function handleUndoChosen() {
    setMarking(true);
    setError("");
    try {
      await undoScenarioChosen(scenario.id, clientId);
      setChosenAt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not undo.");
    } finally {
      setMarking(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteScenario(scenario.id, clientId);
      router.push(`/clients/${clientId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this scenario.");
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {converted && (
        <div className="rounded-lg border border-[#1E6B3C] bg-[#EEF6F0] px-4 py-3 text-sm text-[#1E6B3C]">
          ✓ Converted to a Product on {clientName}&rsquo;s profile.{" "}
          <a href={`/clients/${clientId}/illustrations/${scenario.converted_product_id}`} className="underline hover:text-[#154d2a]">
            View the Illustration Summary
          </a>{" "}
          ; this scenario is kept as a record of how you got there.
        </div>
      )}

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Scenario Details</h2>
        <p className="mb-4 text-xs text-[#707070]">
          {scenario.product_type ?? "Product type"}: the product type was set when this scenario was created and
          can&rsquo;t be changed here (delete and start a new one if it was picked wrong).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Product name
            <input
              value={productName}
              onChange={(e) => handleProductNameChange(e.target.value)}
              list="scenario-product-suggestions"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Carrier
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputClass} />
          </label>
        </div>
        <datalist id="scenario-product-suggestions">
          {KB_PRODUCTS.map((p) => (
            <option key={p.name} value={p.name} />
          ))}
        </datalist>
      </div>

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {data.kind === "cash_value" && <CashValueBudgetsSection data={data} setData={setData} />}

        {data.kind === "term" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <p className="mb-4 text-xs text-[#707070]">
              Add up to 2 more death benefit/premium/term options below so a client can see a few budget tiers
              side by side, e.g. $500,000 vs. $1,000,000.
            </p>
            {/* Added 9/25 per Karina: "we should make an option on the portal for the advisor to pick
                monthly, annual, semi-annual and quarterly" — one frequency for the whole scenario, not
                per option, since every option here is the same policy just quoted a few ways. Mirrors
                the annuity_contribution_frequency select on ProductRow.tsx (same values/labels). */}
            <div className="mb-4 max-w-xs">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Premium Frequency
                <select
                  value={data.premiumFrequency ?? "monthly"}
                  onChange={(e) => setData({ ...data, premiumFrequency: e.target.value as TermIllustration["premiumFrequency"] })}
                  className={inputClass}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Every 6 months</option>
                  <option value="annual">Annually</option>
                </select>
              </label>
            </div>
            <TermOptionsEditor data={data} setData={setData} />
            {/* Two-tier conversion window, mirroring the same conversion_deadline / final_conversion_deadline
                split already used for Outreach milestones (see getNextOutreachMilestone in lib/products.ts) —
                Karina, 9/25: "i ned the convertable max age and note medical exame needed" once she saw the
                single "Convertible Without Exam Until" field didn't capture that a policy can often still be
                converted past that age, just with a new medical exam required. */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="max-w-xs flex-1">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Convertible Without Exam Until
                  <input
                    value={data.conversionDeadline}
                    onChange={(e) => setData({ ...data, conversionDeadline: e.target.value })}
                    placeholder="e.g. age 65"
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="max-w-xs flex-1">
                <label className="flex flex-col gap-1 text-xs text-[#666]">
                  Convertible With Exam Until
                  <input
                    value={data.finalConversionDeadline ?? ""}
                    onChange={(e) => setData({ ...data, finalConversionDeadline: e.target.value })}
                    placeholder="e.g. age 75"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-[#666]">Living Benefits &amp; Riders</div>
              <RidersField value={data.riders} onChange={(riders) => setData({ ...data, riders })} />
            </div>
          </>
        )}

        {data.kind === "final_expense" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <p className="mb-4 text-xs text-[#707070]">
              Final expense is guaranteed- or simplified-issue: the death benefit and premium are both locked for
              life, so there&rsquo;s no guaranteed vs. non-guaranteed split to enter here. Add up to 2 more
              face-value/premium options below, either a bigger budget tier of this same product, or name a
              different product/carrier entirely (e.g. comparing TruStage vs. Living Promise vs. Banner Life side
              by side) so a client can glance at all of it at once.
            </p>
            {/* Added 9/25 per Karina — see the matching Premium Frequency select on the Term section
                above for the full comment; same field, same reasoning, mirrored here since Final
                Expense is its own kind. Undefined reads as monthly, matching the old hardcoded "/mo". */}
            <div className="mb-4 max-w-xs">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Premium Frequency
                <select
                  value={data.premiumFrequency ?? "monthly"}
                  onChange={(e) => setData({ ...data, premiumFrequency: e.target.value as FinalExpenseIllustration["premiumFrequency"] })}
                  className={inputClass}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Every 6 months</option>
                  <option value="annual">Annually</option>
                </select>
              </label>
            </div>
            <FinalExpenseOptionsEditor data={data} setData={setData} />
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-[#666]">Riders</div>
              <RidersField value={data.riders} onChange={(riders) => setData({ ...data, riders })} />
            </div>
          </>
        )}

        {data.kind === "annuity" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <div className="mb-5 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Initial Premium
                <DollarInput value={data.initialPremium} onChange={(v) => setData({ ...data, initialPremium: v })} className={inputClass} />
              </label>
              {/* Term Length — added 9/25 per Karina: "we need a spot for how many year annuity it
                  is." Free text since carriers sell the same FIA in several term variants (e.g.
                  Athene Performance Elite 7 vs 10 vs 15) with different caps. */}
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Term Length
                <input
                  value={data.termLength ?? ""}
                  onChange={(e) => setData({ ...data, termLength: e.target.value })}
                  placeholder="e.g. 10-Year"
                  className={inputClass}
                />
              </label>
              {/* Cap Rate — added 9/25 per Karina: "also need to show the current cap rate." Shows
                  as a disclosure line above the milestones table on the exported PDF, since the
                  Accumulation Value numbers are driven by this assumption. Strategy name is
                  optional — only the rate itself is required for the disclosure to appear. */}
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Current Cap Rate
                <input
                  value={data.capRate ?? ""}
                  onChange={(e) => setData({ ...data, capRate: e.target.value })}
                  placeholder="e.g. 9.75%"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Cap Rate Strategy
                <input
                  value={data.capRateStrategy ?? ""}
                  onChange={(e) => setData({ ...data, capRateStrategy: e.target.value })}
                  placeholder="e.g. S&P 500 Annual Point-to-Point"
                  className={inputClass}
                />
              </label>
            </div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Milestones</h2>
            <p className="mb-4 text-xs text-[#707070]">
              Accumulation value, income value (if there&rsquo;s an income rider), and death benefit at whichever
              years/ages matter for this scenario.
            </p>
            <AnnuityMilestonesEditor
              milestones={data.milestones}
              onChange={(milestones) => setData({ ...data, milestones })}
            />

            <div className="mt-5 rounded-md border border-[#D9CFBA] p-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#2E2E2E]">
                <input
                  type="checkbox"
                  checked={!!data.hasIncomeRider}
                  onChange={(e) =>
                    setData({
                      ...data,
                      hasIncomeRider: e.target.checked,
                      incomeStartTiming: e.target.checked ? data.incomeStartTiming ?? "immediate" : data.incomeStartTiming,
                    })
                  }
                  className="h-3.5 w-3.5"
                />
                This annuity has an income rider
              </label>

              {data.hasIncomeRider && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex gap-4 text-xs text-[#666]">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="income-start-timing"
                        checked={(data.incomeStartTiming ?? "immediate") === "immediate"}
                        onChange={() => setData({ ...data, incomeStartTiming: "immediate" })}
                      />
                      Starts immediately
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="income-start-timing"
                        checked={data.incomeStartTiming === "deferred"}
                        onChange={() => setData({ ...data, incomeStartTiming: "deferred" })}
                      />
                      Starts at a future age
                    </label>
                  </div>

                  <div className="grid max-w-md grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.incomeStartTiming === "deferred" && (
                      <label className="flex flex-col gap-1 text-xs text-[#666]">
                        Age Income Starts
                        <input
                          value={data.incomeStartAge ?? ""}
                          onChange={(e) => setData({ ...data, incomeStartAge: e.target.value })}
                          placeholder="e.g. 65"
                          className={inputClass}
                        />
                      </label>
                    )}
                    <label className="flex flex-col gap-1 text-xs text-[#666]">
                      Monthly Income Amount
                      <DollarInput
                        value={data.incomeMonthlyAmount ?? ""}
                        onChange={(v) => setData({ ...data, incomeMonthlyAmount: v })}
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <p className="max-w-md text-[11px] text-[#8b6a00]">
                    Whatever accumulation value is left unused when the client passes goes to the
                    beneficiary as a death benefit. But unlike a life insurance death benefit, this
                    isn&rsquo;t automatically fully tax-free. Only the return of principal (what was
                    originally paid in) passes tax-free; any growth above that is taxed to the
                    beneficiary as ordinary income (a qualified/IRA annuity is generally taxed in
                    full). Confirm the specifics on the carrier&rsquo;s illustration and with a tax
                    advisor for the client&rsquo;s situation.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <label className="mt-5 flex flex-col gap-1 text-xs text-[#666]">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything else worth flagging on the summary"
            className={inputClass}
          />
        </label>

        {error && <p className="mt-3 text-xs text-[#8B1A1A]">{error}</p>}

        <p className="mt-3 text-[11px] text-[#8b8b8b]">Changes save automatically as you type.</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={status === "saving"}
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleView}
            className="rounded-md border border-[#D9CFBA] px-4 py-2 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            View Summary
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-md border border-[#D9CFBA] px-4 py-2 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Download PDF Summary
          </button>
          {status === "saved" && <p className="text-xs font-semibold text-[#1E6B3C]">Saved ✓</p>}
        </div>
      </div>

      {!converted && chosenAt && (
        <div className="rounded-lg border border-[#1E6B3C] bg-[#EEF6F0] p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#1E6B3C]">Client Decided</h2>
          <p className="mb-2 text-xs text-[#175530]">
            ✓ {clientName.split(" ")[0] || "The client"} chose this option on{" "}
            {new Date(chosenAt).toLocaleDateString(undefined, { dateStyle: "medium" })}, on record in case this
            ever needs revisiting. Add the real Product on their profile below with the details they actually went
            with (nothing here copies over automatically).
          </p>
          <button
            type="button"
            disabled={marking}
            onClick={handleUndoChosen}
            className="text-xs text-[#707070] underline hover:text-[#1C1C1C] disabled:opacity-60"
          >
            Undo
          </button>
        </div>
      )}

      {!converted && !chosenAt && (
        <div className="rounded-lg border border-[#1C1C1C] bg-[#F5F0E8] p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#1C1C1C]">Client Decided?</h2>
          <p className="mb-3 text-xs text-[#555]">
            Mark it when {clientName.split(" ")[0] || "the client"} actually goes with this option; this just puts
            a date on record for &ldquo;here&rsquo;s what we presented, here&rsquo;s what they chose,&rdquo; it does
            not create anything. Add the real Product on their profile yourself with the details they actually went
            with (issue date, policy number, actual premium).
          </p>
          {!confirmingChosen ? (
            <button
              type="button"
              onClick={() => setConfirmingChosen(true)}
              className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              This Is What They&rsquo;re Going With →
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#1C1C1C]">Mark this as what {clientName} chose, today?</span>
              <button
                type="button"
                disabled={marking}
                onClick={handleMarkChosen}
                className="rounded-md bg-[#1E6B3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#175530] disabled:opacity-60"
              >
                {marking ? "Saving…" : "Yes, Mark Chosen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingChosen(false)}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-[#EDE8DF] pt-4">
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
          >
            Delete this scenario
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#8B1A1A]">Delete this scenario? This can&rsquo;t be undone.</span>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414]"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
