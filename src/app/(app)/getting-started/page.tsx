import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StartTourButton from "./StartTourButton";
import { TOUR_STEPS } from "../tour-steps";

// Karina, 9/9, after seeing the first (checklist-style) draft: "I want it so that it highlights
// where the person is supposed to click and where they're supposed to input the info... you know
// when you get a new platform and it says, oh, click this, it highlights, okay, click here, this
// is your profile... and then you go next, and then it goes to the next step."
//
// This page is just the landing spot for that — the actual walkthrough (TourEngine.tsx) runs as
// an overlay on top of My Profile, spotlighting the real field or card at each stop. Reachable
// any time from the account menu, top right — "Start the Tour" relaunches it from scratch and
// can't lose anything, because nothing about a person's actual setup is stored by the tour
// itself; the three status lines below just reflect whatever's already true on the account,
// live, every time this loads.
//
// Scope, narrowed 9/9: this used to end by sending someone to Clients to add one, which Karina
// flagged as broken both mechanically (the tour overlay blocked the real "+ New Client" button
// until Finish was clicked) and conceptually — a client can start from Pre-Intake, full Intake,
// or a manual add, and meetings/reminders/illustrations are a whole layer beyond that. Her call:
// "That profile needs to be set correctly for everything else to flow." So this walkthrough is
// profile setup only; the rest of the platform is covered in live team training or a short video.
export default async function GettingStartedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, intake_slug, cal_api_key")
    .eq("id", user.id)
    .single();

  const statuses = [
    { label: "Profile complete", done: !!(profile?.first_name && profile?.last_name && profile?.phone) },
    { label: "Custom link set", done: !!profile?.intake_slug },
    { label: "Calendar connected", done: !!profile?.cal_api_key },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-2xl text-[#1C1C1C]">Getting Started</h1>
      <p className="mt-1 text-sm text-[#555]">
        A guided walkthrough of your profile setup — it highlights exactly what to click and where to type, right on
        the real page. Come back here any time, from your account menu, for a refresher.
      </p>

      <div className="mt-6 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1C1C1C]">Ready when you are</h2>
            <p className="mt-1 text-sm text-[#555]">Six stops, a couple minutes each. You can skip out any time.</p>
          </div>
          <StartTourButton />
        </div>

        <ol className="mt-5 flex flex-col gap-2 border-t border-[#EDE8DF] pt-4">
          {TOUR_STEPS.map((step, i) => (
            <li key={step.id} className="flex items-baseline gap-3 text-sm">
              <span className="w-4 shrink-0 text-xs font-semibold text-[#B3AB9B]">{i + 1}</span>
              <span className="text-[#2E2E2E]">{step.title}</span>
            </li>
          ))}
        </ol>

        <p className="mt-4 border-t border-[#EDE8DF] pt-4 text-xs text-[#707070]">
          This covers your profile — the part everything else depends on. Adding clients, booking meetings, sending
          Pre-Intake/Intake links, and building illustrations are covered in team training instead.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-[#D9CFBA] bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#555]">Where You Stand</h2>
        <ul className="flex flex-col gap-2">
          {statuses.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  s.done ? "bg-[#E9F3EC] text-[#1E6B3C]" : "bg-[#EDE8DF] text-[#B3AB9B]"
                }`}
              >
                {s.done ? "✓" : "–"}
              </span>
              <span className={s.done ? "text-[#1C1C1C]" : "text-[#707070]"}>{s.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#707070]">
          These reflect your account right now — they update the moment you actually fill something in, nothing to
          reset or lose.
        </p>
      </div>
    </div>
  );
}
