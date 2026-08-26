import { createClient } from "@/lib/supabase/server";
import AnalyzerClient from "./AnalyzerClient";

export default async function ClientAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client: clientId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let advisor: { name?: string; phone?: string; email?: string } | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .single();
    advisor = {
      name: profile?.full_name ?? undefined,
      phone: profile?.phone ?? undefined,
      email: profile?.email ?? user.email ?? undefined,
    };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, phone, email, birth_date")
    .order("full_name", { ascending: true });

  const prefillClient = clientId ? clients?.find((c) => c.id === clientId) ?? null : null;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-5 font-serif text-2xl text-[#1C1C1C]">Client Analyzer</h1>
      <AnalyzerClient
        advisor={advisor}
        existingClients={(clients ?? []).map((c) => ({ id: c.id, full_name: c.full_name }))}
        prefillClient={prefillClient}
      />
    </div>
  );
}
