import { createClient } from "@/lib/supabase/server";
import PresentationsList from "./PresentationsList";

// Client-facing sales presentations (added 9/18) — Karina: "we need to work on the
// presentations as well... I feel like the portal is in a good place." Separate from the
// Knowledge Base (an advisor's own reference material) — these are decks an advisor actually
// shows a client. She and her team are still building the real decks, so this page ships as an
// empty library ready for them: add a title/description/link as each one is finished, same
// lightweight "link out" pattern Carrier Logins already uses on My Profile.
export default async function PresentationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: presentations } = user
    ? await supabase.from("presentations").select("*").eq("agent_id", user.id).order("created_at", { ascending: true })
    : { data: [] };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Presentations</h1>
      <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
        <PresentationsList presentations={presentations ?? []} />
      </div>
    </div>
  );
}
