"use client";

import { useState } from "react";
import type { MedicalCondition } from "@/lib/types";
import MedicalConditionFields, { EMPTY_MEDICAL_CONDITION_DRAFT, type MedicalConditionDraft } from "./MedicalConditionFields";
import { addMedicalCondition, updateMedicalCondition, deleteMedicalCondition } from "../actions";

function toDraft(c: MedicalCondition): MedicalConditionDraft {
  return {
    condition_name: c.condition_name,
    onset_date: c.onset_date ?? "",
    current_status: c.current_status ?? "",
    latest_report_date: c.latest_report_date ?? "",
    latest_report_summary: c.latest_report_summary ?? "",
    hospitalizations: c.hospitalizations ?? "",
    additional_notes: c.additional_notes ?? "",
    events: c.events ?? [],
    medications: c.medications ?? [],
  };
}

function ConditionCard({ condition, clientId }: { condition: MedicalCondition; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MedicalConditionDraft>(() => toDraft(condition));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!draft.condition_name.trim()) {
      setError("Condition name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updateMedicalCondition(condition.id, clientId, draft);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteMedicalCondition(condition.id, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="rounded-md border border-[#D9CFBA] p-4">
        <MedicalConditionFields draft={draft} onChange={setDraft} />
        {error && <p className="mt-2 text-xs text-[#8B1A1A]">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(toDraft(condition));
              setEditing(false);
              setError("");
            }}
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#D9CFBA] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#1C1C1C]">{condition.condition_name}</span>
            {condition.submitted_by_client && (
              <span className="rounded-full bg-[#F0EDE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                From client
              </span>
            )}
          </div>
          {condition.current_status && <p className="mt-0.5 text-xs text-[#666]">{condition.current_status}</p>}
        </div>
        {!confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#666] underline hover:text-[#1C1C1C]">
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
            >
              {busy ? "Deleting..." : "Yes, delete"}
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

      <div className="mt-2 flex flex-col gap-1 text-xs text-[#666]">
        {condition.onset_date && <p>Onset: {condition.onset_date}</p>}
        {condition.events.length > 0 && (
          <p>
            Timeline: {condition.events.map((e) => [e.date, e.description].filter(Boolean).join(" — ")).join("; ")}
          </p>
        )}
        {condition.medications.length > 0 && (
          <p>
            Medications:{" "}
            {condition.medications
              .map((m) => [m.name, m.dosage, m.lifelong ? "lifelong" : null].filter(Boolean).join(" "))
              .join("; ")}
          </p>
        )}
        {condition.latest_report_summary && (
          <p>
            Latest report: {condition.latest_report_summary}
            {condition.latest_report_date && ` (${condition.latest_report_date})`}
          </p>
        )}
        {condition.hospitalizations && <p>Hospitalizations: {condition.hospitalizations}</p>}
        {condition.additional_notes && <p>Notes: {condition.additional_notes}</p>}
      </div>
      {error && <p className="mt-2 text-xs text-[#8B1A1A]">{error}</p>}
    </div>
  );
}

export default function MedicalConditionsSection({ clientId, conditions }: { clientId: string; conditions: MedicalCondition[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<MedicalConditionDraft>(EMPTY_MEDICAL_CONDITION_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!draft.condition_name.trim()) {
      setError("Condition name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addMedicalCondition(clientId, draft);
      setDraft(EMPTY_MEDICAL_CONDITION_DRAFT);
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {conditions.length === 0 && !adding && (
        <p className="text-xs text-[#999]">
          Nothing logged yet. Add a condition below, or copy the client&rsquo;s link (in the sidebar) for them to fill
          out themselves.
        </p>
      )}

      {conditions.length > 0 && (
        <div className="flex flex-col gap-3">
          {conditions.map((c) => (
            <ConditionCard key={c.id} condition={c} clientId={clientId} />
          ))}
        </div>
      )}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Condition
        </button>
      ) : (
        <div className="rounded-md border border-[#D9CFBA] p-4">
          <MedicalConditionFields draft={draft} onChange={setDraft} />
          {error && <p className="mt-2 text-xs text-[#8B1A1A]">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleAdd}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save Condition"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_MEDICAL_CONDITION_DRAFT);
                setAdding(false);
                setError("");
              }}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
