"use client";

import { useState } from "react";

// Per-client, unguessable link — see clients.financial_analysis_token (schema.sql section 47).
// Same pattern as MedicalReportLinkCard.tsx: no slug/custom-handle option, since this token is
// generated automatically and never needs to be memorable — it's copy-pasted or texted, not
// typed in. Karina, 9/9: "can we generate a link to send out for the financial needs analysis."
export default function FinancialAnalysisLinkCard({ siteUrl, token }: { siteUrl: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/financial-analysis/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail — the link is still shown/openable either way.
    }
  }

  return (
    <div className="mt-4 border-t border-[#EDE8DF] pt-4">
      <p className="mb-2 text-xs text-[#707070]">
        Send this to the client to fill out themselves, at their own pace. Their answers land right here — open
        Analysis above to see them.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-md border border-[#D9CFBA] bg-[#F5F0E8] px-3 py-1.5 text-xs text-[#666]"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
