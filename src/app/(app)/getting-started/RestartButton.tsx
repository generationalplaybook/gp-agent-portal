"use client";

import { useState, useTransition } from "react";
import { restartOnboarding } from "./actions";

export default function RestartButton() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Reset your progress on this checklist? This only clears the checkmarks below — nothing about your actual profile or account changes.")) return;
        startTransition(async () => {
          await restartOnboarding();
          setDone(true);
          setTimeout(() => setDone(false), 2000);
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      }}
      className="rounded-md border border-[#D9CFBA] bg-white px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#F5F0E8] disabled:opacity-60"
    >
      {done ? "Restarted ✓" : pending ? "Restarting…" : "Restart Walkthrough"}
    </button>
  );
}
