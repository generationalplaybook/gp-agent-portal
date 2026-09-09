"use client";

import { useState, useTransition } from "react";
import { setOnboardingStep, type ManualStepId } from "./actions";

// The button on each of the three manual-checkbox steps (see schema.sql section 49 for why these
// three can't be auto-detected). Optimistic — flips immediately, calls the server action behind
// it, and only rolls back if that actually fails.
export default function StepToggle({ stepId, initialDone }: { stepId: ManualStepId; initialDone: boolean }) {
  const [done, setDone] = useState(initialDone);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    startTransition(async () => {
      try {
        await setOnboardingStep(stepId, next);
      } catch {
        setDone(!next); // roll back on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
        done
          ? "border-[#1E6B3C] bg-[#E9F3EC] text-[#1E6B3C]"
          : "border-[#D9CFBA] bg-white text-[#2E2E2E] hover:bg-[#F5F0E8]"
      }`}
    >
      {done ? "✓ Done" : "Mark as done"}
    </button>
  );
}
