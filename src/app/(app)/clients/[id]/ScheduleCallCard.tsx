"use client";

import { useState } from "react";

export default function ScheduleCallCard({
  schedulingLink,
  clientName,
  clientEmail,
}: {
  schedulingLink: string | null;
  clientName: string;
  clientEmail: string | null;
}) {
  const [showWidget, setShowWidget] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!schedulingLink) {
    return (
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#555]">Schedule a Call</h2>
        <p className="text-xs text-[#888]">
          Add your Cal.com scheduling link in{" "}
          <a href="/profile" className="text-[#1C1C1C] underline underline-offset-2">
            My Profile
          </a>{" "}
          to enable booking calls (with a video link) straight from client profiles.
        </p>
      </div>
    );
  }

  // Pre-fill the client's name/email on the Cal.com booking page so the advisor doesn't have
  // to re-type them, and so it's obvious which client the booking is for either way.
  const params = new URLSearchParams();
  if (clientName) params.set("name", clientName);
  if (clientEmail) params.set("email", clientEmail);
  const query = params.toString();
  const personalizedLink = schedulingLink + (query ? (schedulingLink.includes("?") ? "&" : "?") + query : "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(personalizedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (e.g. non-HTTPS, permissions) — the link is still shown/openable.
    }
  }

  return (
    <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Schedule a Call</h2>
      <div className="flex flex-wrap gap-2">
        <a
          href={personalizedLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          Open Scheduling Page
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          {copied ? "Copied!" : "Copy Link to Send"}
        </button>
        <button
          type="button"
          onClick={() => setShowWidget((v) => !v)}
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
        >
          {showWidget ? "Hide Widget" : "Book Here"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[#999]">
        Copy the link to text or email {clientName.split(" ")[0] || "the client"} directly, or book it with them
        live. Cal.com emails the video join link to both of you once it&rsquo;s booked.
      </p>
      {showWidget && (
        <iframe
          src={personalizedLink}
          className="mt-4 h-[600px] w-full rounded-md border border-[#D9CFBA]"
          title="Schedule a call"
        />
      )}
    </div>
  );
}
