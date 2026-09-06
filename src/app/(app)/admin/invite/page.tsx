import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteForm from "./InviteForm";
import AgentRoleRow from "./AgentRoleRow";
import UnassignedClientsSection from "./UnassignedClientsSection";

export default async function AdminInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile, error: myProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfileError) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[#D9CFBA] bg-white p-6 text-center">
        <p className="mb-2 text-sm font-semibold text-[#8B1A1A]">Could not load your profile.</p>
        <p className="text-xs text-[#666]">{myProfileError.message}</p>
      </div>
    );
  }

  if (myProfile?.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[#D9CFBA] bg-white p-6 text-center">
        <p className="text-sm text-[#666]">You don&rsquo;t have access to this page.</p>
      </div>
    );
  }

  const { data: agents, error: agentsError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, disabled_at")
    .order("created_at", { ascending: true });

  if (agentsError) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[#D9CFBA] bg-white p-6 text-center">
        <p className="mb-2 text-sm font-semibold text-[#8B1A1A]">Could not load your team.</p>
        <p className="text-xs text-[#666]">{agentsError.message}</p>
      </div>
    );
  }

  // Unassigned clients (owner_id is null — left behind when an advisor's access was removed) are
  // invisible to every advisor's own RLS-scoped queries by design, so this has to go through the
  // service-role client rather than the session client above, same as every other admin-only
  // cross-advisor read/write on this page.
  const admin = createAdminClient();
  const { data: unassignedClients } = await admin
    .from("clients")
    .select("id, full_name, stage, created_at")
    .is("owner_id", null)
    .order("created_at", { ascending: true });

  const activeAgents = (agents ?? []).filter((a) => !a.disabled_at);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Invite Agents</h1>

      <div className="mb-6 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Send an invite</h2>
        <p className="mb-3 text-xs text-[#707070]">
          Everyone you invite starts as an Advisor — they only ever see their own clients. Use the dropdown
          in the list below to make someone an Admin, which just adds the ability to invite and manage the
          team from this page — every advisor&rsquo;s client list, including an Admin&rsquo;s, stays private
          to them.
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

      <UnassignedClientsSection clients={unassignedClients ?? []} agents={activeAgents} />
    </div>
  );
}
