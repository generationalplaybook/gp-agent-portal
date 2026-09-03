"use client";

import { useState } from "react";
import Link from "next/link";
import LocalDateTime from "./LocalDateTime";
import { updateReminder, completeReminder, reopenReminder, deleteReminder, type ReminderOwner } from "./reminders/actions";

// See FollowUpForm/RemindersCard for why this conversion has to happen in the
// browser rather than on the server.
function isoToLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Kept outside the component body so it isn't flagged as an impure call during render.
function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

interface Reminder {
  id: string;
  remind_at: string;
  message: string | null;
  sent_at: string | null;
}

export default function ReminderRow({
  reminder,
  owner,
  subjectName,
  subjectHref,
}: {
  reminder: Reminder;
  owner: ReminderOwner;
  // Who this reminder is about — a client's name/link, or (since Team/Recruits) a recruit's.
  // Left unlabeled (no name/link) when called from inside that client's/recruit's own page,
  // where showing their own name back to you would be redundant.
  subjectName?: string;
  subjectHref?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [remindAt, setRemindAt] = useState(() => isoToLocalInputValue(reminder.remind_at));
  const [message, setMessage] = useState(reminder.message ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const completed = !!reminder.sent_at;
  const overdue = !completed && isOverdue(reminder.remind_at);

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      const iso = new Date(remindAt).toISOString();
      await updateReminder(reminder.id, owner, iso, message);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save reminder.");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    setBusy(true);
    setError("");
    try {
      await completeReminder(reminder.id, owner);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reminder.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    setBusy(true);
    setError("");
    try {
      await reopenReminder(reminder.id, owner);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reminder.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteReminder(reminder.id, owner);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete reminder.");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 border-l-2 border-[#1C1C1C] py-3 pl-3">
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's this reminder about?"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
        {error && <p className="text-xs text-[#8B1A1A]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="rounded-md bg-[#1C1C1C] px-3 py-1 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRemindAt(isoToLocalInputValue(reminder.remind_at));
              setMessage(reminder.message ?? "");
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
    <div
      className={`flex items-center justify-between gap-4 border-l-2 py-3 pl-3 ${
        completed ? "border-[#D9CFBA]" : overdue ? "border-[#8B1A1A]" : "border-[#1E6B3C]"
      }`}
    >
      <div className={completed ? "opacity-60" : ""}>
        {subjectName &&
          (subjectHref ? (
            <Link href={subjectHref} className="text-sm font-semibold text-[#1C1C1C] hover:underline">
              {subjectName}
            </Link>
          ) : (
            <div className="text-sm font-semibold text-[#1C1C1C]">{subjectName}</div>
          ))}
        <div className={`text-sm ${completed ? "text-[#999] line-through" : "text-[#2E2E2E]"}`}>
          {reminder.message || "Follow up"}
        </div>
        <div className={`text-xs ${completed ? "text-[#999]" : overdue ? "font-semibold text-[#8B1A1A]" : "text-[#999]"}`}>
          {completed ? "Completed — " : overdue ? "Overdue — " : ""}
          <LocalDateTime iso={reminder.remind_at} />
        </div>
        {error && <p className="mt-1 text-xs text-[#8B1A1A]">{error}</p>}
      </div>
      {!confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-3">
          {completed ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleReopen}
              className="text-xs text-[#666] underline hover:text-[#1C1C1C]"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={handleComplete}
              className="text-xs font-semibold text-[#1E6B3C] underline hover:text-[#164a2a]"
            >
              Mark Complete
            </button>
          )}
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
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[#8B1A1A]">Delete? Can&rsquo;t be undone.</span>
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
  );
}
