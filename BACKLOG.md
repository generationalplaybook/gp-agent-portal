# Backlog

Things Karina has asked to defer to a future build, so they don't get lost.

## Requested, not yet built

- **Client detail page layout — spaced out, Pipeline Stage moved to top — built 8/31, sticky
  bug fixed 8/31.** Karina flagged the page as too cramped and not using the width of the
  screen. Widened the page's max width (1152px → 1440px) and opened up the gaps between cards
  and between the two columns, plus a bit more padding inside every card. Separately, "Pipeline
  Stage" is now the first card in the right-hand sidebar (was buried a few cards down). It was
  first built as a "pinned"/sticky card that stayed glued to the screen while scrolling, but
  Karina caught it visually overlapping and covering up the In-Person Meetings card's fields as
  the page scrolled — that's inherent to how a sticky element behaves stacked in a column with
  other cards below it, it paints on top of whatever scrolls past underneath. Fixed by making it
  a normal (non-sticky) card again: it's still the first thing you see at the top of the
  sidebar, it just won't stay glued to the screen if you scroll far down the page anymore. No
  overlap, no schema change.

- **Quote tracking on Products, resolved when a client is Issued — built 8/31.** Karina pointed
  out that while a deal's in the Quoted stage, she's often comparing 2-3 carriers, and there was
  nowhere to hold "these are candidates" without them looking like real, confirmed policies.
  Now: any product added while a client's Pipeline Stage is "Quoted" is automatically flagged as
  a quote (shows a small amber "Quote — not yet issued" badge) — no extra step, nothing to
  remember to check. When the advisor picks "Issued" on the Pipeline Stage dropdown and there
  are tracked quotes, a small inline panel pops up right there asking which one won; confirming
  keeps that one as a real product and **deletes the rest outright** (Karina's call — once a
  client's issued, the quotes that lost don't need to stick around). New column:
  `client_products.is_quote` (SQL below).

