"use client";

import { useActionState } from "react";
import { updateFollowUp } from "../actions";

type FollowUpState = { ok: boolean; savedLabel?: string };

const initialState: FollowUpState = { ok: false };

export default function FollowUpForm({
  clientId,
  defaultDatetime,
  defaultNote,
}: {
  clientId: string;
  defaultDatetime: string;
  defaultNote: string;
}) {
  const [state, formAction, pending] = useActionState<FollowUpState, FormData>(async (_prev, formData) => {
    await updateFollowUp(formData);
    const raw = String(formData.get("follow_up_at") || "");
    const savedLabel = raw
      ? new Date(raw).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
    return { ok: true, savedLabel };
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Remind me at
        <input
          type="datetime-local"
          name="follow_up_at"
          defaultValue={defaultDatetime}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Note
        <input
          name="follow_up_note"
          defaultValue={defaultNote}
          placeholder="What to follow up about"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Reminder"}
      </button>
      {state.ok && !pending && (
        <p className="text-xs font-semibold text-[#1E6B3C]">
          {state.savedLabel ? `Reminder saved for ${state.savedLabel} ✓` : "Reminder cleared ✓"}
        </p>
      )}
    </form>
  );
}
