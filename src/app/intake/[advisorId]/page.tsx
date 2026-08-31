import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import IntakeForm from "./IntakeForm";

// Public, unauthenticated page — this route sits outside the (app) group, which is what makes
// it reachable with no login (see src/app/(app)/layout.tsx: auth is enforced per-page there,
// not by a shared middleware). Uses the admin client purely to read this one advisor's display
// name for branding — no session exists to do it any other way.
export default async function IntakePage({ params }: { params: Promise<{ advisorId: string }> }) {
  const { advisorId } = await params;
  const admin = createAdminClient();

  const { data: advisor } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF8F4] px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-[#1C1C1C]">Get Started</h1>
          <p className="mt-1 text-sm text-[#666]">
            A few quick questions for {advisor.full_name ?? "your advisor"} to review before your first
            meeting — so we can come prepared with real options instead of starting from scratch.
          </p>
        </div>
        <IntakeForm advisorId={advisorId} advisorName={advisor.full_name ?? "your advisor"} />
      </div>
    </div>
  );
}
