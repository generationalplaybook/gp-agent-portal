"use client";

import { useState } from "react";
import { updateNotificationPreferences } from "./actions";

// Karina, 9/9: "we also need to give control to the adviser that, like, do they want email
// notifications, or are they just gonna be in the habit of checking their portal? Because agents
// might get overwhelmed with multiple emails." Two independent toggles, both default true (her
// call: "Both default ON") — an advisor turns off whichever kind of email they don't want, rather
// than having to opt in from nothing.
export default function NotificationPreferencesCard({
  initialNewIntake,
  initialReminder,
}: {
  initialNewIntake: boolean;
  initialReminder: boolean;
}) {
  const [newIntake, setNewIntake] = useState(initialNewIntake);
  const [reminder, setReminder] = useState(initialReminder);
  const [saving, setSaving] = useState<"new_intake" | "reminder" | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function toggle(which: "new_intake" | "reminder") {
    const nextNewIntake = which === "new_intake" ? !newIntake : newIntake;
    const nextReminder = which === "reminder" ? !reminder : reminder;
    setNewIntake(nextNewIntake);
    setReminder(nextReminder);
    setSaving(which);
    await updateNotificationPreferences({
      notify_new_intake_email: nextNewIntake,
      notify_reminder_email: nextReminder,
    });
    setSaving(null);
    setSavedAt(Date.now());
  }

  return (
    <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Email Notifications</h2>
      <p className="mb-4 text-xs text-[#707070]">
        Choose what you want emailed to you, on top of what already shows up in your portal.
      </p>

      <div className="space-y-4">
        <ToggleRow
          label="New intake submitted"
          description="Email me when a client completes a Pre-Intake or full Intake form."
          checked={newIntake}
          busy={saving === "new_intake"}
          onChange={() => toggle("new_intake")}
        />
        <ToggleRow
          label="Time-sensitive reminders"
          description="Email me when the portal automatically creates a reminder (18th birthday, 59½ annuity milestone, or a product's conversion deadline coming up)."
          checked={reminder}
          busy={saving === "reminder"}
          onChange={() => toggle("reminder")}
        />
      </div>

      {savedAt && !saving && <p className="mt-4 text-xs text-[#1E6B3C]">Saved ✓</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  busy,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  busy: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#1C1C1C]">{label}</p>
        <p className="text-xs text-[#707070]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={busy}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          checked ? "bg-[#1E6B3C]" : "bg-[#D9CFBA]"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
