"use client";

import { generateClientPDF, type AdvisorInfo } from "@/lib/analyzer-pdf";
import type { AnalyzerResult } from "@/lib/analyzer";

export default function AnalysesList({
  analyses,
  advisor,
}: {
  analyses: { id: string; created_at: string; result: AnalyzerResult }[];
  advisor?: AdvisorInfo;
}) {
  if (!analyses.length) {
    return <p className="text-xs text-[#999]">No analyses yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {analyses.map((a) => (
        <div key={a.id} className="rounded-md border border-[#D9CFBA] p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs text-[#999]">{new Date(a.created_at).toLocaleString()}</span>
            <button
              type="button"
              onClick={() => generateClientPDF(a.result, advisor)}
              className="text-xs font-semibold text-[#1C1C1C] underline hover:text-[#2E2E2E]"
            >
              Download PDF
            </button>
          </div>
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
