"use client";

import { useState } from "react";
import { connectCalCom, disconnectCalCom } from "./actions";

// Separate from ProfileInfoForm's plain save-on-submit fields because this one makes a real
// network call out to Cal.com (registering a webhook) and needs to surface whatever Cal.com
// actually says back — a generic "Saved ✓" wouldn't tell the advisor whether the connection
// really worked.
export default function CalSyncCard({ connected }: { connected: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  async function handleConnect() {
    setBusy(true);
    setStatus(null);
    const formData = new FormData();
    formData.set("cal_api_key", apiKey);
    const res = await connectCalCom(formData);
    if (res.ok) {
      setStatus({ ok: true, message: "Connected ✓ — bookings will start syncing automatically." });
      setApiKey("");
    } else {
      setStatus({ ok: false, message: res.error });
    }
    setBusy(false);
  }

  async function handleDisconnect() {
    setBusy(true);
    await disconnectCalCom();
    setBusy(false);
    setConfirmingDisconnect(false);
    setStatus(null);
  }

  return (
    <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">Cal.com Auto-Sync</h2>
      <p className="mb-4 text-xs text-[#707070]">
        Only for Cal.com — connect your account and a booking made through your scheduling link will
        automatically show up as a meeting on the right client&rsquo;s profile, no manual entry needed. Find
        your key in Cal.com under Settings → Developer → API Keys.
      </p>

      {connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#E9F3EC] px-3 py-1 text-xs font-semibold text-[#1E6B3C]">
            Connected ✓
          </span>
          {!confirmingDisconnect ? (
            <button
              type="button"
              onClick={() => setConfirmingDisconnect(true)}
              className="text-xs text-[#8B1A1A] underline hover:text-[#6b1414]"
            >
              Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8B1A1A]">Stop syncing new bookings?</span>
              <button
                type="button"
                disabled={busy}
                onClick={handleDisconnect}
                className="rounded-md bg-[#8B1A1A] px-2 py-1 text-xs font-semibold text-white hover:bg-[#6b1414] disabled:opacity-60"
              >
                {busy ? "Disconnecting..." : "Yes, disconnect"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(false)}
                className="rounded-md border border-[#D9CFBA] px-2 py-1 text-xs text-[#2E2E2E] hover:bg-[#EDE8DF]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="cal_live_..."
            className="min-w-[220px] flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <button
            type="button"
            disabled={busy || !apiKey.trim()}
            onClick={handleConnect}
            className="rounded-md bg-[#1C1C1C] px-4 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
          >
            {busy ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}

      {status && (
        <p className={`mt-3 text-xs ${status.ok ? "text-[#1E6B3C]" : "text-[#8B1A1A]"}`}>{status.message}</p>
      )}
    </div>
  );
}
