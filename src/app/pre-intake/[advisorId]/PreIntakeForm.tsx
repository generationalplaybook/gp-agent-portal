"use client";

import { useState } from "react";
import PhoneInput from "../../(app)/clients/PhoneInput";
import CurrencyInput from "../../(app)/client-analyzer/CurrencyInput";
import { GENDER_OPTIONS } from "@/lib/types";
import { submitPreIntake, type PreIntakeTimeline } from "./actions";

// Deliberately a small, separate field set from the full Intake form (IntakeForm.tsx) — no DOB,
// height/weight, health questions, money type, or funding details. Every one of those either only
// makes sense once someone already knows this is a life insurance/annuity conversation, or exists
// to feed the recommendation engine this form never runs. Karina, 9/9: "somebody that is booking
// a meeting based on us saying... we do financial and legacy planning, but we haven't exactly told
// them that it's life insurance and annuities... What are you thinking? How much are you trying to
// invest?" Gender is the one exception — added 9/13, required, per Karina: "gender needs to be not
// optional on the intake forms" (a call already made on the full Intake form and the Client
// Analyzer at the same time).
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-sm font-semibold text-[#1C1C1C]">
        {label}
        {optional && (
          <span className="ml-1.5 rounded-full bg-[#F5F0E8] px-2 py-0.5 text-[10px] font-normal text-[#707070]">
            optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

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

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C] w-full";

const TIMELINE_OPTIONS: { value: PreIntakeTimeline; label: string }[] = [
  { value: "asap", label: "Right away" },
  { value: "soon", label: "In the next few months" },
  { value: "exploring", label: "Just exploring for now" },
];

export default function PreIntakeForm({ advisorId, advisorName }: { advisorId: string; advisorName: string }) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  // Added 9/11 — Karina: "we should also ask for the city and state on the pre intake form."
  // clients.city/clients.state already exist (added 9/3 for the Contact Info card).
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [goals, setGoals] = useState("");
  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState<PreIntakeTimeline | undefined>(undefined);

  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    const req: string[] = [];
    if (!firstName.trim()) req.push("First Name");
    if (!lastName.trim()) req.push("Last Name");
    if (!phone.trim()) req.push("Phone Number");
    if (!email.trim()) req.push("Email");
    if (!gender) req.push("Gender");
    if (!goals.trim()) req.push("What You're Looking For");

    if (req.length) {
      setMissing(req);
      return;
    }
    setMissing([]);
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await submitPreIntake(
        advisorId,
        { firstName, middleName, lastName, phone, email, gender, city, state },
        { goals, amount, timeline }
      );
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
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#707070]">Your Info</div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="First Name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Middle Name" optional>
          <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Last Name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Phone Number">
          <PhoneInput defaultValue={phone} onValueChange={setPhone} className={inputClass} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Gender">
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
          <option value="">Select…</option>
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="City" optional>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        </Field>
        <Field label="State" optional>
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. TX" className={inputClass} />
        </Field>
      </div>

      <div className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-[#707070]">
        What You&rsquo;re Looking For
      </div>
      <div className="mb-5 h-px bg-[#D9CFBA]" />

      <Field label="What's on your mind? What would you like to accomplish?">
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={3}
          placeholder="e.g. I want to make sure my family is taken care of, I'm looking for a safer place to grow some savings..."
          className={inputClass}
        />
      </Field>
      <Field label="Approximately how much are you thinking of investing?" optional>
        <CurrencyInput value={amount} onChange={setAmount} placeholder="e.g. $50,000" className={inputClass + " max-w-xs"} />
      </Field>
      <Field label="When would you like to get started?" optional>
        <OptionGroup value={timeline} onChange={setTimeline} options={TIMELINE_OPTIONS} />
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
