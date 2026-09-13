"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordReset, sendLoginCode, verifyLoginCode } from "./actions";

// Karina, 9/8, locked out on another device with no way back in: "I should get a reset email or
// a one time code to log in ... or an option of if I want a one time code ... or if I wanna
// reset my password." So this page leads with that choice rather than picking one for her.
type View = "choose" | "reset-form" | "reset-sent" | "otp-email" | "otp-code";

export default function ForgotPasswordPage() {
  const [view, setView] = useState<View>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await sendPasswordReset(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setView("reset-sent");
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await sendLoginCode(email);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setView("otp-code");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    // On success this redirects (throws internally) and never returns — only a failure result
    // makes it back here.
    const result = await verifyLoginCode(email, code);
    setBusy(false);
    if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 shadow-sm">
        {view === "choose" && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Can&rsquo;t sign in?</h1>
            <p className="mb-6 text-sm text-[#666]">Choose how you&rsquo;d like to get back in.</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setView("otp-email")}
                className="rounded-md border border-[#1C1C1C] px-4 py-2 text-left text-sm font-semibold text-[#1C1C1C] hover:bg-[#EDE8DF]"
              >
                Email me a one-time code
                <span className="mt-0.5 block text-xs font-normal text-[#707070]">
                  Sign in right away with a code, no password needed.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView("reset-form")}
                className="rounded-md border border-[#D9CFBA] px-4 py-2 text-left text-sm font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
              >
                Reset my password
                <span className="mt-0.5 block text-xs font-normal text-[#707070]">
                  Email me a link to set a new password.
                </span>
              </button>
            </div>
            <p className="mt-5 text-center text-xs text-[#707070]">
              <Link href="/login" className="font-medium text-[#1C1C1C] underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {view === "reset-form" && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Reset your password</h1>
            <p className="mb-6 text-sm text-[#666]">We&rsquo;ll email you a link to set a new one.</p>
            <form onSubmit={handleSendReset} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
                Email
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </label>
              {error && <p className="text-sm text-[#8B1A1A]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setView("choose");
                setError("");
              }}
              className="mt-5 block w-full text-center text-xs font-medium text-[#1C1C1C] underline"
            >
              Back
            </button>
          </>
        )}

        {view === "reset-sent" && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Check your email</h1>
            <p className="mb-6 text-sm text-[#666]">
              If <span className="font-medium text-[#2E2E2E]">{email}</span> has an account, a
              password reset link is on its way. Open it on whichever device you&rsquo;d like to
              be signed in on.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              Back to sign in
            </Link>
          </>
        )}

        {view === "otp-email" && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Email me a code</h1>
            <p className="mb-6 text-sm text-[#666]">We&rsquo;ll send a one-time code to sign in with.</p>
            <form onSubmit={handleSendCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
                Email
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
                />
              </label>
              {error && <p className="text-sm text-[#8B1A1A]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send Code"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setView("choose");
                setError("");
              }}
              className="mt-5 block w-full text-center text-xs font-medium text-[#1C1C1C] underline"
            >
              Back
            </button>
          </>
        )}

        {view === "otp-code" && (
          <>
            <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Enter your code</h1>
            <p className="mb-6 text-sm text-[#666]">
              We sent a 6-digit code to <span className="font-medium text-[#2E2E2E]">{email}</span>.
              It&rsquo;s good for a few minutes.
            </p>
            <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
                Code
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm tracking-widest outline-none focus:border-[#1C1C1C]"
                />
              </label>
              {error && <p className="text-sm text-[#8B1A1A]">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E] disabled:opacity-60"
              >
                {busy ? "Verifying..." : "Sign In"}
              </button>
            </form>
            <button
              type="button"
              onClick={async () => {
                setError("");
                setBusy(true);
                const result = await sendLoginCode(email);
                setBusy(false);
                if (!result.ok) setError(result.error);
              }}
              disabled={busy}
              className="mt-3 block w-full text-center text-xs font-medium text-[#1C1C1C] underline disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setView("choose");
                setError("");
                setCode("");
              }}
              className="mt-2 block w-full text-center text-xs font-medium text-[#707070] underline"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
