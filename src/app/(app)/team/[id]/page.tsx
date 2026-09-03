import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RECRUIT_STAGES } from "@/lib/types";
import RecruitStageSelect from "./RecruitStageSelect";
import RecruitContactForm from "./RecruitContactForm";
import RecruitSourceField from "./RecruitSourceField";
import RecruitNotesField from "./RecruitNotesField";
import DeleteRecruitButton from "./DeleteRecruitButton";
import LinkedClientCard from "./LinkedClientCard";
import RemindersCard from "../../clients/[id]/RemindersCard";

export default async function RecruitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: recruit, error }, { data: reminders }] = await Promise.all([
    supabase.from("recruits").select("*").eq("id", id).single(),
    supabase.from("reminders").select("id, remind_at, message, sent_at").eq("recruit_id", id).order("remind_at", { ascending: true }),
  ]);

  if (error || !recruit) notFound();

  let linkedClient: { id: string; full_name: string } | null = null;
  if (recruit.client_id) {
    const { data } = await supabase.from("clients").select("id, full_name").eq("id", recruit.client_id).maybeSingle();
    linkedClient = data ?? null;
  }

  const stageInfo = RECRUIT_STAGES.find((s) => s.value === recruit.stage);

  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-6">
        {/* Header / contact info */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-serif text-2xl text-[#1C1C1C]">{recruit.full_name}</h1>
            <RecruitStageSelect recruitId={recruit.id} stage={recruit.stage} />
          </div>
          <RecruitContactForm recruit={recruit} />
          <div className="mt-4 border-t border-[#EDE8DF] pt-4">
            <DeleteRecruitButton recruitId={recruit.id} recruitName={recruit.full_name} />
          </div>
        </div>

        {/* Linked client — optional cross-reference, not a merge */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Linked Client</h2>
          <LinkedClientCard recruitId={recruit.id} linkedClient={linkedClient} />
        </div>

        {/* Notes */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Notes</h2>
          <RecruitNotesField recruitId={recruit.id} notes={recruit.notes_summary} />
        </div>
      </div>

      {/* Sidebar: stage + source + reminders */}
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Stage</h2>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: stageInfo?.color }}
          >
            {stageInfo?.label}
          </span>
          <RecruitSourceField recruitId={recruit.id} source={recruit.source} />
        </div>

        <div className="rounded-lg border border-[#D9CFBA] bg-white p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Reminders</h2>
          <RemindersCard owner={{ recruitId: recruit.id }} reminders={reminders ?? []} />
        </div>
      </div>
    </div>
  );
}
