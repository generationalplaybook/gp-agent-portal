import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">GP Advisor Portal</h1>
        <p className="mb-6 text-sm text-[#666]">Sign in to your advisor account.</p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        <form action={login} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
            Password
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            Sign In
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#888]">
          New advisor?{" "}
          <Link href="/signup" className="font-medium text-[#1C1C1C] underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
