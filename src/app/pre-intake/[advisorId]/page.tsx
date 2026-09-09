import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import PreIntakeForm from "./PreIntakeForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public, unauthenticated page — same shape as src/app/intake/[advisorId]/page.tsx, and
// deliberately reuses the SAME advisor id/custom-slug resolution (profiles.intake_slug) rather
// than adding a second slug column: whatever custom handle an advisor has already set works for
// both /intake/<handle> and /pre-intake/<handle>, so there's nothing new for them to configure.
//
// This is the "lighter" first-touch link (Karina, 9/9): for a prospect who booked a meeting off
// "we do financial and legacy planning" without yet being told it's specifically life insurance/
// annuity products. See PreIntakeForm for why the question set is so much shorter than the
// regular Intake form's.
export default async function PreIntakePage({ params }: { params: Promise<{ advisorId: string }> }) {
  const { advisorId: slugOrId } = await params;
  const admin = createAdminClient();

  const { data: advisor } = UUID_RE.test(slugOrId)
    ? await admin.from("profiles").select("id, full_name").eq("id", slugOrId).maybeSingle()
    : await admin.from("profiles").select("id, full_name").ilike("intake_slug", slugOrId).maybeSingle();

  if (!advisor) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-[#FAF8F4] px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-[#1C1C1C]">A Little About You</h1>
          <p className="mt-1 text-sm text-[#666]">
            A couple quick questions for {advisor.full_name ?? "your advisor"} so they can make the most of your
            upcoming meeting.
          </p>
        </div>
        <PreIntakeForm advisorId={advisor.id} advisorName={advisor.full_name ?? "your advisor"} />
      </div>
    </div>
  );
}
