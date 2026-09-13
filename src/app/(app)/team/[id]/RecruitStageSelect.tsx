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
    <select
      value={currentStage}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value as RecruitStage)}
      className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C] disabled:opacity-50"
    >
      {RECRUIT_STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
