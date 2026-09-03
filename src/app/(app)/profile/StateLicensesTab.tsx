"use client";

import { useState } from "react";
import type { StateLicense } from "@/lib/types";
import { addStateLicense, updateStateLicense, deleteStateLicense } from "./actions";

const inputClass =
  "w-full rounded-md border border-[#D9CFBA] px-2 py-1 text-xs outline-none focus:border-[#1C1C1C]";

// Deliberately just State / License # / a resident flag / freeform notes — NO expiration,
// renewal, or status fields. That's compliance data already tracked authoritatively in SureLC
// (Karina, 9/3): duplicating it here would just be a second copy that goes stale the moment she
// renews and forgets to update it here too. This is organization/quick-access only.

type Draft = { state: string; license_number: string; is_resident: boolean; notes: string };

function draftFrom(license: StateLicense): Draft {
  return {
    state: license.state,
    license_number: license.license_number ?? "",
    is_resident: license.is_resident,
    notes: license.notes ?? "",
  };
}

function EditFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input
        value={draft.state}
        onChange={(e) => setDraft({ ...draft, state: e.target.value })}
        placeholder="State (e.g. Texas)"
        className={inputClass}
      />
      <input
        value={draft.license_number}
        onChange={(e) => setDraft({ ...draft, license_number: e.target.value })}
        placeholder="License #"
        className={inputClass}
      />
      <label className="flex items-center gap-1.5 text-xs text-[#666]">
        <input
          type="checkbox"
          checked={draft.is_resident}
          onChange={(e) => setDraft({ ...draft, is_resident: e.target.checked })}
        />
        Resident state
      </label>
      <input
        value={draft.notes}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        placeholder="Notes (optional)"
        className={inputClass}
      />
    </div>
  );
}

function StateLicenseRow({ license }: { license: StateLicense }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(license));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft.state.trim()) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("id", license.id);
    formData.set("state", draft.state);
    formData.set("license_number", draft.license_number);
    formData.set("notes", draft.notes);
    if (draft.is_resident) formData.set("is_resident", "on");
    await updateStateLicense(formData);
    setBusy(false);
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await deleteStateLicense(license.id);
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 border-b border-[#EDE8DF] py-3 last:border-0">
        <EditFields draft={draft} setDraft={setDraft} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !draft.state.trim()}
            onClick={save}
            className="rounded-md bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(draftFrom(license));
              setEditing(false);
            }}
            className="rounded-md border border-[#D9CFBA] px-3 py-1 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EDE8DF] py-2.5 text-xs last:border-0">
      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
        <div className="font-semibold text-[#1C1C1C]">
          {license.state}
          {license.is_resident && (
            <span className="ml-1.5 rounded-full bg-[#EDE8DF] px-2 py-0.5 text-[10px] font-normal text-[#666]">Resident</span>
          )}
        </div>
        <div className="text-[#666]">{license.license_number || <span className="text-[#C9C0AE]">—</span>}</div>
        <div className="col-span-2 truncate text-[#666]" title={license.notes ?? undefined}>
          {license.notes || <span className="text-[#C9C0AE]">—</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!confirmingDelete ? (
          <>
            <button type="button" onClick={() => setEditing(true)} className="text-[#999] hover:text-[#1C1C1C]" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            <button type="button" onClick={() => setConfirmingDelete(true)} className="text-[#999] hover:text-[#8B1A1A]" title="Delete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <button type="button" disabled={busy} onClick={handleDelete} className="rounded-md bg-[#8B1A1A] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60">
              {busy ? "…" : "Yes"}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded-md border border-[#D9CFBA] px-2 py-1 text-[11px] text-[#2E2E2E] hover:bg-[#EDE8DF]">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_DRAFT: Draft = { state: "", license_number: "", is_resident: false, notes: "" };

export default function StateLicensesTab({ licenses }: { licenses: StateLicense[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!draft.state.trim()) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("state", draft.state);
    formData.set("license_number", draft.license_number);
    formData.set("notes", draft.notes);
    if (draft.is_resident) formData.set("is_resident", "on");
    await addStateLicense(formData);
    setBusy(false);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          {adding ? "Cancel" : "+ Add State License"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
          <EditFields draft={draft} setDraft={setDraft} />
          <button
            type="button"
            disabled={busy || !draft.state.trim()}
            onClick={handleAdd}
            className="self-start rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add State License"}
          </button>
        </div>
      )}

      {licenses.length === 0 && !adding && <p className="text-xs text-[#999]">No state licenses saved yet.</p>}

      {licenses.length > 0 && (
        <div>
          <div className="hidden gap-x-3 border-b border-[#D9CFBA] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#888] sm:grid sm:grid-cols-4">
            <div>State</div>
            <div>License #</div>
            <div className="col-span-2">Notes</div>
          </div>
          {licenses.map((l) => (
            <StateLicenseRow key={l.id} license={l} />
          ))}
        </div>
      )}
    </div>
  );
}
