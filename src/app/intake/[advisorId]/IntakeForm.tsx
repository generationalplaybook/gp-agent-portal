"use client";

import { useState } from "react";
import PhoneInput from "../../(app)/clients/PhoneInput";
import CurrencyInput from "../../(app)/client-analyzer/CurrencyInput";
import {
  calcAgeFromDob,
  GOAL_OPTIONS,
  PERIODIC_FREQUENCY_OPTIONS,
  type AnalyzerInputs,
  type Goal,
} from "@/lib/analyzer";
import { submitIntake, type IntakeFamilyInput } from "./actions";

function OptionGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border-[1.5px] px-4 py-2 text-sm transition ${
            value === opt.value
              ? "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4]"
              : "border-[#D9CFBA] bg-white text-[#2E2E2E] hover:border-[#2E2E2E]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  function toggle(v: T) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={checked}
            className={`rounded-lg border-[1.5px] px-4 py-2 text-sm transition ${
              checked
                ? "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4]"
                : "border-[#D9CFBA] bg-white text-[#2E2E2E] hover:border-[#2E2E2E]"
            }`}
          >
            {checked ? "✓ " : ""}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-sm font-semibold text-[#1C1C1C]">
        {label}
        {optional && (
          <span className="ml-1.5 rounded-full bg-[#F5F0E8] px-2 py-0.5 text-[10px] font-normal text-[#999]">
            optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C] w-full";

const EMPTY_CONTACT = { firstName: "", middleName: "", lastName: "" };

const EMPTY_INPUTS: AnalyzerInputs = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  heightFt: "",
  heightIn: "",
  weight: "",
  goals: [],
};

const EMPTY_FAMILY: IntakeFamilyInput = { spouse: false, children: false, childrenAges: "", dependents: false };

export default function IntakeForm({ advisorId, advisorName }: { advisorId: string; advisorName: string }) {
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [inputs, setInputs] = useState<AnalyzerInputs>(EMPTY_INPUTS);
  const [family, setFamily] = useState<IntakeFamilyInput>(EMPTY_FAMILY);
  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const age = calcAgeFromDob(inputs.dob);

  function set<K extends keyof AnalyzerInputs>(key: K, value: AnalyzerInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const req: string[] = [];
    if (!contact.firstName.trim()) req.push("First Name");
    if (!contact.lastName.trim()) req.push("Last Name");
    if (!inputs.dob) req.push("Date of Birth");
    if (!inputs.phone.trim()) req.push("Phone Number");
    if (!inputs.email.trim()) req.push("Email");
    if (!inputs.heightFt) req.push("Height");
    if (!inputs.weight) req.push("Weight");

    if (req.length) {
      setMissing(req);
      return;
    }
    setMissing([]);
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await submitIntake(advisorId, contact, inputs, family);
      if (res.ok) {
        setDone(true);
      } else {
        setSubmitError(res.error);
      }
    } catch {
      setSubmitError("Something went wrong submitting this form — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-8 text-center">
        <div className="mb-2 text-lg font-semibold text-[#1C1C1C]">Thank you!</div>
        <p className="text-sm text-[#666]">
          {advisorName} will review this before your meeting and reach out to confirm the details.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#888]">Your Info</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="First Name">
          <input
            value={contact.firstName}
            onChange={(e) => setContact((c) => ({ ...c, firstName: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="Middle Name" optional>
          <input
            value={contact.middleName}
            onChange={(e) => setContact((c) => ({ ...c, middleName: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="Last Name">
          <input
            value={contact.lastName}
            onChange={(e) => setContact((c) => ({ ...c, lastName: e.target.value }))}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of Birth">
          <input type="date" value={inputs.dob} onChange={(e) => set("dob", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone Number">
          <PhoneInput defaultValue={inputs.phone} onValueChange={(v) => set("phone", v)} className={inputClass} />
        </Field>
      </div>
      {age !== null && <div className="-mt-3 mb-4 text-xs text-[#888]">Age: {age} years old</div>}

      <Field label="Email">
        <input
          type="email"
          value={inputs.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="you@email.com"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Height (ft)">
          <input
            type="number"
            value={inputs.heightFt}
            onChange={(e) => set("heightFt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Height (in)">
          <input
            type="number"
            value={inputs.heightIn}
            onChange={(e) => set("heightIn", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Weight (lbs)">
          <input
            type="number"
            value={inputs.weight}
            onChange={(e) => set("weight", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-[#888]">Family (optional)</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />
      <Field label="Household">
        <div className="mb-1.5 text-xs text-[#888]">Check anything that applies — just so we know who else might be part of the conversation.</div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "spouse", label: "Spouse" },
              { key: "children", label: "Children" },
              { key: "dependents", label: "Aging parent(s) or other dependents" },
            ] as const
          ).map((opt) => {
            const checked = family[opt.key];
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFamily((f) => ({ ...f, [opt.key]: !f[opt.key] }))}
                aria-pressed={checked}
                className={`rounded-lg border-[1.5px] px-4 py-2 text-sm transition ${
                  checked
                    ? "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4]"
                    : "border-[#D9CFBA] bg-white text-[#2E2E2E] hover:border-[#2E2E2E]"
                }`}
              >
                {checked ? "✓ " : ""}
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>
      {family.children && (
        <Field label="Ages of Children" optional>
          <input
            value={family.childrenAges}
            onChange={(e) => setFamily((f) => ({ ...f, childrenAges: e.target.value }))}
            placeholder="e.g. 5, 8, 14"
            className={inputClass + " max-w-xs"}
          />
        </Field>
      )}

      <div className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-[#888]">Health (optional)</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <Field label="Tobacco Use">
        <OptionGroup
          value={inputs.tobacco}
          onChange={(v) => set("tobacco", v)}
          options={[
            { value: "none", label: "Never used" },
            { value: "former", label: "Former user (12+ months clean)" },
            { value: "current", label: "Current user" },
            { value: "marijuana", label: "Marijuana use (no tobacco)" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      <Field label="Health Conditions">
        <OptionGroup
          value={inputs.health}
          onChange={(v) => set("health", v)}
          options={[
            { value: "none", label: "None / good health" },
            { value: "managed", label: "Managed condition (controlled with medication)" },
            { value: "significant", label: "Significant condition" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      <Field label="Previously Declined or Rated?">
        <OptionGroup
          value={inputs.declined}
          onChange={(v) => set("declined", v)}
          options={[
            { value: "no", label: "No" },
            { value: "rated", label: "Rated (approved but at higher cost)" },
            { value: "declined", label: "Declined before" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>

      <div className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-[#888]">Financial (optional)</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <Field label="Existing Coverage / Products" optional>
        <textarea
          value={inputs.existingCoverage ?? ""}
          onChange={(e) => set("existingCoverage", e.target.value)}
          rows={2}
          placeholder="What do you already have? e.g. a term policy through work, an old annuity..."
          className={inputClass}
        />
      </Field>

      <Field label="Money Type">
        <OptionGroup
          value={inputs.money}
          onChange={(v) => set("money", v)}
          options={[
            { value: "qualified", label: "Qualified (401k / IRA / pension)" },
            { value: "nonqualified", label: "Non-qualified (personal savings / cash)" },
            { value: "both", label: "Mix of both" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      <Field label="Other Retirement Accounts?">
        <OptionGroup
          value={inputs.otherRetirement}
          onChange={(v) => set("otherRetirement", v)}
          options={[
            { value: "yes", label: "Yes — has other retirement accounts" },
            { value: "no", label: "No" },
            { value: "skip", label: "Unsure" },
          ]}
        />
      </Field>
      {inputs.otherRetirement === "yes" && (
        <Field label="Approximate Other Retirement Amount">
          <input
            value={inputs.otherAmount ?? ""}
            onChange={(e) => set("otherAmount", e.target.value)}
            placeholder="e.g. $85,000"
            className={inputClass + " max-w-xs"}
          />
        </Field>
      )}
      <Field label="Funding Method">
        <OptionGroup
          value={inputs.funding}
          onChange={(v) => set("funding", v)}
          options={[
            { value: "monthly", label: "Monthly premiums" },
            { value: "lumpsum", label: "One-time lump sum" },
            { value: "both", label: "Both" },
            { value: "periodic", label: "Periodic (a few times a year, e.g. tax-driven)" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      {(inputs.funding === "monthly" || inputs.funding === "both") && (
        <Field label="Monthly Budget">
          <CurrencyInput
            value={inputs.monthlyBudget ?? ""}
            onChange={(v) => set("monthlyBudget", v)}
            placeholder="e.g. $300/month"
            className={inputClass + " max-w-xs"}
          />
        </Field>
      )}
      {(inputs.funding === "lumpsum" || inputs.funding === "both") && (
        <Field label="Lump Sum Amount">
          <CurrencyInput
            value={inputs.lumpSumAmount ?? ""}
            onChange={(v) => set("lumpSumAmount", v)}
            placeholder="e.g. $100,000"
            className={inputClass + " max-w-xs"}
          />
        </Field>
      )}
      {inputs.funding === "periodic" && (
        <>
          <Field label="Periodic Contribution Amount">
            <CurrencyInput
              value={inputs.periodicAmount ?? ""}
              onChange={(v) => set("periodicAmount", v)}
              placeholder="e.g. $20,000 per contribution"
              className={inputClass + " max-w-xs"}
            />
          </Field>
          <Field label="How Often" optional>
            <OptionGroup
              value={inputs.periodicFrequency}
              onChange={(v) => set("periodicFrequency", v)}
              options={[...PERIODIC_FREQUENCY_OPTIONS, { value: "skip", label: "Unsure" }]}
            />
          </Field>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Annual Income" optional>
          <CurrencyInput
            value={inputs.income ?? ""}
            onChange={(v) => set("income", v)}
            placeholder="e.g. $75,000.00"
            className={inputClass}
          />
        </Field>
        <Field label="Total Debt" optional>
          <CurrencyInput
            value={inputs.debt ?? ""}
            onChange={(v) => set("debt", v)}
            placeholder="Mortgage, loans, credit cards"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-[#888]">Goals (optional)</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <Field label="Primary Goal(s)">
        <div className="mb-1.5 text-xs text-[#888]">Select anything that applies.</div>
        <CheckboxGroup<Goal> value={inputs.goals ?? []} onChange={(v) => set("goals", v)} options={GOAL_OPTIONS} />
      </Field>
      <Field label="Time Horizon">
        <OptionGroup
          value={inputs.horizon}
          onChange={(v) => set("horizon", v)}
          options={[
            { value: "short", label: "1–5 years" },
            { value: "mid", label: "5–15 years" },
            { value: "long", label: "15+ years / retirement" },
            { value: "never", label: "Never — leaving to heirs" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      <Field label="Risk Tolerance">
        <OptionGroup
          value={inputs.risk}
          onChange={(v) => set("risk", v)}
          options={[
            { value: "guaranteed", label: "Fully guaranteed — no market exposure" },
            { value: "protected", label: "Market-linked but protected — 0% floor" },
            { value: "growth", label: "Growth focused — some risk okay" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>
      <Field label="Needs Access Before 59½?">
        <OptionGroup
          value={inputs.earlyAccess}
          onChange={(v) => set("earlyAccess", v)}
          options={[
            { value: "yes", label: "Yes — needs flexible access" },
            { value: "no", label: "No — can wait until 59½+" },
            { value: "both", label: "Mix of both" },
            { value: "skip", label: "Skip" },
          ]}
        />
      </Field>

      {missing.length > 0 && (
        <p className="mb-3 text-sm text-[#8B1A1A]">Please fill in the required fields: {missing.join(", ")}.</p>
      )}
      {submitError && <p className="mb-3 text-sm text-[#8B1A1A]">{submitError}</p>}

      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="mt-2 rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
