import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_STAGES } from "@/lib/types";
import StageSelect from "./StageSelect";
import TaskRow from "./TaskRow";
import RemindersCard from "./RemindersCard";
import AnalysesList from "./AnalysesList";
import NoteRow from "./NoteRow";
import LocalDateTime from "../../LocalDateTime";
import PhoneInput from "../PhoneInput";
import { updateContactInfo, addNote, addTask } from "../actions";
import { computeFA, type FAState } from "@/lib/fa";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client, error }, { data: notes }, { data: tasks }, { data: analyses }, { data: plan }, { data: reminders }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase
        .from("client_notes")
        .select("*, author:profiles(full_name)")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("client_tasks").select("*").eq("client_id", id).order("created_at", { ascending: true }),
      supabase
        .from("client_analyses")
        .select("id, created_at, result")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("client_financial_plans").select("data, updated_at").eq("client_id", id).maybeSingle(),
      supabase
        .from("reminders")
        .select("id, remind_at, message, sent_at")
        .eq("client_id", id)
        .order("remind_at", { ascending: true }),
    ]);

  if (error || !client) notFound();

  const stageInfo = CLIENT_STAGES.find((s) => s.value === client.stage);

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

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[2fr_1fr]">
      <div className="flex flex-col gap-5">
        {/* Header / contact info */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-serif text-2xl text-[#1C1C1C]">{client.full_name}</h1>
            <StageSelect clientId={client.id} stage={client.stage} />
          </div>
          <form action={updateContactInfo} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="client_id" value={client.id} />
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Full name
              <input
                name="full_name"
                defaultValue={client.full_name}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Phone
              <PhoneInput
                name="phone"
                defaultValue={client.phone}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Email
              <input
                name="email"
                defaultValue={client.email ?? ""}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Birthdate
              <input
                type="date"
                name="birth_date"
                defaultValue={client.birth_date ?? ""}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#666]">
              Source
              <input
                name="source"
                defaultValue={client.source ?? ""}
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
              >
                Save contact info
              </button>
            </div>
          </form>
        </div>

        {/* Notes / interaction history */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">
            Notes &amp; Interaction History
          </h2>
          <form action={addNote} className="mb-4 flex flex-col gap-2">
            <input type="hidden" name="client_id" value={client.id} />
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Log a call, what was discussed, next steps..."
              className="rounded-md border border-[#D9CFBA] px-3 py-2 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <button
              type="submit"
              className="self-start rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              Add Note
            </button>
          </form>
          <div className="flex flex-col gap-3">
            {(!notes || notes.length === 0) && (
              <p className="text-sm text-[#999]">No notes yet.</p>
            )}
            {notes?.map((n) => (
              <NoteRow
                key={n.id}
                note={n as unknown as { id: string; body: string; created_at: string; author?: { full_name?: string | null } | null }}
                clientId={client.id}
              />
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Tasks</h2>
          <form action={addTask} className="mb-4 flex flex-wrap gap-2">
            <input type="hidden" name="client_id" value={client.id} />
            <input
              name="title"
              required
              placeholder="e.g. Send application"
              className="flex-1 rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <input
              type="date"
              name="due_at"
              className="rounded-md border border-[#D9CFBA] px-3 py-1.5 text-sm outline-none focus:border-[#1C1C1C]"
            />
            <button
              type="submit"
              className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
            >
              Add Task
            </button>
          </form>
          <div className="flex flex-col gap-2">
            {(!tasks || tasks.length === 0) && <p className="text-sm text-[#999]">No tasks yet.</p>}
            {tasks?.map((t) => (
              <TaskRow key={t.id} task={t} clientId={client.id} />
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar: stage + analyses + financial analysis + follow-up */}
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Pipeline Stage</h2>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: stageInfo?.color }}
          >
            {stageInfo?.label}
          </span>
        </div>

        {/* Client Analyses */}
        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Client Analyses</h2>
          <div className="mb-3">
            <AnalysesList analyses={analyses ?? []} advisor={advisor} />
          </div>
          <a
            href={`/client-analyzer?client=${client.id}`}
            className="inline-block rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            Start New Analysis
          </a>
        </div>

        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Full Financial Analysis</h2>
          {plan?.data ? (
            <>
              <div className="mb-2 text-xs text-[#666]">
                Financial Wellness Score:{" "}
                <span className="font-semibold text-[#1C1C1C]">{computeFA(plan.data as FAState).overallScore} / 100</span>
              </div>
              <div className="mb-3 text-xs text-[#999]">
                Last updated <LocalDateTime iso={plan.updated_at} options={{ dateStyle: "medium" }} />
              </div>
            </>
          ) : (
            <p className="mb-3 text-xs text-[#999]">Not started yet.</p>
          )}
          <a
            href={`/clients/${client.id}/financial-analysis`}
            className="inline-block rounded-md border border-[#D9CFBA] px-3 py-1.5 text-xs font-semibold text-[#2E2E2E] hover:bg-[#EDE8DF]"
          >
            {plan?.data ? "Open Analysis" : "Start Full Financial Analysis"}
          </a>
        </div>

        <div className="rounded-lg border border-[#D9CFBA] bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Reminders</h2>
          <RemindersCard clientId={client.id} reminders={reminders ?? []} />
        </div>
      </div>
    </div>
  );
}
