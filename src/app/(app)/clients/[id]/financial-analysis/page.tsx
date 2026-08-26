import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FAClient from "./FAClient";
import type { FAState } from "@/lib/fa";

export default async function FinancialAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client, error }, { data: plan }] = await Promise.all([
    supabase.from("clients").select("id, full_name, phone, email, birth_date").eq("id", id).single(),
    supabase.from("client_financial_plans").select("data").eq("client_id", id).maybeSingle(),
  ]);

  // A real "no such client" and a failed query used to look identical — both showed
  // Next's generic 404 page. Only fall back to notFound() when there's truly no client;
  // if the query itself failed (permissions, etc.), show why instead of hiding it.
  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-[#D9CFBA] bg-white p-6 text-center">
        <p className="mb-2 text-sm font-semibold text-[#8B1A1A]">Could not load this client.</p>
        <p className="text-xs text-[#666]">{error.message}</p>
      </div>
    );
  }
  if (!client) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let advisorName: string | undefined;
  let advisorEmail: string | undefined;
  let advisorPhone: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .single();
    advisorName = profile?.full_name ?? undefined;
    advisorPhone = profile?.phone ?? undefined;
    advisorEmail = profile?.email ?? user.email ?? undefined;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <FAClient
        clientId={client.id}
        clientName={client.full_name}
        clientDob={client.birth_date}
        savedState={(plan?.data as FAState | undefined) ?? null}
        advisorName={advisorName}
        advisorEmail={advisorEmail}
        advisorPhone={advisorPhone}
      />
    </div>
  );
}
