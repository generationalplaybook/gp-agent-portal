"use client";

import { useState } from "react";
import { inviteAgent } from "./actions";

export default function InviteForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      await inviteAgent(email, fullName);
      setStatus({ ok: true, message: `Invite sent to ${email}.` });
      setFullName("");
      setEmail("");
    } catch (err) {
      setStatus({ ok: false, message: err instanceof Error ? err.message : "Could not send invite." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Full name
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Agent's name"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[#666]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agent@email.com"
          className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
        />
      </label>
      <button
        type="submit"
        disabled={sending}
        className="rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send Invite"}
      </button>
      {status && (
        <p className={`w-full text-xs font-semibold ${status.ok ? "text-[#1E6B3C]" : "text-[#8B1A1A]"}`}>
          {status.message}
        </p>
      )}
    </form>
  );
}
