"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DollarInput from "../../DollarInput";
import RidersField from "../../RidersField";
import {
  emptyCashValueMilestone,
  emptyAnnuityMilestone,
  type IllustrationData,
  type CashValueMilestone,
  type AnnuityMilestone,
} from "@/lib/illustration";
import { generateScenarioIllustrationPDF, type AdvisorInfo } from "@/lib/illustration-pdf";

const MAX_CASH_VALUE_MILESTONES = 5;
import { saveScenario, convertScenarioToProduct, deleteScenario } from "../actions";

interface Scenario {
  id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
  data: IllustrationData;
  notes: string | null;
  converted_product_id: string | null;
}

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]";

// Duplicated from illustrations/[productId]/IllustrationForm.tsx rather than shared — same
// pattern used elsewhere in this app (e.g. the two MeetingRow components) so the existing,
// working per-product illustration flow can never be affected by changes made here.
// Reworked 9/1 per Karina: a scenario milestone is just Age → Cash Value → Death Benefit — one
// number each, not a Guaranteed/Non-Guaranteed grid. Cash Value shown here is the non-guaranteed
// figure (stored in the existing cvNonGuaranteed field); Death Benefit is guaranteed from day one
// (stored in dbGuaranteed). cvGuaranteed/dbNonGuaranteed are left blank and unused for scenarios —
// kept in the shared type only so this stays compatible with the original per-product Illustration
// flow, which is untouched. Capped at 5 milestones — Karina's real usage is 3-4 (e.g. 18/35/65).
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
          <div className="grid grid-cols-[1fr_1.4fr_1.4fr_auto] items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              {i === 0 ? "Age" : `Age (Milestone ${i + 1})`}
              <input
                value={m.label}
                onChange={(e) => update(m.id, { label: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="e.g. 18"
                inputMode="numeric"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Cash Value
              <DollarInput value={m.cvNonGuaranteed} onChange={(v) => update(m.id, { cvNonGuaranteed: v })} className={inputClass + " w-full"} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit
              <DollarInput value={m.dbGuaranteed} onChange={(v) => update(m.id, { dbGuaranteed: v })} className={inputClass + " w-full"} />
            </label>
            {milestones.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(m.id)}
                className="mb-1.5 text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Remove
              </button>
            ) : (
              <span />
            )}
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
        <p className="text-xs text-[#999]">Maximum of {MAX_CASH_VALUE_MILESTONES} milestones.</p>
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
              placeholder={`Milestone ${i + 1} — e.g. Year 10`}
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
          <div className="grid grid-cols-3 gap-2">
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

export default function ScenarioForm({
  clientId,
  clientName,
  scenario,
  advisor,
}: {
  clientId: string;
  clientName: string;
  scenario: Scenario;
  advisor?: AdvisorInfo;
}) {
  const router = useRouter();
  const [productName, setProductName] = useState(scenario.product_name);
  const [carrier, setCarrier] = useState(scenario.carrier ?? "");
  const [data, setData] = useState<IllustrationData>(scenario.data);
  const [notes, setNotes] = useState(scenario.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [confirmingConvert, setConfirmingConvert] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const converted = !!scenario.converted_product_id;

  async function handleSave() {
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
  }

  function handleDownload() {
    generateScenarioIllustrationPDF({
      clientName,
      productName,
      carrier: carrier.trim() || null,
      productType: scenario.product_type,
      data,
      advisor,
    });
  }

  async function handleConvert() {
    setConverting(true);
    setError("");
    try {
      // Save whatever's currently on screen first, so the product's own illustration starts
      // from the latest numbers rather than whatever was last saved.
      await saveScenario(scenario.id, clientId, { product_name: productName, carrier, notes }, data);
      const productId = await convertScenarioToProduct(scenario.id, clientId);
      router.push(`/clients/${clientId}/illustrations/${productId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not convert this scenario to a product.");
      setConverting(false);
      setConfirmingConvert(false);
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
          — this scenario is kept as a record of how you got there.
        </div>
      )}

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Scenario Details</h2>
        <p className="mb-4 text-xs text-[#888]">
          {scenario.product_type ?? "Product type"} — the product type was set when this scenario was created and
          can&rsquo;t be changed here (delete and start a new one if it was picked wrong).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Product name
            <input value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Carrier
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputClass} />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {data.kind === "cash_value" && (
          <>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Death Benefit Increase</h2>
            <p className="mb-2 text-xs text-[#888]">
              If the death benefit steps up at a later age (common on some IUL designs, especially juvenile
              policies), note that age here so it&rsquo;s called out on the summary. Leave blank if it doesn&rsquo;t apply.
            </p>
            <label className="mb-5 flex max-w-[200px] flex-col gap-1 text-xs text-[#666]">
              Age it increases (optional)
              <input
                value={data.dbIncreaseAge ?? ""}
                onChange={(e) => setData({ ...data, dbIncreaseAge: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="e.g. 20"
                inputMode="numeric"
                className={inputClass}
              />
            </label>

            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Milestones</h2>
            <p className="mb-4 text-xs text-[#888]">
              For each age that matters, enter the illustrated Cash Value (non-guaranteed) and Death Benefit
              (guaranteed from day one) — pull both straight from the carrier&rsquo;s illustration.
            </p>
            <CashValueMilestonesEditor
              milestones={data.milestones}
              onChange={(milestones) => setData({ ...data, milestones })}
            />
          </>
        )}

        {data.kind === "term" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <div className="grid grid-cols-2 gap-3">
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
                  placeholder="e.g. 20 years"
                  className={inputClass}
                />
              </label>
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
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-[#666]">Living Benefits &amp; Riders</div>
              <RidersField value={data.riders} onChange={(riders) => setData({ ...data, riders })} />
            </div>
          </>
        )}

        {data.kind === "final_expense" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <p className="mb-4 text-xs text-[#888]">
              Final expense is guaranteed- or simplified-issue — the death benefit and premium are both locked for
              life, so there&rsquo;s no guaranteed vs. non-guaranteed split to enter here.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Guaranteed Death Benefit
                <DollarInput value={data.deathBenefit} onChange={(v) => setData({ ...data, deathBenefit: v })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[#666]">
                Guaranteed Level Premium
                <DollarInput value={data.levelPremium} onChange={(v) => setData({ ...data, levelPremium: v })} className={inputClass} />
              </label>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-[#666]">Riders</div>
              <RidersField value={data.riders} onChange={(riders) => setData({ ...data, riders })} />
            </div>
          </>
        )}

        {data.kind === "annuity" && (
          <>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#555]">Policy Details</h2>
            <label className="mb-4 flex max-w-xs flex-col gap-1 text-xs text-[#666]">
              Initial Premium
              <DollarInput value={data.initialPremium} onChange={(v) => setData({ ...data, initialPremium: v })} className={inputClass} />
            </label>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Milestones</h2>
            <p className="mb-4 text-xs text-[#888]">
              Accumulation value, income value (if there&rsquo;s an income rider), and death benefit at whichever
              years/ages matter for this scenario.
            </p>
            <AnnuityMilestonesEditor
              milestones={data.milestones}
              onChange={(milestones) => setData({ ...data, milestones })}
            />
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
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
            onClick={handleDownload}
            className="rounded-md border border-[#D9CFBA] px-4 py-2 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Download PDF Summary
          </button>
          {status === "saved" && <p className="text-xs font-semibold text-[#1E6B3C]">Saved ✓</p>}
        </div>
      </div>

      {!converted && (
        <div className="rounded-lg border border-[#1C1C1C] bg-[#F5F0E8] p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#1C1C1C]">Client Decided?</h2>
          <p className="mb-3 text-xs text-[#555]">
            Once {clientName.split(" ")[0] || "the client"} actually goes with this option, promote it to a real
            Product on their profile — it carries this name, carrier, and these exact numbers over as the
            product&rsquo;s own Illustration Summary, so nothing needs to be re-entered.
          </p>
          {!confirmingConvert ? (
            <button
              type="button"
              onClick={() => setConfirmingConvert(true)}
              className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              This Is What They&rsquo;re Going With →
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#1C1C1C]">Create this as a real Product on {clientName}&rsquo;s profile?</span>
              <button
                type="button"
                disabled={converting}
                onClick={handleConvert}
                className="rounded-md bg-[#1E6B3C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#175530] disabled:opacity-60"
              >
                {converting ? "Converting…" : "Yes, Convert"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingConvert(false)}
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
