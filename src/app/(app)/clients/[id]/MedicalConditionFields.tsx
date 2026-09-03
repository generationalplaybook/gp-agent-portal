"use client";

import type { MedicalConditionEvent, MedicalConditionMedication } from "@/lib/types";

// The full field set for one Medical Condition Report entry — shared between the agent-facing
// form (MedicalConditionsSection, on the client's own profile) and the public client-facing form
// (medical-report/[token]/MedicalReportForm) so the two are guaranteed to ask the same questions.
// Deliberately condition-agnostic: nothing here is specific to any one diagnosis. Scoped strictly
// to the condition itself — no client-level fields (tobacco, family history, etc.) per Karina's
// "No, just condition."
export interface MedicalConditionDraft {
  condition_name: string;
  onset_date: string;
  current_status: string;
  latest_report_date: string;
  latest_report_summary: string;
  hospitalizations: string;
  additional_notes: string;
  events: MedicalConditionEvent[];
  medications: MedicalConditionMedication[];
}

export const EMPTY_MEDICAL_CONDITION_DRAFT: MedicalConditionDraft = {
  condition_name: "",
  onset_date: "",
  current_status: "",
  latest_report_date: "",
  latest_report_summary: "",
  hospitalizations: "",
  additional_notes: "",
  events: [],
  medications: [],
};

const inputClass = "rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C] w-full";
const labelClass = "flex flex-col gap-1 text-xs font-semibold text-[#666]";

export default function MedicalConditionFields({
  draft,
  onChange,
}: {
  draft: MedicalConditionDraft;
  onChange: (next: MedicalConditionDraft) => void;
}) {
  function set<K extends keyof MedicalConditionDraft>(key: K, value: MedicalConditionDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function updateEvent(i: number, patch: Partial<MedicalConditionEvent>) {
    const next = draft.events.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    set("events", next);
  }
  function addEvent() {
    set("events", [...draft.events, { date: "", description: "" }]);
  }
  function removeEvent(i: number) {
    set("events", draft.events.filter((_, idx) => idx !== i));
  }

  function updateMedication(i: number, patch: Partial<MedicalConditionMedication>) {
    const next = draft.medications.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    set("medications", next);
  }
  function addMedication() {
    set("medications", [...draft.medications, { name: "", dosage: "", start_date: "", lifelong: false }]);
  }
  function removeMedication(i: number) {
    set("medications", draft.medications.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Condition *
          <input
            value={draft.condition_name}
            onChange={(e) => set("condition_name", e.target.value)}
            placeholder="e.g. Stroke, Type 2 Diabetes, Anxiety"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Onset / diagnosis date
          <input type="date" value={draft.onset_date} onChange={(e) => set("onset_date", e.target.value)} className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Current status / severity
        <input
          value={draft.current_status}
          onChange={(e) => set("current_status", e.target.value)}
          placeholder="e.g. Controlled with medication, Resolved, Ongoing — moderate"
          className={inputClass}
        />
      </label>

      {/* Event timeline — the initial event plus any recurrences. Karina's own example: a first
          stroke, then two more. */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#666]">
          Timeline <span className="font-normal text-[#999]">(the first event, plus any recurrences)</span>
        </div>
        <div className="flex flex-col gap-2">
          {draft.events.map((ev, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 rounded-md border border-[#D9CFBA] p-2.5">
              <input
                type="date"
                value={ev.date}
                onChange={(e) => updateEvent(i, { date: e.target.value })}
                className="w-40 rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <input
                value={ev.description}
                onChange={(e) => updateEvent(i, { description: e.target.value })}
                placeholder="What happened"
                className="min-w-[10rem] flex-1 rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <button
                type="button"
                onClick={() => removeEvent(i)}
                className="text-xs text-[#999] hover:text-[#8B1A1A]"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addEvent}
            className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            + Add an event
          </button>
        </div>
      </div>

      {/* Medications */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#666]">Medications</div>
        <div className="flex flex-col gap-2">
          {draft.medications.map((med, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-[#D9CFBA] p-2.5">
              <input
                value={med.name}
                onChange={(e) => updateMedication(i, { name: e.target.value })}
                placeholder="Medication"
                className="min-w-[8rem] flex-1 rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <input
                value={med.dosage}
                onChange={(e) => updateMedication(i, { dosage: e.target.value })}
                placeholder="Dosage"
                className="w-28 rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <input
                type="date"
                value={med.start_date}
                onChange={(e) => updateMedication(i, { start_date: e.target.value })}
                className="w-40 rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
              <label className="flex items-center gap-1.5 text-xs text-[#666]">
                <input
                  type="checkbox"
                  checked={med.lifelong}
                  onChange={(e) => updateMedication(i, { lifelong: e.target.checked })}
                />
                Lifelong
              </label>
              <button
                type="button"
                onClick={() => removeMedication(i)}
                className="text-xs text-[#999] hover:text-[#8B1A1A]"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMedication}
            className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            + Add a medication
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Most recent test/report date
          <input
            type="date"
            value={draft.latest_report_date}
            onChange={(e) => set("latest_report_date", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Most recent test/report result
          <input
            value={draft.latest_report_summary}
            onChange={(e) => set("latest_report_summary", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Hospitalizations
        <textarea
          value={draft.hospitalizations}
          onChange={(e) => set("hospitalizations", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Anything else
        <textarea
          value={draft.additional_notes}
          onChange={(e) => set("additional_notes", e.target.value)}
          rows={3}
          placeholder="Anything else that would help with an underwriting call"
          className={inputClass}
        />
      </label>
    </div>
  );
}
