"use client";

import { useState } from "react";
import Link from "next/link";
import { markOutreachOutcome, undoOutreachOutcome } from "./actions";
import type { TermMilestone, TermUrgency, OutreachOutcome } from "@/lib/products";
import { termUrgencyLabel, OUTREACH_OUTCOME_LABELS } from "@/lib/products";
import { formatDateOnly } from "@/lib/dates";

// One row in the "Outreach" view on the Clients page (Karina, 9/4, broadened 9/7 beyond term
// policies to any product with a relevant end date) — soonest-relevant-date first.
//
// 9/8: "Mark Touched Base" is no longer a single click — Karina wanted marking something touched
// base to require saying what actually happened, so this is now a "What happened?" dropdown;
// picking an outcome both records it and moves the row into its outcome-specific section below in
// one step. "Undo" (on an already-resolved row) clears the outcome and moves it back.
//
// 9/8, later same day: picking "Keeping current coverage as-is" needs one more thing before it can
// fire — a next follow-up date ("keeping as is should just go back to issued and be done until the
// next date there should be a follow up ... quick selections can be 1yr, 2yrs and custom input").
// "Declining / letting it lapse" got the same treatment right after, same day ("for declining and
// letting lapse we need actions too"). Every other outcome still fires the instant it's picked;
// these two alone open a small inline picker first.
const FOLLOWUP_REQUIRED: OutreachOutcome[] = ["keeping", "declining"];

const URGENCY_STYLES: Record<TermUrgency, { badge: string; border: string }> = {
  overdue: { badge: "bg-[#8B1A1A] text-white", border: "border-l-4 border-l-[#8B1A1A]" },
  critical: { badge: "bg-[#8B1A1A] text-white", border: "border-l-4 border-l-[#8B1A1A]" },
  soon: { badge: "bg-[#8b6a00] text-white", border: "border-l-4 border-l-[#8b6a00]" },
  later: { badge: "bg-[#EDE8DF] text-[#555]", border: "border-l-4 border-l-transparent" },
};

export default function TermOutreachRow({
  productId,
  clientId,
  clientName,
  productName,
  productType,
  carrier,
  milestone,
  urgency,
  contacted,
}: {
  productId: string;
  clientId: string;
  clientName: string;
  productName: string;
  productType: string | null;
  carrier: string | null;
  milestone: TermMilestone | null;
  urgency: TermUrgency | null;
  contacted: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickingFollowUpFor, setPickingFollowUpFor] = useState<OutreachOutcome | null>(null);
  const [customFollowUp, setCustomFollowUp] = useState("");
  const styles = urgency ? URGENCY_STYLES[urgency] : URGENCY_STYLES.later;

  async function handlePickOutcome(outcome: OutreachOutcome, followUpAt?: string) {
    setBusy(true);
    setError("");
    try {
      await markOutreachOutcome(productId, clientId, outcome, productName, followUpAt);
      setPickingFollowUpFor(null);
      setCustomFollowUp("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  function handleQuickFollowUp(years: number) {
    if (!pickingFollowUpFor) return;
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    handlePickOutcome(pickingFollowUpFor, d.toISOString());
  }

  function handleCustomFollowUp() {
    if (!pickingFollowUpFor || !customFollowUp) return;
    handlePickOutcome(pickingFollowUpFor, new Date(customFollowUp).toISOString());
  }

  async function handleUndo() {
    setBusy(true);
    setError("");
    try {
      await undoOutreachOutcome(productId, clientId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#D9CFBA] bg-white p-3 ${styles.border}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/clients/${clientId}`} className="text-sm font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]">
            {clientName}
          </Link>
          {urgency && (urgency === "overdue" || urgency === "critical" || urgency === "soon") && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}>
              {milestone ? termUrgencyLabel(milestone.date, urgency) : urgency}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#707070]">
          {productName}
          {(productType || carrier) && ` — ${[productType, carrier].filter(Boolean).join(" · ")}`}
        </p>
        {milestone ? (
          <p className="mt-0.5 text-xs text-[#666]">
            {milestone.label}:{" "}
            {formatDateOnly(milestone.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[#999]">No date on file yet — edit this product to add one.</p>
        )}
        {error && <p className="mt-0.5 text-xs text-[#8B1A1A]">{error}</p>}
      </div>
      {contacted ? (
        <button
          type="button"
          disabled={busy}
          onClick={handleUndo}
          className="shrink-0 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#707070] hover:bg-[#EDE8DF] disabled:opacity-60"
        >
          {busy ? "…" : "Undo"}
        </button>
      ) : pickingFollowUpFor ? (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-xs font-medium text-[#666]">Next follow-up?</p>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleQuickFollowUp(1)}
              className="rounded-md border border-[#1C1C1C] bg-[#1C1C1C] px-2.5 py-1.5 text-xs font-semibold text-[#FAF8F4] disabled:opacity-60"
            >
              1 yr
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleQuickFollowUp(2)}
              className="rounded-md border border-[#1C1C1C] bg-[#1C1C1C] px-2.5 py-1.5 text-xs font-semibold text-[#FAF8F4] disabled:opacity-60"
            >
              2 yrs
            </button>
            <input
              type="datetime-local"
              disabled={busy}
              value={customFollowUp}
              onChange={(e) => setCustomFollowUp(e.target.value)}
              className="rounded-md border border-[#D9CFBA] px-2 py-1.5 text-xs outline-none focus:border-[#1C1C1C]"
            />
            <button
              type="button"
              disabled={busy || !customFollowUp}
              onClick={handleCustomFollowUp}
              className="rounded-md border border-[#D9CFBA] px-2.5 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
            >
              {busy ? "…" : "Confirm"}
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setPickingFollowUpFor(null);
              setCustomFollowUp("");
              setError("");
            }}
            className="text-xs font-medium text-[#707070] underline disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <select
          disabled={busy}
          value=""
          onChange={(e) => {
            const value = e.target.value as OutreachOutcome | "";
            if (value && FOLLOWUP_REQUIRED.includes(value)) {
              setPickingFollowUpFor(value);
            } else if (value) {
              handlePickOutcome(value);
            }
          }}
          className="shrink-0 rounded-md border border-[#1C1C1C] bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] disabled:opacity-60"
        >
          <option value="" disabled>
            {busy ? "…" : "Mark Touched Base — what happened?"}
          </option>
          {(Object.keys(OUTREACH_OUTCOME_LABELS) as OutreachOutcome[]).map((outcome) => (
            <option key={outcome} value={outcome} className="bg-white text-[#1C1C1C]">
              {OUTREACH_OUTCOME_LABELS[outcome]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
