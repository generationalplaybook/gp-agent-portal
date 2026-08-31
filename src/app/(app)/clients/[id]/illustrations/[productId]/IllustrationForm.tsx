"use client";

import { useState } from "react";
import DollarInput from "../../DollarInput";
import RidersField from "../../RidersField";
import {
  emptyIllustrationFor,
  emptyCashValueMilestone,
  emptyAnnuityMilestone,
  type IllustrationData,
  type CashValueMilestone,
  type AnnuityMilestone,
} from "@/lib/illustration";
import { generateIllustrationPDF, type AdvisorInfo } from "@/lib/illustration-pdf";
import { saveIllustration } from "../actions";

interface Product {
  id: string;
  product_name: string;
  product_type: string | null;
  carrier: string | null;
}

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]";

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
          <div className="mb-2 flex items-center gap-2">
            <input
              value={m.label}
              onChange={(e) => update(m.id, { label: e.target.value })}
              placeholder={`Milestone ${i + 1} — e.g. Age 18`}
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
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Cash Value — Guaranteed
              <DollarInput value={m.cvGuaranteed} onChange={(v) => update(m.id, { cvGuaranteed: v })} className={inputClass + " w-full"} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Cash Value — Non-Guaranteed
              <DollarInput
                value={m.cvNonGuaranteed}
                onChange={(v) => update(m.id, { cvNonGuaranteed: v })}
                className={inputClass + " w-full"}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit — Guaranteed
              <DollarInput value={m.dbGuaranteed} onChange={(v) => update(m.id, { dbGuaranteed: v })} className={inputClass + " w-full"} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Death Benefit — Non-Guaranteed
              <DollarInput
                value={m.dbNonGuaranteed}
                onChange={(v) => update(m.id, { dbNonGuaranteed: v })}
                className={inputClass + " w-full"}
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...milestones, emptyCashValueMilestone()])}
        className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
      >
        + Add Milestone
      </button>
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

export default function IllustrationForm({
  clientId,
  clientName,
  product,
  initialData,
  advisor,
}: {
  clientId: string;
  clientName: string;
  product: Product;
  initialData: IllustrationData | null;
  advisor?: AdvisorInfo;
}) {
  const [data, setData] = useState<IllustrationData>(initialData ?? emptyIllustrationFor(product.product_type));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function handleSave() {
    setStatus("saving");
    setError("");
    try {
      await saveIllustration(clientId, product.id, product.product_type, data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save illustration.");
      setStatus("idle");
    }
  }

  function handleDownload() {
    generateIllustrationPDF({
      clientName,
      productName: product.product_name,
      carrier: product.carrier,
      productType: product.product_type,
      data,
      advisor,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        {data.kind === "cash_value" && (
          <>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Milestones</h2>
            <p className="mb-4 text-xs text-[#888]">
              Enter cash value and death benefit at whichever ages matter for this case — pull the numbers straight
              from the carrier&rsquo;s illustration.
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
              years/ages matter for this case.
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
            value={data.notes}
            onChange={(e) => setData({ ...data, notes: e.target.value })}
            rows={2}
            placeholder="Anything else worth flagging on the summary"
            className={inputClass}
          />
        </label>

        {error && <p className="mt-3 text-xs text-[#8B1A1A]">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
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
    </div>
  );
}
