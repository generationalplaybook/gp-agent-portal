"use client";

import { useState } from "react";
import { updateIntakeSlug } from "./actions";

interface Props {
  siteUrl: string;
  advisorId: string;
  initialSlug: string | null;
}

// `siteUrl` is computed server-side (see src/lib/site-url.ts, which already derives the site's
// own origin from the request — no hardcoded domain, and no client-side effect needed).
//
// The link shown is /intake/<slug> when a custom handle is set, otherwise /intake/<advisorId> —
// both forms always resolve (see src/app/intake/[advisorId]/page.tsx), so setting or clearing a
// slug here never breaks a link that's already been shared under the other form.
export default function IntakeLinkCard({ siteUrl, advisorId, initialSlug }: Props) {
  const [slugInput, setSlugInput] = useState(initialSlug ?? "");
  const [savedSlug, setSavedSlug] = useState(initialSlug ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = `${siteUrl}/intake/${savedSlug || advisorId}`;
  const trimmedInput = slugInput.trim().toLowerCase();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail — the link is still shown/openable either way.
    }
  }

  async function handleSaveSlug() {
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set("intake_slug", slugInput);
    const res = await updateIntakeSlug(formData);
    setBusy(false);
    if (res.ok) {
      setSavedSlug(trimmedInput);
      setSlugInput(trimmedInput);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Intake Link</h2>
      <p className="mb-3 text-xs text-[#707070]">
        Send this to a client before your first meeting to gather their info ahead of time — they never see any
        recommendation, just a short form. Submissions land in your Clients list flagged for review.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
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

      <div className="border-t border-[#EDE8DF] pt-3">
        <label className="flex flex-col gap-1 text-xs text-[#666]">
          Custom link <span className="font-normal text-[#707070]">(optional — e.g. &quot;karina&quot; instead of the long id above)</span>
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#707070]">{siteUrl}/intake/</span>
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="karina"
            className="min-w-0 flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <button
            type="button"
            onClick={handleSaveSlug}
            disabled={busy || trimmedInput === savedSlug}
            className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
        {error && <p className="mt-1 text-[11px] font-semibold text-[#B23B3B]">{error}</p>}
        {!error && savedSlug && (
          <p className="mt-1 text-[11px] text-[#707070]">
            Heads up: changing this later will break any link you&apos;ve already shared using this handle (your
            id-based link above never breaks).
          </p>
        )}
      </div>
    </div>
  );
}
