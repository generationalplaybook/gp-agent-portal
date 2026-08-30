import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhoneInput from "../clients/PhoneInput";
import CredentialRow from "./CredentialRow";
import { updateMyProfile, addCredential } from "./actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: credentials }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, middle_name, last_name, email, phone, role, scheduling_link")
      .eq("id", user.id)
      .single(),
    supabase
      .from("advisor_credentials")
      .select("id, label, code")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">My Profile</h1>

      <div className="mb-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Info</h2>
        <form action={updateMyProfile} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            First name
            <input
              name="first_name"
              defaultValue={profile?.first_name ?? ""}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Middle name
            <input
              name="middle_name"
              defaultValue={profile?.middle_name ?? ""}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Last name
            <input
              name="last_name"
              defaultValue={profile?.last_name ?? ""}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666]">
            Phone
            <PhoneInput
              name="phone"
              defaultValue={profile?.phone}
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
            Email
            <input
              disabled
              value={profile?.email ?? ""}
              className="rounded-md border border-[#D9CFBA] bg-[#F5F0E8] px-3 py-1.5 text-sm text-[#888]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#666] sm:col-span-2">
            Cal.com Scheduling Link
            <input
              name="scheduling_link"
              defaultValue={profile?.scheduling_link ?? ""}
              placeholder="e.g. https://cal.com/your-name/consultation"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <span className="mt-0.5 text-[11px] text-[#999]">
              Paste the booking link for the event type you want clients scheduling into (set video — Cal Video,
              Zoom, or Google Meet — on that event type inside Cal.com). Once saved, a &ldquo;Schedule a Call&rdquo;
              button appears on every client&rsquo;s profile.
            </span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-[#1C1C1C] px-4 py-2 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#555]">My Credentials</h2>
        <p className="mb-4 text-xs text-[#888]">
          Keep track of your NPN, carrier agent codes, and anything else you want handy — visible only to you
          (and admins, for support).
        </p>
        <form action={addCredential} className="mb-4 flex flex-wrap gap-2">
          <input
            name="label"
            required
            placeholder="e.g. NPN, North American Agent Code"
            className="flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <input
            name="code"
            required
            placeholder="Value"
            className="flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
          />
          <button
            type="submit"
            className="rounded-md bg-[#1C1C1C] px-4 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
          >
            Add
          </button>
        </form>
        <div>
          {(!credentials || credentials.length === 0) && (
            <p className="text-sm text-[#999]">No credentials saved yet.</p>
          )}
          {credentials?.map((c) => (
            <CredentialRow key={c.id} credential={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
