"use client";

import { useState } from "react";
import Link from "next/link";
import { markTermContacted, undoTermContacted } from "./actions";
import type { TermMilestone, TermUrgency } from "@/lib/products";
import { termUrgencyLabel } from "@/lib/products";

// One row in the "Term" view on the Clients page (Karina, 9/4) — every term policy (convertible
// or not), soonest-relevant-date first. "Mark Touched Base" moves it into the Contacted group
// below without deleting it or losing track of when it was reached out to.

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
  const styles = urgency ? URGENCY_STYLES[urgency] : URGENCY_STYLES.later;

  async function handleToggle() {
    setBusy(true);
    setError("");
    try {
      if (contacted) {
        await undoTermContacted(productId, clientId);
      } else {
        await markTermContacted(productId, clientId);
      }
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
            {milestone.label}: {new Date(milestone.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[#999]">No date on file yet — edit this product to add one.</p>
        )}
        {error && <p className="mt-0.5 text-xs text-[#8B1A1A]">{error}</p>}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={handleToggle}
        className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
          contacted
            ? "border-[#D9CFBA] text-[#707070] hover:bg-[#EDE8DF]"
            : "border-[#1C1C1C] bg-[#1C1C1C] text-[#FAF8F4] hover:bg-[#2E2E2E]"
        }`}
      >
        {busy ? "…" : contacted ? "Undo" : "Mark Touched Base"}
      </button>
    </div>
  );
}
