"use client";

import { useState } from "react";
import { generateClientPDF, viewClientPDF, type AdvisorInfo } from "@/lib/analyzer-pdf";
import type { AnalyzerResult } from "@/lib/analyzer";
import { deleteAnalysis } from "../actions";

export default function AnalysesList({
  analyses,
  advisor,
  clientId,
}: {
  analyses: { id: string; created_at: string; result: AnalyzerResult; from_intake?: boolean }[];
  advisor?: AdvisorInfo;
  clientId: string;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!analyses.length) {
    return <p className="text-xs text-[#707070]">No analyses yet.</p>;
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteAnalysis(id, clientId);
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {analyses.map((a) => (
        <div key={a.id} className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#707070]">{new Date(a.created_at).toLocaleString()}</span>
              {a.from_intake && (
                <span className="rounded-full bg-[#EEF3FA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1B4F8A]">
                  From intake
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => viewClientPDF(a.result, advisor)}
                className="text-xs font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
              >
                View PDF
              </button>
              <button
                type="button"
                onClick={() => generateClientPDF(a.result, advisor)}
                className="text-xs font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
              >
                Download PDF
              </button>
              <a
                href={`/client-analyzer?client=${clientId}&reanalysis=${a.id}`}
                className="text-xs font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
              >
                Re-run
              </a>
              <button
                type="button"
                onClick={() => setConfirmingId(a.id)}
                className="text-xs font-semibold text-[#8B1A1A] underline hover:text-[#6b1414]"
              >
                Delete
              </button>
            </div>
          </div>

          {confirmingId === a.id && (
            <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-[#FBEFEF] px-2.5 py-2">
              <span className="text-xs text-[#8B1A1A]">Delete this analysis? This can&rsquo;t be undone.</span>
              <button
                type="button"
                disabled={deletingId === a.id}
                onClick={() => handleDelete(a.id)}
                className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
              >
                {deletingId === a.id ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {a.result.recommendations.map((rec, i) => (
              <div key={i} className="text-sm text-[#333]">
                {a.result.recommendations.length > 1 && (
                  <span className="font-semibold">{rec.goalLabel}: </span>
                )}
                {rec.primary}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
