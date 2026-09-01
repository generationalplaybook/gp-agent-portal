import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IllustrationData } from "@/lib/illustration";
import ScenarioForm from "./ScenarioForm";

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ id: string; scenarioId: string }>;
}) {
  const { id, scenarioId } = await params;
  const supabase = await createClient();

  const [
    { data: client, error: clientError },
    { data: scenario, error: scenarioError },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("clients").select("id, full_name").eq("id", id).single(),
    supabase
      .from("illustration_scenarios")
      .select("id, product_name, product_type, carrier, data, notes, converted_product_id")
      .eq("id", scenarioId)
      .single(),
    supabase.auth.getUser(),
  ]);

  if (clientError || !client || scenarioError || !scenario) notFound();

  let advisor: { name?: string; phone?: string; email?: string } | undefined;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).single();
    advisor = {
      name: profile?.full_name ?? undefined,
      phone: profile?.phone ?? undefined,
      email: profile?.email ?? user.email ?? undefined,
    };
  }

  return (
    <div className="mx-auto max-w-4xl">
      <a href={`/clients/${client.id}`} className="mb-4 inline-block text-xs text-[#666] underline hover:text-[#1C1C1C]">
        ← Back to {client.full_name}
      </a>
      <h1 className="mb-1 font-serif text-2xl text-[#1C1C1C]">Illustration Scenario</h1>
      <p className="mb-5 text-sm text-[#666]">
        {scenario.product_name}
        {scenario.carrier ? ` · ${scenario.carrier}` : ""}
        {scenario.product_type ? ` · ${scenario.product_type}` : ""} — exploratory only, not shown as a Product
        until you convert it.
      </p>
      <ScenarioForm
        clientId={client.id}
        clientName={client.full_name}
        scenario={{ ...scenario, data: scenario.data as IllustrationData }}
        advisor={advisor}
      />
    </div>
  );
}
