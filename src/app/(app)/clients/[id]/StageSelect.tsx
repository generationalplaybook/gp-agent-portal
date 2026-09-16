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
  const [error, setError] = useState("");

  // 9/18 — this used to fire updateStage without awaiting or catching anything, so a failure on
  // the server (e.g. the live database not yet having a new enum value or column this build
  // expects) left the dropdown showing the new stage optimistically while nothing had actually
  // changed, with no error shown anywhere — see BACKLOG.md. Now it reverts the dropdown and shows
  // the actual error message on a failure, instead of silently disagreeing with what's saved.
  function handleChange(next: ClientStage) {
    if (next === "issued" && quotedProducts.length > 0) {
      setResolving(true);
      return;
    }
    const previous = currentStage;
    setCurrentStage(next);
    setError("");
    startTransition(async () => {
      try {
        await updateStage(clientId, next);
      } catch (e) {
        setCurrentStage(previous);
        setError(e instanceof Error ? e.message : "Could not update stage.");
      }
    });
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
      {/* 9/16 — Karina: the native dropdown arrow sat right up against the edge, uneven with the
          text's left padding. The browser draws that arrow itself and mostly ignores padding-right
          on a plain <select>, so `appearance-none` turns it off and this renders its own chevron
          instead, inset to match the left side exactly (right-3, same as the left px-3). */}
      <div className="relative">
        <select
          value={currentStage}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.value as ClientStage)}
          className="appearance-none rounded-md border border-[#D9CFBA] py-1.5 pl-3 pr-8 text-sm outline-none focus:border-[#1C1C1C] disabled:opacity-50"
        >
          {CLIENT_STAGES.map((s) => (
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
      {error && <p className="max-w-[14rem] text-right text-xs text-[#8B1A1A]">{error}</p>}

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
                {p.carrier && `: ${p.carrier}`}
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
