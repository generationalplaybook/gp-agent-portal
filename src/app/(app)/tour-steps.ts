// The in-context "click here" walkthrough — Karina, 9/9, after seeing the first Getting Started
// draft: "I want it so that it highlights where the person is supposed to click and where they're
// supposed to input the info... you know when you get a new platform and it says, oh, click this,
// it highlights, okay, click here, this is your profile... and then you go next, and then it goes
// to the next step."
//
// Deliberately stores NO per-step "done" flag anywhere — that was the first draft's actual
// problem (Karina: "I don't think that getting started or restarting should delete what was
// already inputted"). A tour has nothing to reset: relaunching it just replays the same stops
// against whatever's actually true on the page right now. See TourEngine.tsx for how a step's
// target is found and highlighted, and getting-started/page.tsx for where "Start the Tour" lives.
//
// Scope, narrowed 9/9 after Karina tried the first cut of this tour: it originally left /profile
// on its last step to have her add a client, and that broke two ways — the overlay stayed up
// blocking the real "+ New Client" button until she clicked Finish first ("it literally just
// freezes, and then I have to click finish"), and there isn't one "try it with a client" move to
// show anyway — a client gets created via Pre-Intake, via full Intake, or added by hand, and
// meetings/reminders/illustrations are a whole separate layer on top of that. Her call: "I'm
// leaning towards that getting started thing just being the profile setup because that's
// important. That profile needs to be set correctly for everything else to flow." So this tour
// is scoped to My Profile only, now ending at Carrier & Licensing — the rest of the platform
// (client creation paths, meetings, reminders, illustrations) belongs in live team training or a
// short video instead, not folded into this walkthrough.
export interface TourStep {
  id: string;
  page: string; // pathname the step's target lives on — TourEngine navigates here first if needed
  selector: string; // matches a data-tour="..." attribute on the real element
  title: string;
  body: string;
  placement: "top" | "bottom";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "profile",
    page: "/profile",
    selector: '[data-tour="profile-fields"]',
    title: "Complete Your Profile",
    body: "Your name and phone number show up on everything you send a client. Fill these in and click Save before moving on.",
    placement: "bottom",
  },
  {
    id: "link",
    page: "/profile",
    selector: '[data-tour="full-link"]',
    title: "Set Your Custom Link",
    body: "By default your link uses a long random ID. Type a short handle here instead — like your name — so it's easy to say out loud or text to someone.",
    placement: "top",
  },
  {
    id: "two-links",
    page: "/profile",
    selector: '[data-tour="pre-link"]',
    title: "Know Your Two Links",
    body: "You have two client-facing links. Send Pre-Intake when someone doesn't know yet this is life insurance/annuities. Send the Full Intake link (just below) once they know, or after your first meeting.",
    placement: "bottom",
  },
  {
    id: "calendar",
    page: "/profile",
    selector: '[data-tour="cal-sync"]',
    title: "Connect Your Calendar",
    body: "Paste your Cal.com API key here so a booking made through your Cal.com link automatically becomes a meeting on the right client's profile.",
    placement: "top",
  },
  {
    id: "notifications",
    page: "/profile",
    selector: '[data-tour="notifications"]',
    title: "Review Your Notifications",
    body: "Choose whether you're emailed when a client submits an intake form, and whether you're emailed for time-sensitive reminders. Both are on by default.",
    placement: "top",
  },
  {
    id: "carrier-licensing",
    page: "/profile",
    selector: '[data-tour="carrier-licensing"]',
    title: "Track Your Carriers & Licensing",
    body: "Keep every carrier portal username, password, agent code, and login link here — and your state licenses — so you're never digging through email or a spreadsheet to find one.",
    placement: "top",
  },
];
