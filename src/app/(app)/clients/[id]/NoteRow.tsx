"use client";

import { useState } from "react";
import { updateNote, deleteNote } from "../actions";

interface Note {
  id: string;
  body: string;
  created_at: string;
  author?: { full_name?: string | null } | null;
}

export default function NoteRow({ note, clientId }: { note: Note; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await updateNote(note.id, clientId, body);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteNote(note.id, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete note.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="border-l-2 border-[#1C1C1C] pl-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="mb-2 w-full rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
        />
        {error && <p className="mb-2 text-xs text-[#8B1A1A]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setBody(note.body);
              setEditing(false);
              setError("");
            }}
            className="rounded-md border border-[#D9CFBA] px-3 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-[#D9CFBA] pl-3">
      <p className="text-sm text-[#2E2E2E] whitespace-pre-wrap">{note.body}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-[#707070]">
          {note.author?.full_name ?? "Advisor"} · {new Date(note.created_at).toLocaleString()}
        </p>
        {!confirmingDelete ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-[#666] underline hover:text-[#1C1C1C]"
            >
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8B1A1A]">Delete this note? This can&rsquo;t be retrieved again.</span>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Yes, delete"}
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
      {error && <p className="mt-1 text-xs text-[#8B1A1A]">{error}</p>}
    </div>
  );
}
