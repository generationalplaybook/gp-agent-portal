"use client";

import { useState } from "react";

// `link` is computed server-side (see src/lib/site-url.ts, which already derives the site's
// own origin from the request — no hardcoded domain, and no client-side effect needed).
export default function IntakeLinkCard({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail — the link is still shown/openable either way.
    }
  }

  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Intake Link</h2>
      <p className="mb-3 text-xs text-[#888]">
        Send this to a client before your first meeting to gather their info ahead of time — they never see any
        recommendation, just a short form. Submissions land in your Clients list flagged for review.
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
          disabled={!link}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF] disabled:opacity-60"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
