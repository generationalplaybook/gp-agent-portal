"use client";

import { useState } from "react";
import type { Presentation } from "@/lib/types";
import { addPresentation, updatePresentation, deletePresentation } from "./actions";

const inputClass = "w-full rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]";

function isUrl(s: string | null): s is string {
  return !!s && /^https?:\/\//i.test(s);
}

type Draft = { title: string; description: string; link: string };

function draftFrom(p: Presentation): Draft {
  return { title: p.title, description: p.description ?? "", link: p.link ?? "" };
}

const EMPTY_DRAFT: Draft = { title: "", description: "", link: "" };

function EditFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Title (e.g. IUL Overview for Clients)"
        className={inputClass}
      />
      <input
        value={draft.description}
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        placeholder="What it's for / when to use it (optional)"
        className={inputClass}
      />
      <input
        value={draft.link}
        onChange={(e) => setDraft({ ...draft, link: e.target.value })}
        placeholder="Link to the deck (Google Slides, Canva, PDF, PowerPoint Online...)"
        className={inputClass}
      />
    </div>
  );
}

function PresentationRow({ presentation }: { presentation: Presentation }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(presentation));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.title.trim()) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", presentation.id);
    formData.set("title", draft.title);
    formData.set("description", draft.description);
    formData.set("link", draft.link);
    const result = await updatePresentation(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  async function handleDelete() {
    setBusy(true);
    await deletePresentation(presentation.id);
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
        <EditFields draft={draft} setDraft={setDraft} />
        {error && <p className="text-xs font-semibold text-[#8B1A1A]">Couldn&rsquo;t save: {error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || !draft.title.trim()}
            onClick={save}
            className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(draftFrom(presentation));
              setError(null);
              setEditing(false);
            }}
            className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-[#D9CFBA] bg-white p-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[#1C1C1C]">{presentation.title}</div>
        {presentation.description && <div className="mt-0.5 text-xs text-[#666]">{presentation.description}</div>}
        <div className="mt-1.5">
          {isUrl(presentation.link) ? (
            <a
              href={presentation.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#1C1C1C] underline underline-offset-2 hover:text-[#2E2E2E]"
            >
              Open ↗
            </a>
          ) : (
            <span className="text-xs text-[#C9C0AE]">No link yet</span>
          )}
        </div>
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
          <span className="text-xs text-[#8B1A1A]">Delete?</span>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
          >
            {busy ? "…" : "Yes"}
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
  );
}

export default function PresentationsList({ presentations }: { presentations: Presentation[] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!draft.title.trim()) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("title", draft.title);
    formData.set("description", draft.description);
    formData.set("link", draft.link);
    const result = await addPresentation(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {presentations.length === 0 && !adding && (
        <p className="text-sm text-[#707070]">
          No presentations added yet. Add one below as you and your team finish each deck — the link can point
          anywhere (Google Slides, Canva, a PDF, PowerPoint Online).
        </p>
      )}

      {presentations.length > 0 && (
        <div className="flex flex-col gap-2">
          {presentations.map((p) => (
            <PresentationRow key={p.id} presentation={p} />
          ))}
        </div>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          + Add Presentation
        </button>
      )}

      {adding && (
        <div className="flex flex-col gap-2 rounded-md border border-[#D9CFBA] p-3">
          <EditFields draft={draft} setDraft={setDraft} />
          {error && <p className="text-xs font-semibold text-[#8B1A1A]">Couldn&rsquo;t save: {error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !draft.title.trim()}
              onClick={handleAdd}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Presentation"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setAdding(false);
                setError(null);
              }}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-[#707070] hover:text-[#1C1C1C]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
