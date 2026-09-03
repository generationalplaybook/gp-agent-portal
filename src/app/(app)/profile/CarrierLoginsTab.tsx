"use client";

import { useState } from "react";
import type { CarrierLogin } from "@/lib/types";
import { addCarrierLogin, updateCarrierLogin, deleteCarrierLogin } from "./actions";

const inputClass =
  "w-full rounded-md border border-[#D9CFBA] px-2 py-1 text-xs outline-none focus:border-[#1C1C1C]";

function isUrl(s: string | null): s is string {
  return !!s && /^https?:\/\//i.test(s);
}

type Draft = {
  company: string;
  username: string;
  password: string;
  agent_number: string;
  agency_number: string;
  profile_code: string;
  link: string;
};

function draftFrom(login: CarrierLogin): Draft {
  return {
    company: login.company,
    username: login.username ?? "",
    password: login.password ?? "",
    agent_number: login.agent_number ?? "",
    agency_number: login.agency_number ?? "",
    profile_code: login.profile_code ?? "",
    link: login.link ?? "",
  };
}

function EditFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input
        value={draft.company}
        onChange={(e) => setDraft({ ...draft, company: e.target.value })}
        placeholder="Company"
        className={`${inputClass} col-span-2 sm:col-span-4`}
      />
      <input
        value={draft.username}
        onChange={(e) => setDraft({ ...draft, username: e.target.value })}
        placeholder="Username"
        className={inputClass}
      />
      <input
        value={draft.password}
        onChange={(e) => setDraft({ ...draft, password: e.target.value })}
        placeholder="Password"
        type="text"
        className={inputClass}
      />
      <input
        value={draft.agent_number}
        onChange={(e) => setDraft({ ...draft, agent_number: e.target.value })}
        placeholder="Agent #"
        className={inputClass}
      />
      <input
        value={draft.agency_number}
        onChange={(e) => setDraft({ ...draft, agency_number: e.target.value })}
        placeholder="Agency #"
        className={inputClass}
      />
      <input
        value={draft.profile_code}
        onChange={(e) => setDraft({ ...draft, profile_code: e.target.value })}
        placeholder="Profile code / note"
        className={`${inputClass} col-span-2`}
      />
      <input
        value={draft.link}
        onChange={(e) => setDraft({ ...draft, link: e.target.value })}
        placeholder="Portal login link"
        className={`${inputClass} col-span-2`}
      />
    </div>
  );
}

function CarrierLoginRow({ login }: { login: CarrierLogin }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(login));
  const [revealed, setRevealed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft.company.trim()) return;
    setBusy(true);
    const formData = new FormData();
    formData.set("id", login.id);
    Object.entries(draft).forEach(([k, v]) => formData.set(k, v));
    await updateCarrierLogin(formData);
    setBusy(false);
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await deleteCarrierLogin(login.id);
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 border-b border-[#EDE8DF] py-3 last:border-0">
        <EditFields draft={draft} setDraft={setDraft} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !draft.company.trim()}
            onClick={save}
            className="rounded-md bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(draftFrom(login));
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
      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-7">
        <div className="col-span-2 font-semibold text-[#1C1C1C] sm:col-span-1">{login.company}</div>
        <div className="text-[#666]">{login.username || <span className="text-[#C9C0AE]">—</span>}</div>
        <div className="flex items-center gap-1.5 text-[#666]">
          {login.password ? (
            <>
              <span className="tracking-wider">{revealed ? login.password : "••••••••"}</span>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="text-[#999] hover:text-[#1C1C1C]"
                title={revealed ? "Hide password" : "Show password"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </>
          ) : (
            <span className="text-[#C9C0AE]">—</span>
          )}
        </div>
        <div className="text-[#666]">{login.agent_number || <span className="text-[#C9C0AE]">—</span>}</div>
        <div className="text-[#666]">{login.agency_number || <span className="text-[#C9C0AE]">—</span>}</div>
        <div className="truncate text-[#666]" title={login.profile_code ?? undefined}>
          {isUrl(login.profile_code) ? (
            <a href={login.profile_code} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]">
              Open ↗
            </a>
          ) : (
            login.profile_code || <span className="text-[#C9C0AE]">—</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isUrl(login.link) ? (
            <a href={login.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]">
              Open ↗
            </a>
          ) : (
            <span className="text-[#C9C0AE]">—</span>
          )}
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

const EMPTY_DRAFT: Draft = {
  company: "",
  username: "",
  password: "",
  agent_number: "",
  agency_number: "",
  profile_code: "",
  link: "",
};

export default function CarrierLoginsTab({ logins }: { logins: CarrierLogin[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!draft.company.trim()) return;
    setBusy(true);
    const formData = new FormData();
    Object.entries(draft).forEach(([k, v]) => formData.set(k, v));
    await addCarrierLogin(formData);
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
          {adding ? "Cancel" : "+ Add Carrier"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
          <EditFields draft={draft} setDraft={setDraft} />
          <button
            type="button"
            disabled={busy || !draft.company.trim()}
            onClick={handleAdd}
            className="self-start rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add Carrier"}
          </button>
        </div>
      )}

      {logins.length === 0 && !adding && <p className="text-xs text-[#999]">No carrier logins saved yet.</p>}

      {logins.length > 0 && (
        <div>
          <div className="hidden gap-x-3 border-b border-[#D9CFBA] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#888] sm:grid sm:grid-cols-7">
            <div>Company</div>
            <div>Username</div>
            <div>Password</div>
            <div>Agent #</div>
            <div>Agency #</div>
            <div>Profile</div>
            <div>Link</div>
          </div>
          {logins.map((l) => (
            <CarrierLoginRow key={l.id} login={l} />
          ))}
        </div>
      )}
    </div>
  );
}
