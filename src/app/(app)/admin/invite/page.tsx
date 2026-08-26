import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteForm from "./InviteForm";
import AgentRoleRow from "./AgentRoleRow";

export default async function AdminInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (myProfile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[#D9CFBA] bg-white p-6 text-center">
        <p className="text-sm text-[#666]">You don&rsquo;t have access to this page.</p>
      </div>
    );
  }

  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Invite Agents</h1>

      <div className="mb-6 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Send an invite</h2>
        <p className="mb-3 text-xs text-[#888]">
          Everyone you invite starts as an Advisor — they can only see their own clients. Use the dropdown
          in the list below to make someone an Admin (full access to every client, plus the ability to
          invite others).
        </p>
        <InviteForm />
      </div>

      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Your Team</h2>
        <div className="flex flex-col divide-y divide-[#EDE8DF]">
          {(agents ?? []).map((a) => (
            <AgentRoleRow key={a.id} agent={a} currentUserId={user.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
