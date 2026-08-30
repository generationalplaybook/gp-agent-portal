"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "../clients/PhoneInput";
import CurrencyInput from "./CurrencyInput";
import {
  runAnalyzer,
  calcAgeFromDob,
  GOAL_OPTIONS,
  type AnalyzerInputs,
  type AnalyzerResult,
  type Goal,
} from "@/lib/analyzer";
import { generateClientPDF, type AdvisorInfo } from "@/lib/analyzer-pdf";
import { saveAnalysisToClient, saveAnalysisAsNewClient } from "./actions";

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

const inputClass =
  "rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C] w-full";

const EMPTY: AnalyzerInputs = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  heightFt: "",
  heightIn: "",
  weight: "",
  goals: [],
};

interface ExistingClient {
  id: string;
  full_name: string;
}

interface PrefillClient {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  // Product names already on file for this client (from their Products section), joined into
  // a starting string for Existing Coverage — editable, not locked to what's on record.
  existingCoverage?: string;
}

export default function AnalyzerClient({
  advisor,
  existingClients = [],
  prefillClient = null,
}: {
  advisor?: AdvisorInfo;
  existingClients?: ExistingClient[];
  prefillClient?: PrefillClient | null;
}) {
  const router = useRouter();
  const [inputs, setInputs] = useState<AnalyzerInputs>(() =>
    prefillClient
      ? {
          ...EMPTY,
          name: prefillClient.full_name,
          phone: prefillClient.phone ?? "",
          email: prefillClient.email ?? "",
          dob: prefillClient.birth_date ?? "",
          existingCoverage: prefillClient.existingCoverage ?? "",
        }
      : EMPTY
  );
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>(prefillClient?.id ?? "");
  const [savingNew, setSavingNew] = useState(false);
  const [savingExisting, setSavingExisting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; message: string; clientId?: string } | null>(
    null
  );

  const age = useMemo(() => calcAgeFromDob(inputs.dob), [inputs.dob]);

  function set<K extends keyof AnalyzerInputs>(key: K, value: AnalyzerInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    const req: string[] = [];
    if (!inputs.name.trim()) req.push("Client Name");
    if (!inputs.dob) req.push("Date of Birth");
    if (!inputs.phone.trim()) req.push("Phone Number");
    if (!inputs.email.trim()) req.push("Email");
    if (!inputs.heightFt) req.push("Height");
    if (!inputs.weight) req.push("Weight");

    if (req.length) {
      setMissing(req);
      setResult(null);
      return;
    }
    setMissing([]);
    setSaveStatus(null);
    setResult(runAnalyzer(inputs));
  }

  function handleReset() {
    setInputs(EMPTY);
    setResult(null);
    setMissing([]);
    setSaveStatus(null);
    setSelectedClientId("");
  }

  async function handleSaveAsNewClient() {
    if (!result) return;
    setSavingNew(true);
    setSaveStatus(null);
    try {
      const newId = await saveAnalysisAsNewClient(inputs, result);
      setSaveStatus({ ok: true, message: "New client created and analysis saved.", clientId: newId });
      router.refresh();
    } catch (e) {
      setSaveStatus({ ok: false, message: e instanceof Error ? e.message : "Could not save analysis." });
    } finally {
      setSavingNew(false);
    }
  }

  async function handleSaveToExisting() {
    if (!result) return;
    if (!selectedClientId) {
      setSaveStatus({ ok: false, message: "Choose a client to save this analysis to." });
      return;
    }
    setSavingExisting(true);
    setSaveStatus(null);
    try {
      await saveAnalysisToClient(selectedClientId, inputs, result);
      setSaveStatus({ ok: true, message: "Analysis saved to client profile.", clientId: selectedClientId });
      router.refresh();
    } catch (e) {
      setSaveStatus({ ok: false, message: e instanceof Error ? e.message : "Could not save analysis." });
    } finally {
      setSavingExisting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#888]">Client Info</div>
        <div className="mb-5 h-px bg-[#D9CFBA]" />

        <Field label="Client Name">
          <input
            value={inputs.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
        </Field>

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
            placeholder="client@email.com"
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
            placeholder="What do they already have? e.g. a term policy through work, an old annuity, a whole life policy..."
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
          <div className="mb-1.5 text-xs text-[#888]">
            Select one or more — we&rsquo;ll build a full recommendation for each goal chosen.
          </div>
          <CheckboxGroup<Goal>
            value={inputs.goals ?? []}
            onChange={(v) => set("goals", v)}
            options={GOAL_OPTIONS}
          />
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

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            Get Recommendation
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-[#D9CFBA] px-5 py-2.5 text-sm text-[#2E2E2E] hover:bg-[#F5F0E8]"
          >
            Reset
          </button>
        </div>
      </div>

      <div>
        {result ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border-l-4 border-[#2E2E2E] bg-[#EDE8DF] p-4">
              <div className="text-sm text-[#2E2E2E]">
                <strong>{result.name}</strong>
                {result.age !== null && <> &middot; Age {result.age}</>}
              </div>
              <div className="mt-1 text-xs text-[#666]">
                {result.phone}
                {result.email && <> &middot; {result.email}</>}
              </div>
              {result.existingCoverage && (
                <div className="mt-2 text-xs text-[#666]">
                  <strong>Existing coverage:</strong> {result.existingCoverage}
                </div>
              )}
              {(result.monthlyBudget || result.lumpSumAmount) && (
                <div className="mt-2 text-xs text-[#666]">
                  <strong>Funding:</strong>{" "}
                  {[
                    result.monthlyBudget && `${result.monthlyBudget}/month`,
                    result.lumpSumAmount && `${result.lumpSumAmount} lump sum`,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </div>
              )}
            </div>

            {result.suggestedDB !== null && (
              <div className="rounded-lg border-l-4 border-[#1E6B3C] bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-[#1E6B3C]">Suggested Coverage Amounts</div>
                <div className="mb-1.5 text-sm text-[#333]">
                  <strong>Suggested Death Benefit:</strong> ${result.suggestedDB.toLocaleString()}{" "}
                  <span className="text-xs text-[#888]">(10x annual income + total debt)</span>
                </div>
                <div className="text-sm text-[#333]">
                  <strong>Suggested Living Benefit Reserve:</strong> $
                  {(result.suggestedReserveLow ?? 0).toLocaleString()} – $
                  {(result.suggestedReserveHigh ?? 0).toLocaleString()}{" "}
                  <span className="text-xs text-[#888]">(6-12 months of income if too sick to work)</span>
                </div>
              </div>
            )}

            {result.hasRollover && result.rolloverProduct && (
              <div className="rounded-lg border-l-4 border-[#8B6A00] bg-[#FFFBF0] p-4">
                <div className="mb-1 text-sm font-semibold text-[#8B6A00]">
                  Also Recommended — Rollover Opportunity
                </div>
                <div className="mb-2 text-xs text-[#666]">
                  For the client&rsquo;s OTHER retirement account(s) mentioned separately from today&rsquo;s plan.
                </div>
                <div className="mb-1.5 text-base font-semibold text-[#1C1C1C]">{result.rolloverProduct}</div>
                <ul className="list-disc space-y-1 pl-4 text-sm text-[#333]">
                  {result.rolloverReasons?.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.map((rec, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                {result.recommendations.length > 1 && (
                  <div className="-mb-1 text-xs font-semibold uppercase tracking-wide text-[#888]">
                    Goal: {rec.goalLabel}
                  </div>
                )}
                <div className="rounded-lg border-l-4 border-[#1E6B3C] bg-white p-4">
                  <div className="mb-1 text-sm font-semibold text-[#1E6B3C]">
                    Primary Recommendation{result.hasRollover ? " — Today's New Plan" : ""}
                  </div>
                  <div className="mb-2 text-lg font-semibold text-[#1C1C1C]">{rec.primary}</div>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-[#333]">
                    {rec.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {rec.secondary && (
                  <div className="rounded-lg border-l-4 border-[#2E2E2E] bg-white p-4">
                    <div className="mb-1 text-sm font-semibold text-[#2E2E2E]">Runner-Up Option</div>
                    <div className="text-base font-semibold text-[#1C1C1C]">{rec.secondary}</div>
                  </div>
                )}

                {rec.talking.length > 0 && (
                  <div className="rounded-lg border-l-4 border-[#1B4F8A] bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-[#1B4F8A]">Client Talking Points</div>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-[#333]">
                      {rec.talking.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.avoid && (
                  <div className="rounded-lg border-l-4 border-[#8B1A1A] bg-[#FBEFEF] p-4">
                    <div className="mb-1 text-sm font-semibold text-[#8B1A1A]">Avoid for This Client</div>
                    <div className="mb-2 text-base font-semibold text-[#8B1A1A]">{rec.avoid}</div>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-[#333]">
                      {rec.avoidReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.combo && (
                  <div className="rounded-lg border-l-4 border-[#1B4F8A] bg-[#EEF3FA] p-4">
                    <div className="mb-1 text-sm font-semibold text-[#1B4F8A]">Combo Option</div>
                    <div className="mb-2 text-base font-semibold text-[#1C1C1C]">{rec.combo}</div>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-[#333]">
                      {rec.comboReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => generateClientPDF(result, advisor)}
                className="flex w-fit items-center gap-2 rounded-md bg-[#1C1C1C] px-6 py-3 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
              >
                Download Client Profile PDF
              </button>
            </div>

            <div className="rounded-lg border border-[#D9CFBA] bg-white p-4">
              <div className="mb-4 text-sm font-semibold text-[#1C1C1C]">Save This Analysis</div>

              {prefillClient && (
                <div className="mb-4 rounded-md border border-[#1C1C1C] bg-[#F5F0E8] p-3">
                  <p className="mb-2 text-xs text-[#666]">
                    You started this from <strong>{prefillClient.full_name}</strong>&rsquo;s profile.
                  </p>
                  <button
                    type="button"
                    disabled={savingExisting}
                    onClick={() => {
                      setSelectedClientId(prefillClient.id);
                      handleSaveToExisting();
                    }}
                    className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
                  >
                    {savingExisting ? "Saving..." : `Save to ${prefillClient.full_name}'s profile`}
                  </button>
                </div>
              )}

              <div className="mb-4 rounded-md border border-[#D9CFBA] p-3">
                <p className="mb-2 text-xs text-[#666]">
                  Create a new client record named &ldquo;{inputs.name || "—"}&rdquo; and attach this analysis to it.
                </p>
                <button
                  type="button"
                  disabled={savingNew || !inputs.name.trim()}
                  onClick={handleSaveAsNewClient}
                  className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
                >
                  {savingNew ? "Creating..." : "Create New Client & Save"}
                </button>
              </div>

              <div className="rounded-md border border-[#D9CFBA] p-3">
                <p className="mb-2 text-xs text-[#666]">Or save this analysis onto an existing client:</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex-1 rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
                  >
                    <option value="">Select a client…</option>
                    {existingClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={savingExisting || !selectedClientId}
                    onClick={handleSaveToExisting}
                    className="rounded-md border border-[#D9CFBA] px-4 py-2 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
                  >
                    {savingExisting ? "Saving..." : "Save to Selected Client"}
                  </button>
                </div>
              </div>

              {saveStatus && (
                <p className={`mt-3 text-xs font-semibold ${saveStatus.ok ? "text-[#1E6B3C]" : "text-[#8B1A1A]"}`}>
                  {saveStatus.message}{" "}
                  {saveStatus.ok && saveStatus.clientId && (
                    <>
                      <a href={`/clients/${saveStatus.clientId}`} className="underline">
                        View client profile →
                      </a>{" "}
                      <a href={`/clients/${saveStatus.clientId}/financial-analysis`} className="underline">
                        Start Full Financial Analysis →
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-[#F5F0E8] p-3 text-xs leading-relaxed text-[#777]">
              All figures and recommendations above are approximations for discussion purposes only. Final numbers
              depend on carrier underwriting, approval, and current rates.
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[#D9CFBA] p-6 text-center text-sm text-[#999]">
            Fill in the client&rsquo;s info and click &ldquo;Get Recommendation&rdquo; to see a suggested product,
            talking points, and what to avoid.
          </div>
        )}
      </div>
    </div>
  );
}
