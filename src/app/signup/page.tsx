import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#D9CFBA] bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-[#1C1C1C]">This portal is invite-only</h1>
        <p className="mb-6 text-sm text-[#666]">
          The GP Advisor Portal is available only to Generational Playbook agents. If you&rsquo;re
          expecting access, ask your admin to send you an invite.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}
