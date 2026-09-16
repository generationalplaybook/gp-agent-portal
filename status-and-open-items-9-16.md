# GP Advisor Portal — Where Things Stand (Sept 16)

## Short answer

Yes — as it stands today, this portal has enough to actually run an advisor's book of business day to day. You can capture a lead (Intake/Pre-Intake links), run it through a recommendation engine, track it through a real pipeline (Lead → Quoted → Applied → Pending → Approved → Issued/Declined), build illustrations and client-facing PDFs, log meetings (with Cal.com sync), get automatic escalating follow-up reminders instead of relying on memory, track products/policies per client (with riders, conversion deadlines, ownership for minors), run a financial needs analysis, reference a real carrier knowledge base, manage a recruiting pipeline for new agents, and store your own carrier logins/state licenses in one place. That's the core of what a solo or small-team advisory practice needs to operate.

What's genuinely left is refinement and a handful of features you haven't greenlit yet — not gaps that block you from using this for real business today.

## What's actually still open

Pulled from BACKLOG.md, which has grown to about 4,300 lines — but the overwhelming majority of that is a dated log of things already **built and resolved**, kept so nothing gets lost or re-litigated. Here's everything that's genuinely *not* done, organized by why it's not done:

### Not built yet (waiting on you to say "go")

- **Client-specific product comparison PDF** — pick 2-3 of a client's saved illustrations and get one side-by-side PDF to send them. Intentionally held until the Illustrations rework (done) was live and in use first.
- **Design the outbound auth emails** (invite, password reset, one-time code) with real branding — right now they're plain default styling, no logo/colors.
- **Guardian-specific contact fields for minor clients** — a guardian is currently just a linked family member, not its own distinct role. Still missing: dedicated guardian contact fields, and routing a minor's day-to-day reminders to the guardian specifically instead of just showing them nearby.
- **Policy anniversary check-in reminder** — flagged, needs more thought on exactly how it should trigger.
- **Reminder delivery preference (email/text/both)** — just an idea so far; today reminders are in-app only, nothing texts or emails you or a client when one comes due.
- **"Quick links" shortcuts** — logged as low priority; still needs you to say what you actually picture (a shortcuts panel? quick-jump from a client page?) before it's worth building.
- **6 missing carrier PDF files** for the Downloads page (Ameritas Life & Annuities, Nationwide Life & Annuities, MOO Life & Annuities) — blocked on you sending the actual files.

### Discussed, paused mid-decision

- **Email alert to you when a new Intake form comes in** — I think it's worth building, but it requires adding real email-sending infrastructure to the portal (there's currently none beyond Supabase's own account emails). Also floated: SMS instead of/alongside email. Waiting on your call.
- **Default pipeline stage for a newly-added family member** (e.g. a guardian added via "Add New Person") — currently defaults to Lead, which doesn't really fit a guardian. You wanted to think it over.
- **Riders section on IUL/Whole Life illustrations** (free/included vs. at-cost, with an approval-pending caveat) — you were still working through your notes on this one.
- **Whether Ethos's included Will & Trust benefit should surface somewhere client-facing** (the PDF, or a form reminder) — it's already fully documented internally in the Knowledge Base; just unclear if you want it surfaced anywhere else.
- **A couple of Cal.com/meeting edge cases** — a synced meeting's "Via Cal.com" badge not showing on one flagged row, and whether a minor's Client Profile PDF should show a parent/guardian contact when the child has none on file. Both logged, neither touched, waiting on your read.

### Explicitly deferred by you

- **A full mobile layout pass** — you said hold off until the feature set felt more settled (a broad mobile responsiveness pass did already ship 9/7, but a full polish pass is still open whenever you're ready).
- **Presentation/training content embed** — waiting on you finishing those materials.

### Built, but not yet verified against your live data

- The new **Approved stage + escalating reminders** feature from this week — verified fixed after the live bug, but worth one more confirmation pass now that it's settled.
- **"Resend Invite"** for pending advisors — built, never tested against a real pending invite yet.
- **"Restore access" un-ban** for a removed advisor — you've said you know this is untested and aren't testing it right away on purpose.

### One technical note, not user-facing

Some server actions (notes, tasks, reminders, analyses) still throw raw errors instead of returning a clean `{ ok, error }` result — Next.js hides thrown errors behind a generic message in production. Not something you'd notice unless one actually fails; worth a cleanup pass if a mystery error ever shows up.

## Does it ever feel "done"?

Realistically — no, and that's normal for software behind a real, active business rather than a shelf product you buy once. The initial build (getting a working pipeline, illustrations, reminders, intake links, recommendation engine) is genuinely behind you now. What you're in now is the maintenance-and-refinement phase every tool like this settles into: new edge cases show up because you're actually using it with real clients, small papercuts get noticed because you're in it every day, and priorities shift as your business does. That phase never fully ends, but it does slow down a lot — the pace of "brand new feature" requests should keep dropping the longer the core stays stable, and most of what's left above is refinement, not foundation-laying.
