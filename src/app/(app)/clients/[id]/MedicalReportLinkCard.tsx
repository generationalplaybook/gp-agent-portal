"use client";

import { useState } from "react";

// Per-client, unguessable link — see clients.medical_report_token (schema.sql section 29). No
// slug/custom-handle option here (unlike the advisor Intake link) since this token is generated
// automatically and never needs to be memorable — it's copy-pasted or texted, not typed in.
export default function MedicalReportLinkCard({ siteUrl, token }: { siteUrl: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/medical-report/${token}`;

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
    <div>
      <p className="mb-2 text-xs text-[#707070]">
        Send this to the client to fill out themselves, or open it and fill it out together on a call. Submissions
        land right here on their profile.
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
