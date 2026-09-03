import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import MedicalReportForm from "./MedicalReportForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public, unauthenticated page — same shape as src/app/intake/[advisorId]/page.tsx: sits outside
// the (app) group so no login is required, and uses the admin client purely to resolve this one
// client's first name for a friendly greeting (no session exists to do it any other way).
//
// Unlike the Intake link (keyed by the advisor's own id/slug — meant to be memorable/shareable
// broadly), this is keyed by a random per-client token (clients.medical_report_token) that's
// never displayed anywhere except the advisor's own "Copy Link" button, since health information
// is more sensitive than a general intake form.
export default async function MedicalReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, first_name, full_name, owner_id")
    .eq("medical_report_token", token)
    .maybeSingle();

  if (!client) notFound();

  const { data: advisor } = await admin.from("profiles").select("full_name").eq("id", client.owner_id).maybeSingle();

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF8F4] px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-[#1C1C1C]">Medical Condition Report</h1>
          <p className="mt-1 text-sm text-[#666]">
            For {client.first_name ?? client.full_name} — a few questions about a health condition so{" "}
            {advisor?.full_name ?? "your advisor"} can check with insurance carriers on your behalf before you
            apply. Fill out as much as you know; you can leave anything blank.
          </p>
        </div>
        <MedicalReportForm token={token} />
      </div>
    </div>
  );
}
