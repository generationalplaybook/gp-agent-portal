import { createClientRecord } from "../actions";
import { CLIENT_STAGES } from "@/lib/types";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">New Client</h1>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      <form action={createClientRecord} className="flex flex-col gap-4 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
          Full name *
          <input
            type="text"
            name="full_name"
            required
            className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
          Phone
          <input
            type="tel"
            name="phone"
            placeholder="000-000-0000"
            className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
          Email
          <input
            type="email"
            name="email"
            className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
          Source
          <input
            type="text"
            name="source"
            placeholder="Referral, Facebook ad, walk-in, etc."
            className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#2E2E2E]">
          Stage
          <select
            name="stage"
            defaultValue="lead"
            className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
          >
            {CLIENT_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-2 rounded-md bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
        >
          Create Client
        </button>
      </form>
    </div>
  );
}
