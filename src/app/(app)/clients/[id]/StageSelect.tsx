"use client";

import { useState, useTransition } from "react";
import { CLIENT_STAGES, type ClientStage } from "@/lib/types";
import { updateStage, resolveQuotesOnIssue } from "../actions";

export interface QuoteProductOption {
  id: string;
  product_name: string;
  carrier: string | null;
  premium: number | null;
}

export default function StageSelect({
  clientId,
  stage,
  quotedProducts = [],
}: {
  clientId: string;
  stage: ClientStage;
  quotedProducts?: QuoteProductOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [currentStage, setCurrentStage] = useState<ClientStage>(stage);
  const [resolving, setResolving] = useState(false);
  const [chosenId, setChosenId] = useState("");

  function handleChange(next: ClientStage) {
    if (next === "issued" && quotedProducts.length > 0) {
      setResolving(true);
      return;
    }
    setCurrentStage(next);
    startTransition(() => updateStage(clientId, next));
  }

  function confirmResolve() {
    if (!chosenId) return;
    const allIds = quotedProducts.map((p) => p.id);
    startTransition(() => resolveQuotesOnIssue(clientId, chosenId, allIds));
    setCurrentStage("issued");
    setResolving(false);
    setChosenId("");
  }

  function cancelResolve() {
    setResolving(false);
    setChosenId("");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <select
        value={currentStage}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as ClientStage)}
        className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C] disabled:opacity-50"
      >
        {CLIENT_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {resolving && (
        <div className="w-72 rounded-md border border-[#D9CFBA] bg-white p-3 text-left shadow-sm">
          <p className="mb-2 text-xs font-semibold text-[#1C1C1C]">Which quote was issued?</p>
          <div className="mb-2 flex flex-col gap-1.5">
            {quotedProducts.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-[#2E2E2E]">
                <input
                  type="radio"
                  name="issued-quote"
                  checked={chosenId === p.id}
                  onChange={() => setChosenId(p.id)}
                />
                {p.product_name}
                {p.carrier && ` — ${p.carrier}`}
                {p.premium != null && ` · $${p.premium.toLocaleString()}`}
              </label>
            ))}
          </div>
          <p className="mb-2 text-[11px] text-[#707070]">
            The {quotedProducts.length > 1 ? "other quotes" : "other quote"} will be deleted.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!chosenId || isPending}
              onClick={confirmResolve}
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={cancelResolve}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
