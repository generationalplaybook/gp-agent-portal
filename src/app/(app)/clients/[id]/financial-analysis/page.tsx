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

  if (error || !client) notFound();

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
