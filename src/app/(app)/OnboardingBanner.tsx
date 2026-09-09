"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { dismissOnboardingBanner } from "./getting-started/actions";

// The "finish setting up" nudge on Home — Karina, 9/9: advisors should be able to do the Getting
// Started walkthrough "right away as soon as they make the account, or they can return to it
// later." This is the "right away" nudge; the account-menu link is the "return to it later" path,
// and it stays there even after this banner is dismissed or finished.
export default function OnboardingBanner({ doneCount, totalCount }: { doneCount: number; totalCount: number }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#D9CFBA] bg-[#F5F0E8] px-5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-[#1C1C1C]">Finish setting up your account</p>
        <p className="text-xs text-[#666]">{doneCount} of {totalCount} steps done — profile, links, calendar, and a few others.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/getting-started"
          className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          Continue Setup
        </Link>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            startTransition(() => {
              dismissOnboardingBanner();
            });
          }}
          className="rounded-md px-2 py-1.5 text-xs text-[#707070] hover:bg-[#EDE8DF]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
