import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StepToggle from "./StepToggle";
import RestartButton from "./RestartButton";
import type { ManualStepId } from "./actions";

// Karina, 9/9: "can we build a getting started step... completing your profile, setting up your
// links, linking your calendars, step by step of what they need to do... they can either do that
// right away as soon as they make the account, or they can return to it later, and they can
// restart it at any time that they need a refresher."
//
// Six steps. Three are detected live from real profile data every time this loads (no separate
// "done" flag to get out of sync) — Complete Your Profile, Set Your Custom Link, Connect Your
// Calendar. The other three have no natural DB signal, so they're a manual checkbox
// (StepToggle / profiles.onboarding_steps) — Know Your Two Links, Review Your Notifications,
// Try It With a Client. See schema.sql section 49.
//
// Icons are small custom line-icons in the same stroke style already used on the Home dashboard
// (page.tsx) rather than real screenshots — screenshots go stale the moment a page's layout
// changes; these don't, and they keep this feeling like part of the app instead of a bolted-on
// PDF.
export default async function GettingStartedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, intake_slug, cal_api_key, onboarding_steps")
    .eq("id", user.id)
    .single();

  const manualSteps = (profile?.onboarding_steps as Record<string, boolean>) ?? {};
  const isManualDone = (id: ManualStepId) => manualSteps[id] === true;

  const steps = [
    {
      id: "profile" as const,
      icon: <IconProfile />,
      title: "Complete Your Profile",
      done: !!(profile?.first_name && profile?.last_name && profile?.phone),
      body: "Your name and phone number show up on everything you send a client — your intake links, your meeting invites, your Client Analyses. Add your NPN and a scheduling link too, if you use one outside Cal.com.",
      cta: { href: "/profile", label: "Go to My Profile" },
    },
    {
      id: "link" as const,
      icon: <IconLink />,
      title: "Set Your Custom Link",
      done: !!profile?.intake_slug,
      body: "By default your intake links use a long random ID. Set a short custom handle instead (like your name) so the link is easy to say out loud or text to someone — it updates both your links at once.",
      cta: { href: "/profile", label: "Go to My Profile" },
    },
    {
      id: "know_links" as const,
      icon: <IconSignpost />,
      title: "Know Your Two Links",
      done: isManualDone("know_links"),
      body: "You have two client-facing links, and sending the right one matters. Send the Pre-Intake link when someone hasn't been told yet that this is life insurance/annuities — it only asks what they're thinking about and roughly how much. Send the full Intake link once they know, or after your first meeting — it asks the health and financial questions that actually drive recommendations.",
      cta: { href: "/profile", label: "See both links on My Profile" },
      manual: true,
    },
    {
      id: "calendar" as const,
      icon: <IconCalendar />,
      title: "Connect Your Calendar",
      done: !!profile?.cal_api_key,
      body: "Connect Cal.com Auto-Sync on My Profile so a booking made through your Cal.com link automatically becomes a meeting on the right client's profile — no manual entry. For that meeting to also land on your personal Google/Outlook/Apple calendar, connect that calendar inside Cal.com's own account settings, separately — that part isn't something the portal does for you.",
      cta: { href: "/profile", label: "Go to My Profile" },
    },
    {
      id: "review_notifications" as const,
      icon: <IconBell />,
      title: "Review Your Notification Settings",
      done: isManualDone("review_notifications"),
      body: "Under Email Notifications on My Profile, you can choose whether you're emailed when a client submits an intake form, and whether you're emailed for time-sensitive reminders (an 18th birthday, a 59½ annuity milestone, a conversion deadline). Both are on by default — turn either off if you'd rather just check the portal.",
      cta: { href: "/profile", label: "Go to My Profile" },
      manual: true,
    },
    {
      id: "first_client" as const,
      icon: <IconPersonPlus />,
      title: "Try It With a Client",
      done: isManualDone("first_client"),
      body: "Add a real client by hand, or just send yourself your own Pre-Intake or Intake link and fill it out like a prospect would — either way, you'll see exactly what a client sees, and the client record it creates on your side.",
      cta: { href: "/clients/new", label: "Add a Client" },
      manual: true,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-[#1C1C1C]">Getting Started</h1>
          <p className="mt-1 text-sm text-[#555]">
            Six things worth doing once. Come back to this page any time — from your account menu, top right — for a
            refresher.
          </p>
        </div>
        <RestartButton />
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-[#D9CFBA] bg-white px-5 py-4">
        <div className="flex-1">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-[#EDE8DF]">
            <div
              className="h-full bg-[#1E6B3C] transition-all"
              style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="whitespace-nowrap text-xs font-semibold text-[#555]">
          {doneCount} of {steps.length} complete
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex gap-4 rounded-lg border border-[#D9CFBA] bg-white p-5">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  step.done ? "border-[#1E6B3C] bg-[#E9F3EC]" : "border-[#D9CFBA] bg-[#FAF8F4]"
                }`}
              >
                {step.icon}
              </div>
              <span className="text-[11px] font-semibold text-[#B3AB9B]">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#1C1C1C]">{step.title}</h2>
                {step.done && !step.manual && (
                  <span className="rounded-full bg-[#E9F3EC] px-2 py-0.5 text-[11px] font-semibold text-[#1E6B3C]">
                    ✓ Done
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-[#555]">{step.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href={step.cta.href}
                  className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-semibold text-[#FAF8F4] hover:bg-[#2E2E2E]"
                >
                  {step.cta.label}
                </Link>
                {step.manual && <StepToggle stepId={step.id as ManualStepId} initialDone={step.done} />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Small line icons, same stroke style as the Home dashboard's cards (24x24, 2px stroke, #555).
function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15l6-6" />
      <path d="M10 6l1-1a4 4 0 0 1 5.7 5.7l-1 1" />
      <path d="M14 18l-1 1a4 4 0 0 1-5.7-5.7l1-1" />
    </svg>
  );
}
function IconSignpost() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="21" x2="12" y2="4" />
      <path d="M12 6h7l-2 2.5L19 11h-7z" />
      <path d="M12 11H5l2-2.5L5 6h7z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 12 6 8z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconPersonPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      <line x1="18" y1="8" x2="18" y2="14" />
      <line x1="15" y1="11" x2="21" y2="11" />
    </svg>
  );
}
