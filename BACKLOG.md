# Backlog

Things Karina has asked to defer to a future build, so they don't get lost.

## Low priority — someday, not urgent

- **Quick links — flagged 9/1, NOT important right now but needs to be addressed at some point.**
  Karina asked for this to be logged as a low-priority item, not built. Still need to clarify
  with her exactly what "quick links" should mean before building anything — options include: a
  small row/panel of shortcuts to frequently-used pages or actions (e.g. New Client, Client
  Analyzer, Knowledge Base) shown on a dashboard or nav bar, quick-jump links out from a client's
  page to their own sub-pages (Illustrations, Analyses, Meetings), or something else entirely.
  Ask Karina what she has in mind when this gets picked up.

## Requested, not yet built — Compare with client-specific PDF

- **Client-specific product comparison, downloadable as a PDF — discussed 9/1, NOT built yet.**
  Karina wants to pick 2-3 of a client's own saved Illustration Scenarios (see the Illustrations
  rework below, which this depends on) and get one side-by-side PDF built from their real
  numbers, ready to send when a client is torn between options. This is deliberately different
  from the existing `/compare` page, which stays as a generic, client-agnostic Knowledge-Base
  comparison (no PDF export) for "explain the difference between these two products in general."
  Sequencing: this was intentionally NOT started yet — it depends on the Illustrations rework
  (just built, see below) actually being live and used first. Build this next once Karina's
  ready.

## Bugs found during testing — not yet built (Karina said don't build, just log)