- **Client Analyses — Delete and "Re-run with these answers" — built 8/31.** Karina asked
  whether Client Analyses (saved on a client's profile) should be editable or deletable. Since
  each saved analysis is a snapshot of the questionnaire answers and result at the time it was
  run, true in-place editing would silently rewrite that history — so instead: **Delete** (with
  an inline "are you sure?" confirm, matching the pattern used elsewhere in the app) removes an
  analysis outright, and a new **Re-run** link opens the Client Analyzer pre-filled with that
  old analysis's full set of answers so the advisor can tweak anything and save it as a brand
  new analysis — the original stays untouched unless separately deleted. No schema change
  (reuses the existing `client_analyses.inputs` snapshot column).

- **Final Expense gets its own, simpler Illustration Summary — built 8/31.** Karina flagged that
  a Final Expense Whole Life policy was showing the same Guaranteed/Non-Guaranteed milestone
  table as an IUL, which doesn't make sense — final expense is guaranteed- or simplified-issue,
  so the death benefit and premium are both locked for life with no "non-guaranteed" side to
  compare against. "Final Expense" is now its own selectable Product Type (separate from plain
  "Whole Life"), and its Illustration Summary is a simple card — Guaranteed Death Benefit,
  Guaranteed Level Premium, riders, notes — no milestones, no chart, matching how the product
  actually gets sold. **Note:** this only applies going forward, or once a product's own Type
  dropdown is changed to "Final Expense" — any existing product typed as plain "Whole Life"
  (like Robin Roberson's Banner Life policy from the screenshot) keeps the old milestone view
  until its Type is updated on the product itself. No schema change (product_type was already a
  free-text field).

- **Client detail page — layout is too cramped (flagged 8/30, not built).** Karina's take
  looking at a real client page: it doesn't use the width of the screen, everything feels
  packed together, and needs real spacing to breathe. Two specific asks:
  - Loosen up the spacing/width generally — more breathing room between cards, make better use
    of wide screens instead of the current fairly narrow max-width layout.
  - "Pipeline Stage" should always be visible at the top of the right-hand sidebar — right now
    it's buried a few cards down (after Schedule a Call / In-Person Meetings), so it scrolls out
    of view. Either move it to the top of the sidebar column, or make it sticky so it stays
    visible near the top-right as the page scrolls.
  Needs an actual design pass through the whole page, not just a quick tweak — hold for a
  dedicated session on it rather than a quick patch.

- **Advisor email alert on new Intake submission — discussing, not decided.** Karina asked
  whether the advisor should get an email when a client completes the Intake Link form.
  Discussed and paused mid-conversation (picking back up later): my read is yes, it's worth
  building — otherwise the only way to know a new intake came in is checking the "Needs Review"
  tab manually, and the whole point of this feature is a fast first-meeting turnaround. Catch:
  the portal has zero email-sending infrastructure today (the only email that goes out is
  Supabase's own account stuff — invites, signup confirmation), so this means adding a real
  piece of new infrastructure, not just a notification toggle. Suggested Resend (cheap/free at
  this volume, simple API key setup) — starting on their shared sending domain works
  immediately, with a quick DNS step later to send from Karina's own domain for better
  deliverability. Also floated: an SMS alert in addition to/instead of email, given she's often
  out at meetings. Not decided yet — waiting on Karina.

- **Intake Link — required ages + spouse age, simpler wording (built 8/30, same day as first
  ship).** The Family checkboxes on the Intake Link previously let someone check "Children" or
  "Aging parent(s)" without saying how old anyone actually is — not useful, since a 2-year-old
  and a 16-year-old need completely different conversations, and what's even available for an
  aging parent depends a lot on their actual age. Ages are now required the moment the box is
  checked: exact ages, typed in (not an under/18-over/18 split — too coarse to be useful for
  product planning), same for a new "Spouse's Age" field that shows up when Spouse is checked.
  Also simplified a couple of option labels on the intake form itself (not the internal Client
  Analyzer, which still says these differently) — "Other Retirement Accounts?" now just says
  Yes / No / Unsure instead of "Yes — has other retirement accounts," and "Needs Access Before
  59½?" got the same treatment. No schema change — household_summary is still one text field,
  just built from richer inputs now.

- **Bug fix — Client Intake Link was requiring a login (found 8/30, right after first ship).**
  The portal gates every page through `src/proxy.ts` (Next.js 16 renamed "middleware" to
  "proxy" — same idea, a check that runs before every request), which redirects anyone
  without a session to `/login` unless the path is explicitly marked public. `/intake` wasn't
  on that list, so the brand-new public form was getting bounced to the sign-in page for
  anyone without an advisor account — exactly what Karina hit testing her own link. Added
  `/intake` to the proxy's public-paths list (and to the "don't bounce a logged-in advisor
  away either" list, so an advisor can still preview their own link while signed in). No
  schema change, no other visible change.

- **Client Intake Link — built 8/30.** Each advisor now has one reusable public link (shown in
  My Profile under "Your Intake Link," with a copy button) they can text/email to a client
  before the first meeting. No login required to fill it out. It's the same question set as the
  standalone Client Analyzer — proper First/Middle/Last name fields plus a short "Household"
  section (check-all-that-apply: Spouse / Children (with an ages field) / Aging parent(s) or
  other dependents — deliberately lightweight, not a full questionnaire per family member).
  **The client never sees any recommendation** — submitting just shows "Thank you, your advisor
  will be in touch." Behind the scenes, submitting creates a real lead owned by that advisor
  (source "Client Intake Form") and runs the same recommendation engine on it, saving the result
  as a normal analysis (tagged "From intake" on the client page) so the advisor walks into the
  first meeting with scenarios already worked out.
  New leads from intake land flagged for review — a red "Needs Review" chip with a count badge
  now shows on the Clients list (next to the normal stage filters, not mixed into them), and
  each matching row gets a "New from intake" badge. Opening the client shows a callout at the
  top with their household summary and a "Mark Reviewed" button, which just clears the flag —
  nothing else changes, and the household summary stays visible either way.
  Family members mentioned on the intake form are **not** auto-created as separate client
  records — the advisor still builds those manually in the existing Family section if/when they
  want to, same as today.
  New columns: `clients.intake_pending_review`, `clients.household_summary`,
  `client_analyses.from_intake` (SQL below).

- **"View PDF" on Client Analyses — built 8/30.** Every saved analysis on a client's page only
  offered "Download PDF," which forces a save-to-disk even for a quick glance. Added a "View
  PDF" button next to it that opens the same PDF in a new browser tab (no file saved unless the
  advisor chooses to from there) — good for a quick look mid-call that you then just close out
  of. No schema change.

- **Bug fix — "Save as New Client" from the Client Analyzer was saving blank names.** Found
  while tracing the code path the new Intake Link feature reuses. `full_name` is supposed to be
  computed automatically by a database trigger from `first_name`/`middle_name`/`last_name` —
  nothing should write `full_name` directly anymore (this was the rule set when the name-split
  feature was built). Two spots in the standalone Client Analyzer's "save" actions had reverted
  to writing `full_name` directly, and for new clients created that way, the database trigger
  was silently wiping it back out to blank immediately after the save — meaning any client
  created via "Save as New Client" showed up with no name in production. Fixed by splitting the
  analyzer's single freeform name field into first/last name (same "first word is the first
  name, the rest is the last name" rule used in the original backfill) before saving, for both
  the "save to existing client" and "save as new client" actions. No schema change, no visible
  UI change — just a correctness fix.

- **Policy Illustration Summary — built 8/30.** Advisors can now enter the key numbers from a
  carrier's own illustration and get back a short, visual, client-facing PDF instead of handing
  someone the full dense illustration packet. New "Illustration Summary" link on every product
  in a client's Products list (`/clients/[id]/illustrations/[productId]`). The fields shown are
  entirely different depending on the product's type, matching what's actually relevant:
  - **IUL / Whole Life / Other:** advisor adds as many milestones as the case needs (e.g. Age
    18, 25, 65 for a juvenile IUL), each with Cash Value and Death Benefit, both Guaranteed and
    Non-Guaranteed. PDF renders these as a table plus two line charts (cash value over time,
    death benefit over time), each chart showing the guaranteed line (dashed) against the
    non-guaranteed/current-assumption line (solid) so neither number gets overstated.
  - **Term Life:** no milestones (term has no cash value to chart) — instead a summary card
    with the flat death benefit, term length, level premium, conversion deadline, and which
    living-benefit riders are attached (reuses the same rider picker as Products).
  - **Annuity:** Initial Premium plus milestones of Accumulation Value, Income Value (if there's
    an income rider), and Death Benefit — table plus a chart of accumulation vs. income value
    growth.
  One illustration is saved per product (saving again overwrites the previous version — no
  history/versioning yet). "Download PDF Summary" works whether or not it's been saved, so an
  advisor can iterate before committing. New table: `product_illustrations` (SQL below).
  Charts are hand-drawn with jsPDF's own drawing primitives (lines, dashes, gridlines) — no
  charting library dependency.
  - **Not built yet / open for later:** illustration versioning (show old vs. new over time),
    a premium-paid-to-date or surrender-value column if she wants those too, and whether a
    minor's guardian should get their own copy of the wording (currently the PDF just says the
    client's name, same as the Client Analyzer PDF).

- **"Final expense / burial costs only" goal — built 8/30.** Karina pointed out that some
  clients just want a small policy so their family isn't stuck with funeral/burial costs — not
  income replacement, not savings, not a legacy plan. Added it as a 7th Primary Goal option on
  the Client Analyzer. It's handled differently from every other goal: because guaranteed- and
  simplified-issue final expense whole life exists, this goal is reachable even for a client who
  answered "Declined" on insurability (who'd otherwise get routed to annuity-only
  recommendations) — so it's checked before the usual insurability logic, not after. Declined
  clients get Ethos Final Expense Whole Life (TruStage), Guaranteed Issue — no health questions,
  no exam, no declines, with Banner Life's Social Security Billing version as the runner-up.
  Everyone else gets the Simplified Issue version of the same TruStage product, with Mutual of
  Omaha Living Promise (no exam, purchasable online) as the runner-up. Both are real products
  already documented in the Knowledge Base. No SQL migration needed.

- **In-Person Meetings — built 8/30.** Karina wanted to log an in-person meeting directly on a
  client's profile and have it land on calendars, without going through a Cal.com booking page
  (she already knows the time — she just needs it recorded and on calendars). New "In-Person
  Meetings" card in the client sidebar (right under Schedule a Call): enter a date/time,
  location, and notes, and it's saved to the client's record immediately — shows up in an
  upcoming list right there on the page, with past meetings tucked into a collapsed section.
  Each meeting has an "Add to Calendar" button that generates a standard .ics invite file
  (works with Google/Outlook/Apple) right in the browser — no external calendar account or API
  key involved. The advisor downloads it to add to their own calendar, and can forward the same
  file to the client so it lands on theirs too. Reschedules/cancellations aren't synced
  automatically (that's the Cal.com-integration tradeoff we talked through) — updating the time
  means deleting and re-adding, which sends a fresh invite.
  New table: `client_meetings` (SQL below).

- **My Profile "Saved" confirmation — built 8/30.** Karina noticed clicking Save on My Profile
  gave no feedback that anything happened. The "Your Info" form (name, phone, Cal.com link) was
  a plain server-action form with a full page round-trip and no visible change when values
  stayed the same. Rebuilt as `ProfileInfoForm.tsx` (client-side, same pattern already used on
  the client contact-info form) so clicking Save now shows "Saving..." then "Saved ✓" next to
  the button. No SQL migration needed.

- **Cal.com scheduling — simple version built 8/30.** Karina uses Cal.com and wanted a way to
  put a calendar in the portal and send clients video-call links. We scoped two versions and
  went with the simple one first (full API sync into client profiles is logged below as a
  possible upgrade). Each advisor pastes their Cal.com booking link for their consultation
  event type into My Profile (new "Cal.com Scheduling Link" field) — video itself (Cal Video,
  Zoom, or Google Meet) is configured on that event type inside Cal.com, not in the portal.
  Every client profile now has a "Schedule a Call" card in the sidebar with: Open Scheduling
  Page (new tab, pre-filled with the client's name/email via URL params), Copy Link to Send
  (for texting/emailing the client directly), and Book Here (expands the same page inline via
  iframe so the advisor can book it live with the client). Cal.com handles sending the video
  join link to both sides once it's booked — the portal doesn't touch that part.
  New column: `profiles.scheduling_link` (SQL below).
  - **Possible upgrade, not built:** a fuller version where a booked call's time + video link
    get pulled back into the client's profile automatically via Cal.com's API + a webhook (so
    the profile shows "Next Call: Thu 2pm — Join" without anyone copying anything). Needs a
    Cal.com API key and a new `bookings` table. Revisit if the simple version feels like it's
    missing something once she's used it a while.

- **Periodic funding frequency — built 8/30.** Follow-up to the Periodic funding option above:
  added a "How Often" picker (Once a year / Twice a year / Quarterly / Other / Unsure) next to
  the Periodic Contribution Amount field, so "$20,000 twice a year" is captured as structured
  data rather than jammed into one freeform box. Shows up the same way in results and the PDF
  summary. No SQL migration needed.

- **"Periodic" funding option — built 8/30.** Karina pointed out that plenty of clients (esp.
  higher earners) don't fund monthly or in one lump sum — they dump extra money in a couple
  times a year, often for tax reasons (bonus season, year-end planning). Added "Periodic (a few
  times a year, e.g. tax-driven)" as a 4th Funding Method choice, with its own approx-amount
  field, alongside Monthly / Lump Sum / Both. It's treated like a lump sum for IUL purposes
  (flexible-premium IULs take deposits on any schedule), but the tool now also adds a reminder
  bullet on annuity recommendations to confirm that specific product's purchase-payment window,
  since most annuities only accept additional deposits during an initial period after issue —
  not indefinitely, unlike IULs. Shows up in results and the PDF summary same as the other
  funding fields. No SQL migration needed.

- **Monthly budget field on the intake — built 8/30.** The "Approximate Amount" field under
  Funding Method used to be a single freeform box covering both a monthly premium budget and a
  lump sum, which made it easy to lose track of which one the client meant. It's now two
  separate fields — "Monthly Budget" and "Lump Sum Amount" — each only shown when the selected
  Funding Method actually calls for it (Monthly shows the budget field, Lump Sum shows the
  amount field, Both shows both). Also fixed a gap where this funding info was captured on the
  form but never actually showed up anywhere after that — it's now visible in the on-screen
  results and printed correctly in the PDF's Client Profile Summary under "Funding Method"
  (previously that line just said "See amounts above" and didn't reference funding at all). No
  SQL migration needed.

- **"Mixture of Both" money type — needs streamlining, paused for now (8/30).** Karina noticed
  that picking "Mixture of Both" for money type still suggests an IUL, and flagged it could be
  "streamlined" but wants to think on it before deciding what that means. For context when this
  comes back up: today, `computeRecommendation()` in `src/lib/analyzer.ts` treats `money ===
  "both"` exactly like fully non-qualified — it falls straight into the goal-based IUL/Term
  logic with no mention that part of the money is qualified (and that portion can't fund an IUL
  directly, same tax mechanic as the qualified-only case that now gets the blue Combo Option
  box). Options raised but not decided: (a) auto-add the same Combo Option box to the mixed-funds
  case too, so the qualified portion's rollover-into-annuity gets flagged automatically; (b) just
  a one-line caveat under the primary recommendation instead of a full box; (c) something else —
  she said the "streamline" comment might not even be about this logic at all. Don't build
  anything here until she circles back with what she actually wants.

- **IUL + annuity combo option (qualified money) — built 8/30.** The Client Analyzer used to
  tell advisors to flat-out avoid an IUL any time the client's money was qualified. That's
  still true for *directly* funding the IUL with that qualified money (can't be done without
  triggering taxes), but it doesn't mean the client is a bad fit for an IUL at all. Now, for
  the goals where this used to show a red "Avoid" box, it instead shows a blue "Combo Option"
  box suggesting the qualified-money annuity rollover be paired with a separately-funded IUL
  (funded by other income/savings) — same on-screen and in the PDF export. The red "Avoid"
  box itself wasn't touched — it's still used for the other, unrelated hard tradeoffs
  (uninsurable client, protection goal, juvenile 529-vs-IUL, immediate income need).
  Also added: an "Existing Coverage / Products" question on the intake, so advisors can note
  what a client already has. When the analysis is started from a client's profile page, this
  auto-fills from their actual Products records; it's shown in the results and printed in the
  PDF's Client Profile Summary when present. No SQL migration needed — both new fields ride
  along in the existing `jsonb` result column, and the existing-coverage prefill just reads the
  Products table that's already there.

- **Death Benefit Option explainer for advisors — built 8/31.** Karina wanted a clear way to
  teach her advisors the three death benefit structures — Level, Increasing, and Increasing
  switched to Level — what each does and when to use which. The existing Knowledge Base concept
  entry ("Death Benefit Option 1 vs Option 2") already covered Level vs. Increasing, but only
  mentioned the switch strategy as a footnote — expanded it into one entry covering all three as
  parallel options: Level (flat death benefit, falling cost of insurance over time — best for
  accumulation/cost efficiency), Increasing (death benefit = face + cash value, cost of
  insurance stays higher — best when maximizing the legacy/death benefit is the goal), and
  Increasing-to-Level (a strategy, not a static option — grow on Increasing during accumulation,
  switch to Level before the loan/income phase so cost of insurance starts dropping right when
  cash value is being drawn down; common on retirement-income IULs). Includes an advisor-facing
  technical explanation plus a short client-facing version advisors can use directly in
  conversation. Lives in the Knowledge Base under Concepts, same place as before — no new page,
  no schema change. Still open, not built: surfacing this directly inside the Client Analyzer
  flow when a death benefit option is actually being chosen for a client, or a training/quiz
  mode — only mentioned once by Karina, worth asking if she still wants either.

- **Death Benefit Corridor (IRC §7702) — new Knowledge Base entry, built 8/31.** Came up when
  Karina noticed a 5-year-old's IUL, set to Level, showing the death benefit start climbing
  around age 35 on the illustration and asked whether that's a real thing and whether it's to
  avoid MEC. It's real, but it's not MEC — it's a separate IRS rule (the §7702 "corridor")
  requiring the death benefit to stay a set percentage above cash value at all times for the
  policy to keep qualifying as life insurance for tax purposes; that required percentage is
  highest for young insureds and tapers down with age. So even on Level, if cash value grows
  close enough to the flat face amount, the carrier automatically raises the death benefit to
  stay compliant — nobody elected a change, and it's a compliance floor, not something you can
  aim at a target number. New standalone Concept entry explains this and explicitly
  distinguishes it from MEC/the 7-pay test. Also folded into the Death Benefit Options entry:
  for juvenile/kids' policies specifically, cash value and locked-in insurability while young
  and healthy is almost always the real goal (not a death benefit need), so Level is the
  standard recommendation — and if the family also wants a guaranteed target death benefit
  number down the road, that has to be set as the face amount at issue, not left to organic
  cash value growth or the corridor to reach on their own. No schema change.

- **First / Last / Middle name split — built 8/29.** First Name / Last Name (required) and
  Middle Name (optional) are now separate fields everywhere someone's name gets entered or
  edited: the invite form, My Profile, the new client form, the client profile's contact info,
  and the "Add New Person" flow inside Family. `full_name` still exists on both `clients` and
  `profiles` and everything that displays a name keeps reading it unchanged — it's now
  auto-computed by a database trigger from first/middle/last, so nothing should write to it
  directly anymore. Existing rows were backfilled by splitting the old full_name on the first
  space; anyone whose name didn't split cleanly (a single-word name, or one that already had a
  middle name jammed into one field) can just re-enter it correctly once in the UI.
  - **Left as one field on purpose:** the Client Analyzer's "Client Name" box. That tool is a
    scratch illustration calculator (not a saved record), so it just needs a name to print on
    the output — splitting it wouldn't connect to anything. Flag if you want it split too.

- **"Pending" pipeline stage — built 8/29.** For a client who already has a policy in force
  (Issued) but is actively being worked on a new one — Stage can now be set to Pending so they
  don't just sit in "Issued" (which otherwise reads as "nothing to do here"). Their existing
  coverage stays visible in Products no matter what Stage they're on; Pending only changes the
  pipeline label/filter tab, nothing else. Move them back to Issued once the new policy is
  settled.

- **Default stage for a newly-added family member — open question (8/29).** When you use "Add
  New Person" in Family (e.g. adding a juvenile's parent/guardian), they're created as a new
  client on Lead, same as the regular New Client form. Karina flagged that a guardian usually
  isn't actually a Lead. Raised but not decided yet — she wants to think it over. One option
  already scoped: add a Stage picker to that form (defaulting to Lead, but changeable), same as
  the main New Client form has.

- **Mobile layout cleanup — explicitly deferred (8/29).** Karina's said the mobile view is
  "still very jumbled" across several pages, but wants to hold off on aesthetic/layout cleanup
  until the feature set is more settled. Revisit once she says features are done for now.

- **Reminders vs. Tasks, and no actual notifications — clarified 8/29, no change needed.**
  Karina asked whether Tasks and Reminders on a client profile do the same thing. They don't:
  Tasks are a plain checklist (title, optional due date, done/not done, nothing flags it as
  overdue elsewhere). Reminders are time-specific and drive the "Follow-up overdue" badge on
  the Clients list and the "Next reminder" line on Family cards — but today they're purely
  in-app: nothing actually emails or texts anyone when one comes due, even though a
  `channel: email/sms` field already sits unused in the `reminders` table. Karina confirmed
  this is fine to leave as-is for now — revisit only if she asks for real outbound
  notifications later.

- **Better home page.** The landing page after login is minimal right now. Karina wants
  something more useful here, but said not to worry about it yet.

- **Downloads section.** Left alone for now — no changes requested yet.

- **Presentation embed / training & licensing content.** Karina is still building the
  presentation materials; she said we can add this once that's ready.

- **Brand the invite/auth emails.** Right now invite emails come from Supabase's default
  "Supabase Auth" sender with generic wording/styling ("You've been invited... powered by
  Supabase"). Needs custom branding (sender name, wording, maybe logo/colors) to match GP
  Advisor Portal. Likely involves customizing the email templates in Supabase's dashboard
  (Authentication → Email Templates) and possibly a custom SMTP sender down the line.

- **Manage / remove advisors.** The "Your Team" list on the Invite Agents page currently only
  lets an admin change someone's role (Advisor/Admin) via a dropdown. There's no way to remove
  an advisor's access entirely (e.g. someone leaves the team). Needs a "Remove" action —
  likely disabling/deleting their profile access rather than deleting their Supabase auth user
  outright, so their historical client data/notes aren't orphaned. Worth deciding: should a
  removed advisor's clients get reassigned to someone, or just become admin-only visible?

- **Minor clients / guardian tracking.** When the main person on a policy is under 18 at the
  time they're added, need a pop-up (on the new client form, and probably editable later) to
  capture a parent/legal guardian's info — they're effectively the policy owner while the
  client is a minor. Specifics from Karina:
  - Guardian needs their own contact fields (name, phone, email at minimum — same shape as a
    client's contact info).
  - Reminders for a minor client should go to/surface the guardian's contact info, not the
    minor's, since the guardian is who the advisor is actually dealing with.
  - Need to track the minor's 18th birthday. On that date, ownership of the policy
    conceptually transfers from the guardian to the (now adult) client.
  - Explicitly NO automated email to the client on their 18th birthday — Karina confirmed
    this. Instead: auto-create a reminder for the advisor (reusing the existing reminders
    system) so the advisor knows to reach out and have that "you're 18, here's what changes"
    conversation themselves.
  - Needs: a `is_minor`/guardian fields added to the clients schema (another Supabase
    migration, same pattern as the birth_date fix), a guardian-capture UI on the new/edit
    client form gated on birth_date implying age < 18, and a daily scheduled check (Vercel
    Cron Job hitting a small API route — NOT anything in this chat tool's scheduling system)
    that finds clients turning 18 that day and creates the advisor reminder automatically.
  - Karina's call: build this AFTER the invite-link fix ships and her team starts testing —
    do not bundle into tonight's deploy.
  - **Partially covered as of 8/27** by the new family-linking feature (a guardian/parent can
    now be linked to a minor client as a "Parent"-relationship family member, and the family
    card on the client page already flags minors and highlights anyone turning 18 within 90
    days).
  - **Further covered as of 8/27 (later same day)** by the Products feature's
    `owner_client_id` field (a product can be owned by a different linked family member — e.g.
    a parent owns a child's juvenile policy) plus a daily Vercel Cron job
    (`src/app/api/cron/check-birthdays/route.ts`, `vercel.json`) that runs automatically: on a
    client's 18th birthday it transfers any product they're covered under but don't yet own to
    them, and creates the advisor a reminder to have the "you're 18 now" conversation. No
    automated email goes to the client, per Karina's earlier instruction.
  - What's still missing: dedicated guardian-only contact fields (right now a guardian is just
    another linked client record, not a distinct role), and routing a minor's day-to-day
    reminders to the guardian specifically rather than just showing the guardian nearby.

## Technical follow-up

- **Server action error handling.** Discovered while fixing the Invite Agents crash:
  Next.js hides any THROWN error from a server action behind a generic message in
  production ("Minified React error #441..."), even when the code does
  `throw new Error("some helpful message")`. The invite/role actions were rewritten to
  return `{ ok, error }` instead of throwing, which fixes it there. Other action files
  (client notes, tasks, reminders, analyses) still use the throw pattern — they haven't
  caused a reported issue yet, but the same silent-masking risk applies to all of them.
  Worth a pass to convert them the same way if more mystery "#441" errors show up.

## Blocked on Karina

- **Phase 6 — carrier PDFs.** Need 6 missing carrier PDF files (Ameritas Life,
  Ameritas Annuities, Nationwide Life, Nationwide Annuities, MOO Life, MOO Annuities)
  to wire into the Downloads page's `downloads-data.ts`.

- **Terms of Service text.** `src/lib/terms.ts` currently has clearly-labeled placeholder
  text for the "Proprietary Technology Notice" agents accept on first login. Needs
  Karina's real, verbatim legal text before this is production-ready.
