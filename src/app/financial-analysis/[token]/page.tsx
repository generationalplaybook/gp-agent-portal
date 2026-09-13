import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PublicFAClient from "./PublicFAClient";
import type { FAState } from "@/lib/fa";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public, unauthenticated page — same shape as src/app/medical-report/[token]/page.tsx: sits
// outside the (app) group so no login is required, keyed by a random per-client token
// (clients.financial_analysis_token, same pattern as clients.medical_report_token) rather than
// the advisor's own id/slug, and uses the admin client to resolve it since there's no session to
// do it any other way. Karina, 9/9: "can we generate a link to send out for the financial needs
// analysis" — she wants the client filling this out themselves, same self-service pattern as the
// Medical Report link.
export default async function PublicFinancialAnalysisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, full_name, birth_date, owner_id")
    .eq("financial_analysis_token", token)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: advisor }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("full_name, phone, email").eq("id", client.owner_id).maybeSingle(),
    admin.from("client_financial_plans").select("data").eq("client_id", client.id).maybeSingle(),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF8F4] px-4 py-10">
      <div className="w-full max-w-6xl">
        <PublicFAClient
          token={token}
          clientName={client.full_name}
          clientDob={client.birth_date}
          savedState={(plan?.data as FAState | undefined) ?? null}
          advisorName={advisor?.full_name ?? undefined}
          advisorEmail={advisor?.email ?? undefined}
          advisorPhone={advisor?.phone ?? undefined}
        />
      </div>
    </div>
  );
}
