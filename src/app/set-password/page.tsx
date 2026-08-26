"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// This page only ever runs after a real invite/recovery redirect (with a session in the URL).
// The Supabase browser client is created lazily on mount (never during server-side rendering /
// build-time prerendering) since it needs the browser's URL fragment to pick up the session.
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const supabase = supabaseRef.current;
    if (!supabase) return;
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Set your password</h1>
        <p className="mb-6 text-sm text-[#666]">GP Advisor Portal</p>

        {checking ? (
          <p className="text-sm text-[#888]">Checking your invite link...</p>
        ) : !hasSession ? (
          <p className="text-sm text-[#8B1A1A]">
            This link has expired or is invalid. Ask your admin to send you a new invite, or{" "}
            <a href="/login" className="underline">
              go to login
            </a>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            {error && <p className="text-sm text-[#8B1A1A]">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Set Password & Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
