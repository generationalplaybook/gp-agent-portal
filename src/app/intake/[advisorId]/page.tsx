import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import IntakeForm from "./IntakeForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public, unauthenticated page — this route sits outside the (app) group, which is what makes
// it reachable with no login (see src/app/(app)/layout.tsx: auth is enforced per-page there,
// not by a shared middleware). Uses the admin client purely to read this one advisor's display
// name for branding — no session exists to do it any other way.
//
// The URL segment can be either the advisor's raw profile id (the original link shape) or a
// custom handle they've set on their Profile page (see intake_slug in the schema) — whichever
// was set is what got shared, so both need to resolve. Once resolved, the *real* id is what
// gets passed down to IntakeForm/submitIntake — nothing below this needs to know slugs exist.
export default async function IntakePage({ params }: { params: Promise<{ advisorId: string }> }) {
  const { advisorId: slugOrId } = await params;
  const admin = createAdminClient();

  const { data: advisor } = UUID_RE.test(slugOrId)
    ? await admin.from("profiles").select("id, full_name").eq("id", slugOrId).maybeSingle()
    : await admin.from("profiles").select("id, full_name").ilike("intake_slug", slugOrId).maybeSingle();

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
        <IntakeForm advisorId={advisor.id} advisorName={advisor.full_name ?? "your advisor"} />
      </div>
    </div>
  );
}
