"use client";

import { useState, useTransition } from "react";
import { RECRUIT_STAGES, type RecruitStage } from "@/lib/types";
import { updateRecruitStage } from "../actions";

export default function RecruitStageSelect({ recruitId, stage }: { recruitId: string; stage: RecruitStage }) {
  const [isPending, startTransition] = useTransition();
  const [currentStage, setCurrentStage] = useState<RecruitStage>(stage);

  function handleChange(next: RecruitStage) {
    setCurrentStage(next);
    startTransition(() => updateRecruitStage(recruitId, next));
  }

  return (
    // 9/16 — Karina: same fix as the client Pipeline Stage dropdown (StageSelect.tsx) — the
    // native arrow sat too close to the edge, uneven with the left padding. `appearance-none`
    // + a custom chevron inset to match (right-3, same as the left pl-3).
    <div className="relative inline-block">
      <select
        value={currentStage}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as RecruitStage)}
        className="appearance-none rounded-md border border-[#D9CFBA] py-1.5 pl-3 pr-8 text-sm outline-none focus:border-[#1C1C1C] disabled:opacity-50"
      >
        {RECRUIT_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
