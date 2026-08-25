"use client";

import { useTransition } from "react";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import { updateStage } from "../actions";

export default function StageSelect({ clientId, stage }: { clientId: string; stage: ClientStage }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={stage}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateStage(clientId, e.target.value as ClientStage))}
      className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C] disabled:opacity-50"
    >
      {CLIENT_STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
