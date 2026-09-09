"use client";

import { useState } from "react";

// The lighter, first-touch link (src/app/pre-intake/[advisorId]) — reuses the SAME custom slug
// as the Full Intake link below (profiles.intake_slug), so there's nothing extra to configure
// here; setting/clearing it on the other card changes both links together.
export default function PreIntakeLinkCard({ siteUrl, advisorId, slug }: { siteUrl: string; advisorId: string; slug: string | null }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/pre-intake/${slug || advisorId}`;

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
    <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Pre-Intake Link</h2>
      <p className="mb-3 text-xs text-[#707070]">
        Send this if the client isn&rsquo;t already aware these investment opportunities are through life
        insurance/annuity products — e.g. they just booked a meeting after hearing &ldquo;financial and legacy
        planning.&rdquo; Short and general on purpose — just contact info and what&rsquo;s on their mind, no health
        or product questions. Once they know what this is about (after your first meeting, or if they already knew
        going in), use the Full Intake Link below instead.
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
      <p className="mt-2 text-[11px] text-[#707070]">Uses the same custom link handle you set below.</p>
    </div>
  );
}
