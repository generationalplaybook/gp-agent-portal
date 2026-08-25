import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-[#F5F0E8] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-[#1C1C1C]">Create your agent account</h1>
        <p className="mb-6 text-sm text-[#666]">GP Agent Portal</p>

        {error && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>
        )}

        <form action={signup} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
            Full name
            <input
              type="text"
              name="full_name"
              required
              className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
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
              minLength={6}
              className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            Create Account
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#888]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#1C1C1C] underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
