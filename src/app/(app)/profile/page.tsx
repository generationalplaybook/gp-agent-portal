import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CredentialRow from "./CredentialRow";
import ProfileInfoForm from "./ProfileInfoForm";
import { addCredential } from "./actions";

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
        <ProfileInfoForm profile={profile ?? null} />
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