- **Meetings & Calls card — visual misalignment on a synced Cal.com meeting (flagged 9/1,
  screenshot on a client's page).** Karina uploaded the Cal.com Auto-Sync v2 fix and tested it
  live. Screenshot shows a client's Meetings & Calls card with a manual "Add Meeting" just used
  (confirmation banner showing, client name "Alex"), and below it an existing meeting row whose
  location is a raw `https://app.cal.com/video/...` link dated Sep 1, 2026, 11:00 AM — this is
  almost certainly a Cal.com-synced booking (that URL shape matches what the webhook receiver
  writes into `location`, not something anyone would type by hand). Karina called this row a
  "misalignment" without more detail yet. One concrete thing already visible in the screenshot:
  the blue "Via Cal.com" badge that `MeetingRow.tsx`/`meetings/MeetingRow.tsx` renders whenever
  `meeting.source === "cal.com"` is NOT showing next to that row, even though the URL strongly
  suggests this meeting did come from Cal.com — so either the badge isn't rendering when it
  should, or (less likely) this row is actually a manually-added meeting where someone pasted a
  Cal.com link into Location by hand, in which case there's no bug there at all. Still need to
  confirm with Karina exactly what "misalignment" means before touching anything — could be the
  missing badge, or something purely visual (e.g. how "Add to Calendar"/"Delete" line up against
  the two-line text block on the left). NOT fixed yet — Karina explicitly said not to build,
  just log this for now.

- **A call booked with Karina prior to Cal.com Auto-Sync being connected still doesn't show on
  that client's Meetings & Calls card (flagged 9/1, same test).** Karina confirmed this is a
  DIFFERENT, older booking than the Sep 1 one above — not a new test booking. This one is
  expected, not a bug: Cal.com's webhook only fires the moment a booking is created/rescheduled/
  cancelled, so connecting the integration later can never retroactively pull in something
  booked before the webhook existed (there is no "backfill" — see the original design note in
  the Cal.com Auto-Sync entry below). The Sep 1 entry in the note above (a real `app.cal.com`
  video link, dated the same day as this test) is good evidence the sync itself is working
  correctly for anything booked going forward. No fix needed for this specific missing meeting —
  if Karina wants that old call to show up in the CRM, the only option is to add it manually via
  "Add Meeting" on that client's page, same as any pre-existing meeting from before this feature
  existed.

- **Clickable meeting location links (flagged 9/1, same test session).** In Meetings & Calls
  (both the per-client card and the global Meetings tab), the Location field always renders as
  plain text — e.g. `https://app.cal.com/video/...` shows as text, not a link. Karina wants a
  pasted-in URL to be clickable. Small/low-risk change (`MeetingRow.tsx` in both
  `clients/[id]/` and `meetings/`). Not built yet — Karina is still testing, hasn't said go.

- **Should a minor's Client Profile PDF also show a Parent/Guardian contact? (raised 9/1,
  discussion only, NOT built — Karina said "dnt build yet, im still testing").** Karina uploaded
  the exported Client Profile PDF for August Sneed (age 6) and pointed out Phone/Email both show
  as blank "—" since the child has neither on file — a dead end for whoever's actually going to
  call, sign, or pay. Proposed approach, pending Karina's go-ahead: piggyback on the existing
  Family Linking feature (`FamilySection.tsx`, `family_id`/`family_relationship` on `clients`,
  `FAMILY_RELATIONSHIP_OPTIONS` already includes "Parent") — auto-prefill a Parent/Guardian
  name/phone/email from a linked family member with that relationship, same way Height/Weight
  already prefill from the client record, AND add explicit optional Parent/Guardian fields
  directly on the Analyzer (visible when `isMinor`) so it still works even if Family Linking
  hasn't been set up for that client yet. Would need: new fields on `AnalyzerInputs`, prefill
  logic in `AnalyzerClient.tsx`/`client-analyzer/page.tsx` (pull from a linked "Parent" family
  member when starting an analysis from a client's page), and a new line in
  `analyzer-pdf.ts`/the on-screen result. Sized as a real feature (form + prefill + PDF), not a
  one-liner — do NOT start this until Karina confirms she wants it built this way.

## Requested, not yet built

- **Illustration Scenario PDF — removed "(Guaranteed from Day One)" from the Death Benefit
  column header — built 9/1.** Karina reviewed a generated PDF (August Sneed's Accumulation IUL)
  and asked for that parenthetical removed from the milestones table. Column now just reads
  "Death Benefit" in `generateScenarioIllustrationPDF` (`illustration-pdf.ts`) — scoped to just
  the Scenario PDF, not the original per-product Illustration Summary PDF (separate function,
  untouched). Left the "DEATH BENEFIT OVER TIME (GUARANTEED)" chart title as-is since she didn't
  flag that one — say the word if that should go too. Purely a label change — the underlying
  data/field mapping (Death Benefit = guaranteed, Cash Value = non-guaranteed) is unchanged.

- **Gender added to every form that creates or edits a client — built 9/1.** Karina flagged this
  was missed on the original build. Added a `gender` text column to `clients` (new SQL — see
  delivery message), a `gender: string | null` field on the `Client` type in `types.ts`, and a
  shared `GENDER_OPTIONS = ["Male", "Female"]` constant. Added a Gender select to all six places
  that touch a client's info: New Client form, the Contact Info card on an existing client's
  profile (save-on-blur, same as every other field there), the "+ Add new person" quick-create
  on Family Linking, the public Client Intake Link form, and the Client Analyzer (both the
  standalone tool and prefilling from an existing client's profile when starting an analysis
  from their page). Everywhere it's optional — not a required field — same treatment as Phone/
  Email. Also added `gender?: string` to the shared `AnalyzerInputs` type (used by both the
  Intake form and the Analyzer) — it's captured and saved to the client record, but doesn't
  currently feed into any recommendation logic.

- **Illustration Scenario — Initial Death Benefit (Face Value) field added — built 9/1.** Karina
  pointed out the Milestones editor had nowhere to record the policy's starting face amount at
  issue — only the per-milestone Death Benefit numbers, which show what it grows or steps up to
  at each future age (and can differ a lot from the initial face amount, especially with a Death
  Benefit Increase age set). Added a new "Initial Death Benefit" section above Death Benefit
  Increase in `ScenarioForm.tsx`, a single Face Value dollar field. Same pattern as the earlier
  additions: stored as an optional `initialDeathBenefit` field on the shared `CashValueIllustration`
  type in `illustration.ts`, so the original per-product Illustration flow is unaffected. Shows
  on the PDF as a highlighted stat at the top of the summary (before the milestones table),
  same treatment as the Death Benefit Increase callout below it.

- **"+ Add Illustration" Carrier field now shows the real underwriting carrier for
  Ethos-brokered products, not "Ethos" — built 9/1.** Follow-up to the KB product picker above.
  Karina picked "Accumulation IUL (via Ethos)" and the Carrier field filled in "Ethos" — she
  pointed out it should say North American, since Ethos is just the distribution platform, not
  the insurer actually underwriting the policy. Checked the rest of the KB's "Ethos" entries and
  the same issue applied to five more: Ethos Protection IUL and Term With Living Benefits are
  really Ameritas, TruStage Term Life and Final Expense Whole Life (TruStage) are really
  TruStage, and Final Expense Whole Life — Banner Life is really Banner Life. Added a small
  lookup in `kb-data.ts` (`ETHOS_UNDERWRITER_BY_NAME`) mapping each of those to its real carrier
  — the picker still groups them under "Ethos" (matches how the Knowledge Base itself organizes
  them), but selecting one now fills the Carrier field with the actual underwriter. Left "Term
  Life Insurance" alone — the KB itself lists three possible underwriters for it (Banner Life /
  Protective / Ameritas) with no way to know which applies, so it still shows "Ethos" rather than
  guess wrong; flag it if you know which carrier applies to a specific client and I'll add it to
  the list.

- **"+ Add Illustration" now populates Product Name/Carrier/Type from the Knowledge Base — built
  9/1.** Follow-up to flagging this during testing. Added a derived `KB_PRODUCTS` list in
  `kb-data.ts` — every real carrier product (`group: "life"` or `"annuity"`), excluding concepts,
  tax/rollover entries, and the two Ethos Estate Planning entries (not insurance products, no
  illustration numbers to enter). 44 products across North American, Ethos, F&G, Athene,
  Ameritas, Nationwide, and Mutual of Omaha. `ScenariosSection.tsx`'s "+ Add Illustration" form
  now has a "Product" dropdown grouped by carrier at the top — picking one auto-fills Product
  Name, Carrier, and Product Type (inferred from each KB entry: annuities → Annuity, IUL
  subgroup → IUL, "Final Expense"/"Whole Life" in the type text → Final Expense/Whole Life,
  otherwise Term Life). A "Custom / not listed" option keeps the original free-typing behavior
  for anything not in the KB — nothing is locked, all three fields stay editable after picking.
  Did NOT touch the original "Add Product" flow on the client page — Karina's request was
  specifically about Illustrations; can extend it there too if she wants the same treatment.

- **Illustration Scenario Milestones reworked — Age / Cash Value / Death Benefit, one number
  each, plus a Death Benefit Increase Age field — built 9/1.** Karina tested the new
  Illustrations feature (see the decoupling entry below) and hit a wall: the Milestones editor
  asked for 4 numbers per milestone (Cash Value Guaranteed/Non-Guaranteed, Death Benefit
  Guaranteed/Non-Guaranteed), but she only works from one number per age — so she ended up typing
  all three of her milestones ("Age 18 $13,635, Age 35 $66,836, Age 65 $567,695") into a single
  label field with the actual dollar fields left blank. We talked through it before building.
  Her direction: each milestone is just Age, Cash Value (the non-guaranteed figure — dropped the
  guaranteed column entirely), and Death Benefit (guaranteed from day one — dropped the
  non-guaranteed column). Rebuilt `CashValueMilestonesEditor` in `ScenarioForm.tsx` as one row
  per milestone: Age / Cash Value / Death Benefit side by side. Capped "+ Add Milestone" at 5 —
  Karina said her real usage is usually 3-4 (typically ages 18, 35, 65). Also added a new "Death
  Benefit Increase" field above the milestones (age it steps up, optional) — some IUL designs,
  especially juvenile ones, start level and increase later, and she wants that called out on the
  summary regardless of whether the client is a child or an adult. Under the hood this reuses the
  existing `CashValueMilestone` fields (`cvNonGuaranteed` for Cash Value, `dbGuaranteed` for
  Death Benefit) rather than a new data shape, and the new `dbIncreaseAge` field was added as
  *optional* on the shared `CashValueIllustration` type in `illustration.ts` — so the original
  per-product Illustration flow (Products → Illustration Summary) is completely unaffected; it
  never sets or reads that field. The "Download PDF Summary" button on a scenario now calls a new
  `generateScenarioIllustrationPDF` (duplicated from the original `generateIllustrationPDF` in
  `illustration-pdf.ts`, same reasoning as the editor duplication) — same Age/Cash Value/Death
  Benefit table and single-line charts, plus a highlighted "Death benefit begins increasing at
  age X" callout when that field is set. Term/Final Expense/Annuity scenarios are unchanged. No
  SQL needed — `illustration_scenarios.data` is jsonb, no schema migration required.

- **Knowledge Base — living benefits caveat that acceleration % varies by carrier/product —
  built 9/1.** Karina flagged that some policies have different percentages of living benefits
  and asked for a note on that in the riders' Knowledge Base entry. Since I don't have real
  carrier-specific acceleration percentages or dollar caps to cite, I used AskUserQuestion rather
  than guess or invent numbers — Karina confirmed (1) a general caveat only, no fabricated
  specific percentages, and (2) just the existing "Living Benefits — How Claims Work" concept
  entry, not every individual product entry. Rewrote that one entry in `src/lib/kb-data.ts` to
  clearly separate two different questions that were being conflated: whether the rider costs
  anything extra (no, on most IUL/term products) versus what percentage of the death benefit it
  actually pays out (varies by carrier AND by specific product — Critical/Chronic are often
  capped lower than Terminal, or capped at a flat dollar amount instead of a percentage). Added
  an explicit agent-facing instruction to never quote a specific acceleration percentage from
  memory or from a different product's cheat sheet — always pull the real number from that exact
  policy's own illustration or contract before discussing it with a client — plus a client-facing
  line noting the exact percentage depends on their specific policy. No SQL needed — `kb-data.ts`
  is a static file, not database-driven.

- **Illustrations decoupled from Products — built 9/1.** Karina pointed out that running an
  illustration required first "Adding a Product" — but Products is meant to mean coverage the
  client already owns, and most illustrations run mid-call are for options they haven't decided
  on at all. Root cause confirmed in code: `product_illustrations` was a 1:1 child of
  `client_products` (`product_id` foreign key), and the illustration logic itself never actually
  needed anything from the Product record beyond a name/type/carrier label — none of Products'
  real-policy fields (issue date, face amount, actual premium) are used by the illustration or
  its PDF. Built a new, separate "Illustrations" section on the client page, above Products —
  new `illustration_scenarios` table (client_id, product_name, product_type, carrier, data
  jsonb, notes, `converted_product_id`), completely independent of `client_products`. Flow: "+
  Add Illustration" → pick product type/name/carrier → lands on its own scenario page
  (`/clients/[id]/scenarios/[scenarioId]`, adapted from the existing per-product
  IllustrationForm — same milestone editors, same PDF generator, all duplicated rather than
  shared so the existing per-product illustration flow can't be affected by this at all) → enter
  numbers, Save, Download PDF, same as before. Once the client actually decides, a "This Is What
  They're Going With →" button (with an inline confirm) promotes that one scenario to a real
  Product: creates the `client_products` row (same `is_quote`-while-Quoted-stage logic as the
  normal Add Product flow, riders carried over automatically for Term/Final Expense) AND copies
  the scenario's numbers into that new product's own `product_illustrations` row, so the
  existing "Illustration Summary" page/PDF on the Product itself works immediately with zero
  re-entry. The scenario is never deleted on conversion — it's marked resolved
  (`converted_product_id` set) and stays as a record of how the client got there, with a link
  back to the now-official version. New SQL required — see delivery message. Compare-with-PDF
  (discussed same day, see the section above) is the natural next step on top of this, but was
  deliberately NOT started yet — Karina asked for this piece first.

- **Analyzer always recommends a juvenile policy for a minor client — built 9/1.** Karina ran an
  analysis on a 6-year-old client (goal: "Build cash value / savings") and got North American
  Builder Plus IUL 4 as the primary recommendation — an adult-oriented product. Root cause: the
  analyzer's `goal === "college"` branch already correctly routed to the juvenile product line
  regardless of age, but every OTHER goal branch (accumulation/default, legacy, income, etc.)
  never checked the client's own age at all before picking a product. Fixed by adding `isMinor`
  to the recommendation context (true when the analyzed person's own DOB makes them under 18)
  and short-circuiting to "Accumulation IUL — Max Cash Value Juvenile" for any minor on any goal
  other than college (college already had its own juvenile product and falls through to that
  branch unchanged — this only fires for every *other* goal). Per Karina's standing rule ("in
  kids situations I always recommend a juvi policy"): this is unconditional on the goal selected,
  reflecting that the real reason is locking in insurability and all three living benefits while
  the child still qualifies, with cash-value growth as the secondary benefit — not a goal-by-goal
  judgment call. Also, per Karina's notes on the College Planning Juvenile product specifically:
  added a reasons/talking-points disclosure that funding typically runs until around age 17
  with distributions starting at 18, and that a lump sum up front increases the total but is
  optional (confirmed with Karina directly — the Knowledge Base's existing "lump sum optional"
  wording was correct, no KB correction needed). Verified the exact scenario from Karina's
  screenshot (age 6, "Build cash value / savings") now returns Max Cash Value Juvenile instead
  of Builder Plus IUL 4, and that an adult client with the same goal is unaffected.

- **Phone Number and Email are now optional on the Client Analyzer — built 8/31.** Karina
  pointed out two real cases where the analyzer was blocking her from even getting a
  recommendation: a child on a family analysis (no phone/email of their own) and mid-call with a
  prospect whose contact info she doesn't have yet — she still wants the recommendation and
  talking points either way. Removed Phone and Email from the analyzer's required-fields check
  (`handleSubmit` in `AnalyzerClient.tsx`) and labeled both fields "optional" in the UI. Nothing
  else needed to change: `clients.phone`/`clients.email` were already nullable columns, and
  `saveAnalysisToClient`/`saveAnalysisAsNewClient` already only wrote them when present — the
  block was purely a front-end validation rule. Also cleaned up the two spots that would've
  printed an empty "Phone: " / "Email: " when blank — the on-screen result summary and the PDF
  export now both skip or dash-out whichever one is missing. Name, Date of Birth, Height, and
  Weight are still required — those are what the recommendation logic itself actually depends on.

- **Global "Meetings" tab — built 8/31.** Karina wanted every upcoming meeting in one place,
  soonest first, instead of having to open each client to see what's scheduled. New top-nav tab
  "Meetings" (`/meetings`, right after Clients) lists every meeting from `client_meetings` — both
  manually-logged ones and Cal.com Auto-Sync rows alike — across all of Karina's clients, sorted
  ascending by date/time, each linking back to that client's profile. Past meetings collapse into
  a "N past meetings" details section, same pattern as the Reminders tab. Delete and "Add to
  Calendar" both work right from this list (no need to open the client). `deleteMeeting` now also
  revalidates `/meetings` in addition to the client page, since it can be triggered from either
  place.
  Raised alongside this: Karina connected Cal.com (API key accepted) but isn't seeing a booking
  show up. Nothing in the sync code looks wrong on inspection — the two most likely explanations,
  which need Karina to confirm: (1) auto-sync only applies to bookings made *after* a successful
  Connect — it does not backfill anything booked earlier, including the original call from
  before this feature existed; (2) the booking's attendee email has to exactly match an existing
  client's email on file, or it's intentionally left unsynced rather than guessing/creating a
  client. Waiting on Karina to try a fresh test booking with a matching client email before
  concluding this needs a code fix.

- **Custom intake link handle — built 8/31.** Karina's intake link showed her raw profile UUID
  (`.../intake/347198cb-...`) and asked if advisors could set something readable instead. Added
  a "Custom link" field on the Profile page (under the intake link card) — an advisor can set a
  short handle like `karina`, and their link becomes `.../intake/karina`. Rules: 3–40 characters,
  lowercase letters/numbers/hyphens only, unique case-insensitively across every advisor
  (enforced by a DB index, since this matters once more than one company is on the platform —
  two advisors should never be able to grab the same handle). The original id-based link is
  never disabled — the intake route (`src/app/intake/[advisorId]/page.tsx`) now tries both a raw
  UUID and a slug lookup, so setting or later changing a handle can never break a link that's
  already been shared under its other form (a small warning is shown once a handle is set, since
  changing *that specific* link would still break anyone who has it).
  Also discussed: full white-labeling (an advisor's own company domain, e.g.
  `intake.theirfirm.com`) once Karina is ready to license this out. Deliberately **not** built
  now — that's real infrastructure (per-domain SSL, DNS verification, likely per-company
  branding/data separation) that's not worth designing against a hypothetical; the custom slug
  above works the same regardless of what domain eventually sits in front of it, so nothing here
  needs to be redone when that project actually starts.

- **Cal.com Auto-Sync — fixed to use API v2 — built 8/31.** Karina's first real "Connect"
  attempt on a live Cal.com account confirmed the exact uncertainty flagged when this was first
  built: Cal.com rejected the request with HTTP 410, "API v1 has been decommissioned. Please
  migrate to API v2." Rebuilt the webhook-registration call (`connectCalCom` in
  `profile/actions.ts`) against Cal.com's official v2 docs — `POST https://api.cal.com/v2/webhooks`
  with an `Authorization: Bearer <apiKey>` header (v1 used an `?apiKey=` query param), and the
  request body field is `triggers` instead of `eventTriggers`. The v2 response also comes back
  wrapped as `{status, data: {...}}` rather than `{webhook: {...}}`, so the webhook id extraction
  was updated too. `disconnectCalCom`'s delete call was updated the same way. Nothing else
  changed — the part that actually receives bookings (`/api/webhooks/cal/[agentId]`, the HMAC
  signature check, the booking payload shape) turned out to be unaffected by the v1→v2 split, so
  that route needed no changes. This should be it — reconnect with the same API key and it should
  say "Connected ✓."

- **Lead Source moved to the sidebar — built 8/31.** The "Source" field (Referral, Facebook ad,
  walk-in, etc.) used to sit in the main Contact Info card up top, next to real contact details
  it didn't really belong with. Moved it into the Pipeline Stage card in the right sidebar,
  right under the stage badge — clearly marked optional, saves on blur same as everywhere else.
  Split into its own server action (`updateLeadSource`) rather than folded into the Contact Info
  save, specifically so editing a client's name/phone/etc. can never accidentally blank out
  their Source in the background. Confirmed for Karina: nothing on any client page is ever
  visible to a client — the only client-facing page in the app is the public Intake form, which
  doesn't show this or anything else on a client's profile.

- **Scheduling link generalized + Cal.com Auto-Sync — built 8/31.** Karina booked a call via
  "Schedule a Call" on a client's profile and the portal showed no sign it happened — because
  that feature was only ever a link out to Cal.com; the booking itself lived entirely on Cal.com's
  side and nothing sent it back into the CRM. Two changes:
  1. **"Schedule a Call" is now provider-agnostic.** Renamed away from "Cal.com Scheduling
     Link" everywhere — the open/copy/embed link feature never actually needed Cal.com
     specifically, so any advisor can paste a Calendly, Zoom Scheduler, Acuity, or Cal.com
     booking link and it works the same way. Relevant since Karina wants to license this
     platform out later, and not every advisor will use Cal.com.
  2. **Cal.com Auto-Sync (new, optional).** On the Profile page, an advisor can paste their
     Cal.com Personal API Key (Settings → Developer → API Keys in Cal.com) to connect it. The
     portal registers a webhook on their Cal.com account; from then on, any booking made
     through their scheduling link automatically creates/updates/removes a meeting on the right
     client's profile (matched by the attendee's email against that advisor's clients) — no
     manual entry. Synced meetings show a "Via Cal.com" badge and live in the same card as
     manually-logged ones, now relabeled "Meetings & Calls" since it's no longer only
     in-person entries. Deleting a synced meeting only removes it from the portal's view — it
     does not cancel the real Cal.com booking.
     - Only syncs when the booking's attendee email matches an existing client on file — if
       someone books under an email that doesn't match anyone, it's intentionally left alone
       rather than guessed at or used to create a new client.
     - Calendly and Zoom Scheduler do NOT get auto-sync — each has its own separate
       webhook/auth system (Calendly needs a registered OAuth app, Zoom needs a registered Zoom
       App), so each would be its own follow-up integration project. The data model
       (`client_meetings.source` / `external_booking_uid`) is shaped so adding one later is "a
       new webhook handler," not a rearchitecture — worth building only once an advisor
       actually needs one.
     - **Built against Cal.com's documented v1 webhook API, but the one piece that couldn't be
       tested from here is the "Connect" step itself** (registering the webhook via Cal.com's
       API) — I couldn't verify it against a live Cal.com account. The receiving side (webhook
       signature verification, payload parsing, matching to a client) is solid and won't need
       to change. If "Connect" on the Profile page ever errors, the message shown comes
       straight from Cal.com's own response — send that over and it'll point at exactly what
       needs adjusting.
  - Needs the SQL below run in Supabase before uploading.

- **Height & weight on the client record itself — built 8/31.** Karina noticed a client's
  profile had no height/weight even though the Client Analyzer collects both — turned out
  those were never stored anywhere except inside a saved analysis snapshot, not on the client
  record. Added `height_ft`, `height_in`, `weight` as real columns on `clients`: they're now
  fields on the New Client form, editable on every client's Contact Info card (same
  save-on-blur pattern as the rest of that card), and captured automatically when a lead comes
  in through an advisor's Intake Link. As a bonus, starting a Client Analyzer run from a
  client's profile now pre-fills height/weight from the client record if it's on file (same as
  it already does for phone/email/DOB/existing coverage), and saving an analysis back to a
  client keeps their profile's height/weight in sync with whatever was just entered — same as
  it already does for name/phone/email/DOB. Needs the SQL below run in Supabase before
  uploading. **Layout tightened 8/31**: Height (ft) was originally its own full-width field,
  which looked oversized for a 1-2 digit number — now Height (ft) and Height (in) sit as a
  compact pair on one line ("[__] ft [__] in"), with Weight next to them as its own small box,
  on both the New Client form and the Contact Info card.

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
