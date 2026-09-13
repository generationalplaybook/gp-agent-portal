"use client";

import { useState } from "react";
import MedicalConditionFields, {
  EMPTY_MEDICAL_CONDITION_DRAFT,
  type MedicalConditionDraft,
} from "../../(app)/clients/[id]/MedicalConditionFields";
import { submitMedicalReport } from "./actions";

export default function MedicalReportForm({ token }: { token: string }) {
  const [draft, setDraft] = useState<MedicalConditionDraft>(EMPTY_MEDICAL_CONDITION_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!draft.condition_name.trim()) {
      setError("Please enter the condition.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await submitMedicalReport(token, draft);
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong submitting this — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-8 text-center">
        <div className="mb-2 text-lg font-semibold text-[#1C1C1C]">Thank you!</div>
        <p className="text-sm text-[#666]">
          This has been added to your file for review. Have another condition to report? You can submit this form
          again for a second one.
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY_MEDICAL_CONDITION_DRAFT);
            setDone(false);
          }}
          className="mt-4 rounded-md border border-[#D9CFBA] px-4 py-2 text-sm font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          Report another condition
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
      <MedicalConditionFields draft={draft} onChange={setDraft} />
      {error && <p className="mt-3 text-sm text-[#8B1A1A]">{error}</p>}
      <button
        type="button"
        disabled={submitting}
        onClick={handleSubmit}
        className="mt-4 rounded-md bg-[#1C1C1C] px-5 py-2.5 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
}
