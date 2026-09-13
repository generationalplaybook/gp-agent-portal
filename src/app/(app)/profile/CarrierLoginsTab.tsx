"use client";

import { useState } from "react";
import type { CarrierLogin } from "@/lib/types";
import { addCarrierLogin, updateCarrierLogin, deleteCarrierLogin } from "./actions";

const inputClass =
  "w-full rounded-md border border-[#D9CFBA] px-2 py-1 text-xs outline-none focus:border-[#1C1C1C]";

// Shared column template for the header row and every data row — both use the exact same
// flex-wrapper + grid + fixed-width action-spacer structure so their columns line up pixel for
// pixel. Previously the header was a plain 8-col grid spanning the full card width while each
// data row's grid was squeezed by its own trailing edit/delete icons (a flex sibling, not part of
// the grid), so columns drifted further out of alignment the further right they were — worst for
// Link, the last column (added 9/3). Also: grid cells had no `min-w-0`/`truncate`, so a long value
// (e.g. a full email as Username) could overflow its cell and visually collide with the next
// column instead of ellipsizing (added 9/3).
const ROW_GRID_CLASS = "grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-7";
const ACTIONS_SPACER_CLASS = "flex shrink-0 items-center justify-end gap-2 sm:min-w-11";

function isUrl(s: string | null): s is string {
  return !!s && /^https?:\/\//i.test(s);
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API unavailable or permission denied — nothing else to fall back to; the icon
      // just won't confirm. The full value is still readable via the hover tooltip either way.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 text-[#707070] opacity-0 transition-opacity hover:text-[#1C1C1C] focus-visible:opacity-100 group-hover/cell:opacity-100"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// A truncated cell whose full value only shows on hover (as a title tooltip), paired with a
// click-to-copy icon that fades in on hover of the same cell (`group/cell`) — added 9/3 after
// Karina flagged that a plain ellipsis was "useless" for a table whose whole point is copying
// logins into a carrier portal: you couldn't read the full value OR reliably grab it. Chosen over
// wrapping the text (rows would grow tall/ragged) or moving to a card layout (more scrolling) —
// keeps the compact table, makes copying a single click. Hover-only for now; when this portal
// gets real mobile support, tap-and-hold is the equivalent gesture there (Karina, 9/3).
function CopyableCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#C9C0AE]">—</span>;
  return (
    <span className="group/cell flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate" title={value}>
        {value}
      </span>
      <CopyButton value={value} />
    </span>
  );
}

type Draft = {
  company: string;
  username: string;
  password: string;
  life_agent_number: string;
  annuity_agent_number: string;
  agency_number: string;
  link: string;
};

function draftFrom(login: CarrierLogin): Draft {
  return {
    company: login.company,
    username: login.username ?? "",
    password: login.password ?? "",
    life_agent_number: login.life_agent_number ?? "",
    annuity_agent_number: login.annuity_agent_number ?? "",
    agency_number: login.agency_number ?? "",
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
        value={draft.life_agent_number}
        onChange={(e) => setDraft({ ...draft, life_agent_number: e.target.value })}
        placeholder="Life Agent #"
        className={inputClass}
      />
      <input
        value={draft.annuity_agent_number}
        onChange={(e) => setDraft({ ...draft, annuity_agent_number: e.target.value })}
        placeholder="Annuity Agent #"
        className={inputClass}
      />
      <input
        value={draft.agency_number}
        onChange={(e) => setDraft({ ...draft, agency_number: e.target.value })}
        placeholder="Agency #"
        className={inputClass}
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
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.company.trim()) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", login.id);
    Object.entries(draft).forEach(([k, v]) => formData.set(k, v));
    const result = await updateCarrierLogin(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
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
        {error && (
          <p className="text-xs font-semibold text-[#8B1A1A]">
            Couldn&rsquo;t save: {error}
          </p>
        )}
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
              setError(null);
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
      <div className={ROW_GRID_CLASS}>
        <div className="col-span-2 min-w-0 truncate font-semibold text-[#1C1C1C] sm:col-span-1" title={login.company}>
          {login.company}
        </div>
        <div className="min-w-0 text-[#666]">
          <CopyableCell value={login.username} />
        </div>
        <div className="group/cell flex min-w-0 items-center gap-1.5 text-[#666]">
          {login.password ? (
            <>
              <span className="truncate tracking-wider" title={revealed ? login.password : undefined}>
                {revealed ? login.password : "••••••••"}
              </span>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="shrink-0 text-[#707070] hover:text-[#1C1C1C]"
                title={revealed ? "Hide password" : "Show password"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
              <CopyButton value={login.password} />
            </>
          ) : (
            <span className="text-[#C9C0AE]">—</span>
          )}
        </div>
        <div className="min-w-0 text-[#666]">
          <CopyableCell value={login.life_agent_number} />
        </div>
        <div className="min-w-0 text-[#666]">
          <CopyableCell value={login.annuity_agent_number} />
        </div>
        <div className="min-w-0 text-[#666]">
          <CopyableCell value={login.agency_number} />
        </div>
        <div className="min-w-0 truncate">
          {isUrl(login.link) ? (
            <a href={login.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]">
              Open ↗
            </a>
          ) : (
            <span className="text-[#C9C0AE]">—</span>
          )}
        </div>
      </div>
      <div className={ACTIONS_SPACER_CLASS}>
        {!confirmingDelete ? (
          <>
            <button type="button" onClick={() => setEditing(true)} className="text-[#707070] hover:text-[#1C1C1C]" title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            <button type="button" onClick={() => setConfirmingDelete(true)} className="text-[#707070] hover:text-[#8B1A1A]" title="Delete">
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
  life_agent_number: "",
  annuity_agent_number: "",
  agency_number: "",
  link: "",
};

export default function CarrierLoginsTab({ logins }: { logins: CarrierLogin[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.company.trim()) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    Object.entries(draft).forEach(([k, v]) => formData.set(k, v));
    const result = await addCarrierLogin(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
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
          {error && (
            <p className="text-xs font-semibold text-[#8B1A1A]">
              Couldn&rsquo;t save: {error}
            </p>
          )}
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

      {logins.length === 0 && !adding && <p className="text-xs text-[#707070]">No carrier logins saved yet.</p>}

      {logins.length > 0 && (
        <div>
          <div className="hidden items-center gap-3 border-b border-[#D9CFBA] pb-1.5 sm:flex">
            <div className={`${ROW_GRID_CLASS} text-[10px] font-semibold uppercase tracking-wide text-[#707070]`}>
              <div>Company</div>
              <div>Username</div>
              <div>Password</div>
              <div>Life Agent #</div>
              <div>Annuity #</div>
              <div>Agency #</div>
              <div>Link</div>
            </div>
            <div className={ACTIONS_SPACER_CLASS} aria-hidden="true" />
          </div>
          {logins.map((l) => (
            <CarrierLoginRow key={l.id} login={l} />
          ))}
        </div>
      )}
    </div>
  );
}
