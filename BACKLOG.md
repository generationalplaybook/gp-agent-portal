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

- **Highlight that Ethos products come with Will & Trust options for adults — flagged 9/2,
  placement undecided, don't build yet.** Karina flagged this while wrapping up tonight's IUL
  illustration work, unsure herself where it should go ("I don't know where this would go").
  Checked the Knowledge Base before logging this, since it looked like it might already be
  covered — it is, extensively: nearly every Ethos product entry in `kb-data.ts` (Term, Term With
  Living Benefits, TruStage Term, both Final Expense entries, Accumulation IUL via Ethos, Athene
  IUL) already lists "FREE Will & Trust included — can be gifted if not needed" in both its
  `does` and `highlights` arrays, and there are two dedicated KB cards for it — "Will Estate Plan"
  ($249 value) and "Trust Estate Plan" ($449 value, includes everything in the Will plan plus a
  Revocable Living Trust) — each already noting "NOT available for juvenile policies," i.e.
  already scoped to adults only, matching Karina's "for adults" framing exactly.
  So the Knowledge Base itself isn't missing anything here — what's actually open is whether this
  needs to surface somewhere ELSE, beyond the internal KB an advisor references. Candidates to
  ask Karina about next time this comes up: (a) the client-facing Illustration/Scenario PDF, so
  it shows up on the document a client actually sees; (b) a reminder on the Scenario/Illustration
  form itself when the carrier is Ethos, so an advisor doesn't forget to mention it; (c) nothing
  further — the KB coverage may already be exactly what she was thinking of, and she just wanted
  to confirm it existed. Don't build anything until she says which surface she means.

- **Knowledge Base — Level vs. Increasing Death Benefit concept; existing "Death Benefit
  Increase" field needs a caveat, not a rename (flagged 9/1, discuss before building — CORE
  MODEL CORRECTED 9/1, see bottom of this entry before building).** Karina explained the
  mechanics/strategy: on a Level death benefit, cash value grows faster (less going to cost of
  insurance) — good for a client prioritizing accumulation while younger — but the death benefit
  itself IS forced to step up automatically at a certain age if the client never touches
  (withdraws from) the cash value (IRS corridor requirement) — confirmed this is exactly what
  the existing `dbIncreaseAge` field on the Scenario editor represents, so no rename needed,
  just a clearer caveat. If the client DOES start taking withdrawals, the death benefit instead
  stays level — it does not step up. Karina also wants it noted that the Level/Increasing
  election itself can be changed anytime by calling the carrier (annual review or otherwise),
  not just at issue.
  Two concrete to-dos once she says build: (1) update the `dbIncreaseAge` field's helper text on
  `ScenarioForm.tsx` (currently: "If the death benefit steps up at a later age... note that age
  here...") to add the "only if cash value is left untouched — withdrawals keep it level
  instead" caveat, plus a line noting the Level/Increasing election can be changed anytime by
  calling the carrier; likely also touches the PDF callout text in `illustration-pdf.ts`
  ("Death benefit begins increasing at age X.") so the client-facing summary doesn't overstate
  it as unconditional. (2) add a new `KB` "concept" entry in `kb-data.ts` (group: "concept"),
  same shape as the existing MEC / 7 Pay Test / Policy Loans entries (what/does/agent/client/
  highlights) — the fuller explanation lives there, the form field just gets a short accurate
  caveat.
  **CORRECTION (still 9/1):** the "Increasing = more premium to cost of insurance = slower cash
  value growth" claim above is NOT reliably true — Karina ran an actual side-by-side illustration
  and found the opposite in that case (Increasing's cash value grew faster than Level's). The
  cash-value-growth comparison is product/carrier-specific and should never be asserted as a
  blanket rule in the KB copy — it needs an actual side-by-side run to know for a given product.
  The real, universal distinction is WHEN the client has the full death benefit: Level pays the
  full elected face amount from day one; Increasing starts lower and grows into that same target
  amount over years (in her live case, a $250k target isn't reached under Increasing until the
  client's mid-30s, vs. immediately under Level). That reframes the decision around the client's
  actual need for full coverage NOW (health risk, being the sole/primary breadwinner, dependents)
  vs. being able to let coverage ramp up while prioritizing something else early on — not around
  which option grows cash value faster. Concrete case in front of her today: a 40-year-old father
  with a personal/family history of stroke — she's recommending Level so he has the full death
  benefit immediately given real, elevated near-term mortality risk, with the option to switch to
  Increasing later once that risk picture changes. The KB concept card should teach advisors to
  verify cash-value growth per product rather than assume it, and frame the Level-vs-Increasing
  decision primarily around timing of full coverage vs. current health/mortality risk — the
  juvenile-policy example from earlier (start Level for accumulation, switch to Increasing once a
  real insurance need emerges) is still a valid *example* of that same day-one-vs-later tradeoff,
  just not for the cash-value-growth reason originally given.
  **Status update 9/1**: to-do (1) above — the `dbIncreaseAge` caveat on the form and PDF — is now
  built, along with a full two-part Level/Increasing Scenario rework (see "Illustration Scenario
  — two-part Level vs. Increasing death benefit comparison" near the top of this file). To-do (2),
  the standalone Knowledge Base "concept" card, is still NOT built — that wasn't part of what
  Karina authorized building tonight, just the illustration form/PDF pieces. Don't build the KB
  card yet — still logged here for whenever she's ready.
  **BUILT 9/3**: turned out a KB entry on this exact topic already existed —
  "Death Benefit Options — Level vs. Increasing vs. Increasing-to-Level" in `kb-data.ts` (added at
  some point after 9/1, alongside the Scenario rework, without this backlog entry getting
  updated to say so) — and it still stated the disproven "Level always grows cash value faster"
  claim as blanket fact. Rather than add a second, conflicting card on the same topic, revised
  that entry in place: added the CORRECTED reasoning as the lead explanation (cost-of-insurance
  mechanics don't reliably predict which option's cash value grows faster — verify per actual
  product illustration, never assert from memory), reframed the primary decision driver around
  WHEN the client has full coverage (Level = day one, Increasing = grows into the same target over
  years) vs. their current health/mortality risk, and added Karina's concrete case (40-year-old
  father with a stroke history → Level, for full immediate coverage given elevated near-term
  risk) to the agent guidance. Also tightened the DBO-change language to "anytime by calling the
  carrier" per Karina's exact framing. No SQL, no other files touched — this is a single KB data
  entry.

- **Illustration Scenario — Riders section: free/included vs. at-cost, plus an
  approval-pending note (flagged 9/1, don't build yet).** While testing Policy Premium, Karina
  started describing another gap: a Riders section on the cash_value Scenario editor showing
  which riders are automatically applied at no cost, with a note that exactly which ones apply
  is only confirmed at underwriting approval — not guaranteed at illustration time. She also
  wants a separate section for riders the client would pay extra for ("at-cost riders" — asked
  if that's a real thing; confirmed yes, e.g. Waiver of Premium, Guaranteed Insurability, Child
  Term, Return of Premium, an annuity's income rider — as opposed to the free/included type like
  Accelerated Death Benefit riders, which is most of what's in `COMMON_RIDER_OPTIONS` today).
  Relevant existing pieces: `RidersField.tsx` + `COMMON_RIDER_OPTIONS` (`types.ts`) already do a
  checkbox-plus-custom-chip riders picker, but only on the term/final_expense branches of
  `ScenarioForm.tsx` — there's no riders section at all on the cash_value (IUL/Whole Life)
  branch yet, and no free-vs-at-cost split anywhere. Karina said she's still going through her
  notes and may add more to this — don't build any of it yet, just log it.

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

- **Clickable meeting location links (flagged 9/1, same test session) — BUILT 9/3.** In
  Meetings & Calls, the Location field always rendered as plain text — e.g.
  `https://app.cal.com/video/...` shown as text, not a link. Karina wants a pasted-in URL to be
  clickable. Turned out there's only one `MeetingRow.tsx` (shared between the per-client card and
  the global Meetings tab, not two separate files as originally logged) — added an `isUrl()`
  check there: a URL location now renders as a real underlined link that opens in a new tab
  (`target="_blank"`); a plain address still renders as before. Didn't touch the separate,
  still-unconfirmed "Via Cal.com" badge question from the entry above — that one still needs
  Karina to say what "misalignment" means before anything changes there.

- **Birthday → auto-calculated/displayed age — BUILT 9/3.** Karina asked that once a client's
  birthday is entered, their current age gets calculated and shown, rather than the advisor
  doing that math themselves. Turned out a `calculateAge()` helper (`src/lib/family.ts`) already
  existed and was already used for minors — the actual gap was that ADULT clients never showed
  their age anywhere. Fixes: the client profile header now shows an "Age NN" chip next to the
  name for every client with a birth date on file (previously only minors got a badge there);
  the Birthdate field on the Contact Info edit form now shows "· age NN" live next to the label
  as you pick a date; and adult family members on the Family card now get the same "Age NN" chip
  adult clients get (previously only minors there showed an age badge too). Client Analyzer
  already showed a live "Age: N years old" — nothing to change there. No schema change.

- **Light/gray helper text is hard to read across the whole portal — BUILT 9/3.** Karina sent a
  screenshot of My Profile (Intake Link + Carrier & Licensing cards) as one example but was clear
  this wasn't just that page — every lighter-gray label/caption/helper text across the app needed
  to get a bit darker (not full black, just more legible). Surveyed the actual color usage before
  touching anything: `text-[#999]` (81 uses), `text-[#888]` (74 uses), plus one-off outliers
  `text-[#bbb]` and `text-[#777]`, were the faint tier — things like "Send this to a client
  before your first meeting...", "(optional — e.g. \"karina\"...)", the small COMPANY/USERNAME
  column headers. `text-[#666]` and `text-[#555]` were already noticeably darker and left alone.
  Ran one global find/replace across every `.tsx`/`.ts` file, collapsing all four light-gray
  values to a single `#707070` — a portal-wide styling change, not a one-off. No schema change,
  no logic touched, purely a color-value swap; also used `#707070` for the new gray text added by
  the age and dashboard work above so nothing new ships in the old faint shade.

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

- **Carrier Logins + State Licenses — private per-advisor reference on My Profile — discussed
  9/3, BUILT 9/3.** Karina was tracking her own broker/carrier portal logins (F&G, North
  American, Ethos, Athene, Nationwide, WinFlex, Mutual of Omaha) in a messy personal spreadsheet
  and wanted it saved properly, with the links "accessible quickly." Confirmed this belongs on My
  Profile, not on client profiles — it's the same info regardless of which client she's working
  on. Sketched a layout first (published as a design canvas) before building, per Karina's
  request, using her real spreadsheet rows as the sample data.
  New "Carrier & Licensing" card on `/profile`, below My Credentials, with two tabs:
  - **Carrier Logins**: Company, Username, Password, Agent #, Agency #, Profile Code (freeform —
    a code, a note, or a URL), and Link (the portal login URL). Sorted alphabetically by company.
    Password is masked (••••••••) with a click-to-reveal toggle rather than shown plain. Link and
    Profile Code render as a compact "Open ↗" button when they're a URL (some of Karina's are
    hundreds of characters) instead of printing the raw text.
  - **State Licenses**: State, License #, a Resident-state flag, and freeform Notes — deliberately
    NO expiration/renewal/status fields. Karina's call when asked: "that's tracked in SureLC,
    this portal is more so organization" — duplicating compliance dates here risks a second,
    silently-stale copy diverging from the real system of record. Kept intentionally lean.
  New tables `carrier_logins` and `state_licenses` (`supabase/schema.sql` section 31,
  `migration_add_carrier_licensing.sql`), both private per-advisor (RLS: `agent_id = auth.uid()`),
  same ownership pattern as `advisor_credentials`. Full CRUD (add/edit/delete, inline row editing)
  in `CarrierLoginsTab.tsx` / `StateLicensesTab.tsx`, tab switcher in `CarrierAndLicensingCard.tsx`,
  actions in `profile/actions.ts`.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_carrier_licensing.sql`.
  **Update 9/3**: Karina flagged she'd already been storing her state license numbers (and her
  NPN) as generic entries in My Credentials — with State Licenses now built, those state entries
  are redundant, and NPN specifically deserves its own field (a single one-per-advisor value, not
  a repeatable list). Added `profiles.npn` (`migration_add_npn.sql`) and a dedicated "NPN
  (National Producer Number)" field on Your Info (`ProfileInfoForm.tsx`), next to Email. My
  Credentials itself is untouched — it stays as the generic catch-all for anything that isn't NPN
  or a carrier/state number. Karina still needs to manually re-add her state numbers under the
  new State Licenses tab and remove the old My Credentials entries for NPN and each state — I
  can't move her live data myself, only ship the code/schema.
  **Update 9/3 (later same day)**: Karina asked to just delete My Credentials outright now that
  everything it did has a proper home. Removed the whole section from `/profile`
  (`CredentialRow.tsx` deleted, `addCredential`/`deleteCredential` removed from
  `profile/actions.ts`, the card/form/query pulled out of `page.tsx`). The `advisor_credentials`
  table itself is left in place, untouched — old rows just sit there unused, same as the
  `medical_conditions.treating_physician` column after that field was retired; no destructive SQL
  either time. Gave Karina her exact old values inline in chat (NPN 21383480; CA 4422472; GA
  3862688; WI 21383480; NV 4240448) so she can re-enter them into the new fields without needing
  the old UI first.
  **Update 9/3 (again)**: Karina flagged the single "Agent #" field was too narrow — most carriers
  issue a separate agent ID per product line, and her own F&G row had "Annuities 000763473 / Life
  000756492" crammed into one box. Split `carrier_logins.agent_number` into `life_agent_number`
  and `annuity_agent_number` — two fields, two columns, in the add form, inline edit, and the
  table header (`CarrierLoginsTab.tsx`, `types.ts`, `profile/actions.ts`). Schema: `schema.sql`
  section 33 has an idempotent rename (old `agent_number` → `life_agent_number`, since her live
  table already has real data in it) plus the new `annuity_agent_number` column as a safety net —
  safe to run whether or not her table already has the old column. Standalone migration for her to
  run: `migration_split_agent_numbers.sql`. After running it, her existing agent numbers land in
  Life Agent # (a reasonable guess, since that's what most of her entries were) — she'll want to
  spot-check each row and move any that were actually annuity numbers into the new field, then
  fill in the annuity numbers she has. Also widened the whole My Profile page
  (`mx-auto max-w-2xl` → `max-w-4xl` in `profile/page.tsx`) per "this entire profile sections
  should be stretched out wider in general" — mainly so the Carrier Logins table (now 8 columns)
  has room to breathe.
  **Update 9/3 (bugfix)**: Karina hit "when I hit save it just deletes" trying to add a new
  carrier after this shipped — the add/edit form would clear out with nothing saved and no error
  shown. Root cause: `addCarrierLogin`/`updateCarrierLogin` never checked whether the Supabase
  call actually succeeded, so when it failed (most likely because `migration_split_agent_numbers.sql`
  hadn't been run against her live database yet, meaning the `life_agent_number`/
  `annuity_agent_number` columns the code was writing to didn't exist there yet) the form just
  silently discarded her input instead of showing what went wrong. Fixed the same way for both
  Carrier Logins and State Licenses actions: `add*`/`update*` now return `{ ok, error }`, and the
  add/edit forms in `CarrierLoginsTab.tsx`/`StateLicensesTab.tsx` show the real error message and
  keep the form open with what was typed instead of clearing on failure. Doesn't replace running
  the migration — just makes it obvious when something's actually wrong instead of failing quietly.
  **Update 9/3 (again)**: two more things after the migration ran and real rows started showing.
  Karina asked what "Agency #" and "Profile" meant — Agency # is the agency/GA/IMO's own number
  with a carrier (separate from the agent's own number), Profile was the "Profile Code" column
  from her original spreadsheet (a carrier-specific portal code/note, or a URL). She confirmed she
  doesn't need Profile, so it's removed from the table entirely — `CarrierLoginsTab.tsx`,
  `profile/actions.ts`, and the `CarrierLogin` type all no longer reference it; the underlying
  `carrier_logins.profile_code` column is left in place, untouched, same non-destructive pattern as
  elsewhere. Also fixed two real layout bugs she caught in screenshots: (1) the header row (COMPANY
  / USERNAME / etc.) was a plain grid spanning the full card width, while each data row's grid was
  squeezed narrower by its own trailing edit/delete icons sitting outside the grid — so columns
  drifted further out of alignment with the header the further right they were (worst for Link,
  the last column). Fixed by giving the header and every row the identical
  flex-wrapper + grid + fixed-width action-icon-spacer structure, so their columns line up exactly
  regardless of exact icon widths. (2) grid cells had no `min-w-0`/truncate, so a long value (e.g.
  Ethos's full email as Username) could overflow its cell and visually overlap the password dots
  and reveal icon in the next column instead of ellipsizing — added `min-w-0` + `truncate` +
  hover-title (full value) to every cell in both Carrier Logins and State Licenses so long values
  now truncate cleanly instead of colliding with their neighbor.
  **Update 9/3 (once more)**: Karina pushed back on truncation itself — "if someone wants to copy
  and paste they cant cause its cut off right?" A fair point for a table whose whole purpose is
  copying credentials into carrier portals: the hover tooltip let you read the full value, but not
  copy it without manually selecting text. Walked through options (wrap the text so rows grow
  taller; wrap + a copy icon; a card layout instead of a table; or keep the compact table and add
  copy icons) — she chose keeping the compact table with copy icons, hover-only for now ("hover and
  tap and hold is fine for mobile when we get to mobile"). Added a `CopyButton`/`CopyableCell` to
  both `CarrierLoginsTab.tsx` and `StateLicensesTab.tsx`: each truncated field (Username, Password,
  Life Agent #, Annuity #, Agency # on Carrier Logins; License # on State Licenses) shows a small
  copy icon on hover of that cell — one click copies the full value to the clipboard via
  `navigator.clipboard.writeText`, with a brief checkmark confirming it worked. Table stays
  compact; the hover tooltip (full value on hover) is still there too for reading, not just
  copying.

- **New Home Page — snapshot dashboard, built 9/3.** Karina: "I want to clean up the first
  page advisers see... it can be overwhelming" seeing the full client list the moment you log
  in. Replaced the old behavior (landing on `/` immediately redirected straight to `/clients`)
  with a real dashboard at `/` — Clients is now just another tab in the nav, same as Meetings or
  Team, rather than the first thing on screen. Sketched the layout first as a design canvas
  before writing any code, per her usual preference for anything visual — she picked 4 even
  cards over 2 or 3, and clarified two things on the mockup before build: (1) the 4th card
  ("Team Follow-ups") tracks reminders tied to recruits on the Team page, since there's no
  separate advisor-to-advisor task feature yet — closest existing match to what she meant by
  "team follow ups"; (2) Client Pipeline's per-stage rows link straight to that stage already
  filtered on the Clients page (`/clients?stage=lead`, etc. — that filtering already existed),
  while Meetings/Reminders/Team are each one whole clickable card through to their full page.
  Built `src/app/(app)/page.tsx` (deleted the old `src/app/page.tsx`, which can't coexist with a
  page at the same route inside the `(app)` group) with 4 cards: Client Pipeline (stage counts +
  a colored bar, using the real `CLIENT_STAGES` colors), Upcoming Meetings (count + next 3),
  Reminders Due (count + overdue count + next 3, client-owned reminders only), Team Follow-ups
  (count + next 2, recruit-owned reminders only, so nothing double-counts between the two
  reminder cards). Added "Home" as the first nav item (`NavLinks.tsx`) and made the "GP Advisor
  Portal" logo in the top nav a link back to `/` (`layout.tsx`). Updated every place that used to
  send someone straight to `/clients` after signing in — `login/actions.ts`, `terms/actions.ts`
  (post-terms-acceptance), `set-password/page.tsx`, and the `proxy.ts` auth gate's own
  already-logged-in redirect — to land on `/` instead, so the dashboard is genuinely the first
  thing anyone sees, not just reachable by clicking Home afterward. No schema change, no SQL to
  run — this is entirely new/moved page code.

- **Self-service email change on My Profile — discussed/built 9/3.** Karina noticed the Email
  field on Your Info is disabled and asked what an agent would do if they needed to change it —
  turned out there was no path at all, self-service or otherwise: `profiles.email` is only ever
  set once, at signup. Her call: "i think they should have freedom to do it themselves." Built a
  "Change" link next to Email (`ChangeEmailField.tsx`) that reveals a new-email input + "Send
  confirmation." `requestEmailChange` (`profile/actions.ts`) calls Supabase Auth's own
  `updateUser({ email })` — Supabase handles sending the actual confirmation link and won't change
  the login email until the agent clicks it (per whatever "Secure email change" is set to in this
  project's Auth settings — Karina, worth checking Authentication → Settings in Supabase: if it's
  on, Supabase asks for confirmation from both the old and new address, not just the new one).
  Deliberately a separate "Send confirmation" action from the main Save button, since nothing
  actually changes until the agent confirms — it doesn't behave like the rest of the form.
  New trigger `on_auth_user_email_changed` (`schema.sql` section 34,
  `migration_email_change_sync.sql`) keeps `profiles.email` in sync automatically once a change
  actually completes — without it, an agent's real login email and the "Email" shown on their
  profile would silently drift apart the moment they changed it (this would've been a latent bug
  the moment self-service email change existed at all, even for a single admin-driven change).
  SQL needs to be run against Karina's live Supabase project — see `migration_email_change_sync.sql`.

- **Email connection for Illustrations — attach and send straight from the portal — discussed
  9/3, don't build yet.** Karina: "at some point we should allow email connection so when an
  advisor creates illustrations they can just attach them within the portal and send it off."
  Right now a saved Policy Illustration Summary produces a client-facing PDF (see
  `src/lib/illustration.ts`) that the advisor has to download and then attach/send manually from
  their own email client — this would add a "send" step right on the illustration itself.
  Needs deciding before it's built: which email account sends it (the advisor's own inbox via
  OAuth — Gmail/Outlook — vs. a portal-owned sender like the invite emails use), whether it's a
  one-click "send to client's email on file" or a compose step with edit-before-send, and whether
  the send gets logged anywhere on the client's profile (e.g. a note/timeline entry) so there's a
  record it went out. Likely a real OAuth integration (Gmail API / Microsoft Graph) rather than a
  simple SMTP relay, similar in scope to the Cal.com Auto-Sync connection work.

- **Team / Recruits section — track licensed agents, agents-in-progress, and prospective agent
  leads — discussed 9/3, BUILT 9/3.** Karina wanted to keep track of her own recruited agents for
  follow-up purposes, explicitly with NO upline/downline hierarchy and NO commission tracking (the
  broker already handles that), plus a way to optionally link an existing client record to a
  recruit for the case where a client wants to become an agent. When asked to settle the two open
  scoping questions, she confirmed the exact 3-stage pipeline in her own words — "Lead" (watching
  the intro calls, progressing), "Studying," "Licensed" — and said "Yes nudge" for follow-up
  reminders.
  New `recruits` table (`supabase/schema.sql` section 28), completely independent of `clients`:
  `full_name`, `phone`, `email`, `state` (licensing/appointment state), `stage` (lead / studying /
  licensed), `source`, `target_license_date`, `notes_summary` (freeform "at a glance" field, same
  pattern as `clients.notes_summary`), and an optional nullable `client_id` FK for the
  client-becomes-candidate case — a cross-reference only, `on delete set null` so deleting either
  record never touches the other.
  The "nudge" reuses the EXISTING Reminders system wholesale rather than building a second
  notification mechanism: `reminders.client_id` is now nullable, a new nullable `recruit_id`
  column was added, and a check constraint keeps every reminder pointed at exactly one of the two.
  No RLS change was needed — reminders were already scoped by `agent_id = auth.uid()`, not by
  walking through the client. This meant generalizing the shared reminder plumbing everywhere it's
  used, all done as one pass: `reminders/actions.ts`'s five functions now take a `ReminderOwner`
  discriminated union (`{clientId}` or `{recruitId}`) instead of a bare `clientId`, `ReminderRow`
  and `RemindersCard` take that same `owner` prop (and `ReminderRow`'s display props were renamed
  `subjectName`/`subjectHref`, generic instead of client-specific), and `/reminders` now joins both
  `clients` and `recruits` and routes each row to whichever one it belongs to. The existing Client
  Reminders card and every other client call site were updated to pass `owner={{ clientId }}` —
  behavior there is byte-for-byte unchanged, confirmed via full lint + build.
  New `/team` section: a list page grouped/filterable by stage (mirrors `/clients`' stage-chip
  layout exactly, including the "next reminder, overdue" badge), `/team/new`, and a `/team/[id]`
  detail page with inline auto-save contact fields (mirrors `ContactInfoForm`), a stage selector,
  a Source field, a freeform Notes field, the Reminders card, and a Linked Client card — search
  your own clients by name (reuses the same search-and-pick pattern as Family linking on the
  client page) and link/unlink, never merging the two records. "Team" added to the main nav.
  SQL run against Karina's live Supabase project 9/3 (`migration_add_recruits.sql`) — live and
  working.

- **Medical Condition Report — universal health questionnaire linkable to a client's profile, for
  informal carrier underwriting calls — discussed 9/3, BUILT 9/3.** Motivating case Karina gave:
  a client in his 40s who's had 3 strokes, now medication-controlled — she's been advised to call
  multiple carriers' underwriting departments for an informal risk assessment before a formal
  application, and needs enough detail on hand to do that call well. When asked whether to also
  fold in client-level health fields (tobacco, family history, etc.) alongside the condition
  fields, Karina said "No, just condition" — so this is scoped strictly to the condition itself;
  height/weight already live on the client record (section 22) and stay there, untouched.
  New `medical_conditions` table (`supabase/schema.sql` section 29), one row per condition per
  client (a client can log more than one — a cardiac history and diabetes, say), deliberately
  condition-agnostic rather than one fixed-field form: condition name, onset/diagnosis date,
  current status/severity, treating physician/facility, an event timeline (repeatable date +
  description rows — Karina's own example has an initial stroke plus two recurrences, so this
  had to be repeatable, not a single date field), medications (repeatable name/dosage/start
  date/lifelong-yes-no rows), most recent test/report result + date, hospitalizations, and a
  free-text catch-all. events/medications are jsonb arrays rather than child tables (same
  reasoning as `illustration_scenarios.data`). `submitted_by_client` flags whether an entry came
  through the public link or was typed in by the agent.
  The full field set lives in ONE shared component, `MedicalConditionFields.tsx`
  (`clients/[id]/`), used by both entry points so they're guaranteed to ask the same questions:
  the agent-facing `MedicalConditionsSection.tsx` (a new "Medical Condition Report" section on
  the client's own profile — add/edit/delete condition entries, each showing a "From client" tag
  when it came in through the public link) and the public `MedicalReportForm.tsx`.
  Link mechanism modeled on the existing Intake link (`/intake/[advisorId]`, `IntakeLinkCard.tsx`)
  but per-client rather than per-advisor and with no memorable slug: a new
  `clients.medical_report_token` (random uuid, unique, defaulted so every client already has one)
  and a new public route `/medical-report/[token]` outside the `(app)` group, resolved with the
  admin client exactly like Intake resolves its slug/id — deliberately a random token rather than
  the client's own id, since health information is more sensitive than a general intake form. A
  new `MedicalReportLinkCard.tsx` in the client sidebar shows/copies that link. The same
  `MedicalConditionFields` form is also reachable directly from the client's own profile (no
  token, no public route involved) for the "agent fills it out live on the call" case — one field
  set, two doors in, exactly as discussed.
  SQL run against Karina's live Supabase project 9/3 (`migration_add_medical_conditions.sql`) —
  live and working.
  **Update 9/3**: the "Treating physician / facility" field was removed from the form entirely —
  Karina felt it "feel[s] invasive" on the client-facing version (asking a client to type out
  their doctor's name into a web form). Pulled from `MedicalConditionFields.tsx`, the draft type,
  both save paths (`clients/actions.ts` and `medical-report/[token]/actions.ts`), and the summary
  display. The `treating_physician` column stays in the DB, just unused — no new SQL needed for
  this change, no re-run required.

- **Client City / State / Timezone — "how many hours apart are we" at a glance — discussed 9/3,
  BUILT 9/3.** Karina's own use case: before calling, emailing, or booking something with a
  client, she needs to know how many hours apart they are. Discussed first (state/city for
  timezone, and whether advisor-side timezone should auto-adjust while traveling), then
  explicitly authorized ("build the timezone thing city state we talked about").
  New `clients.city`, `clients.state`, `clients.timezone` columns (`supabase/schema.sql` section
  30, `migration_add_client_timezone.sql`). Timezone is a plain dropdown of 7 explicit IANA zone
  ids (`US_TIMEZONE_OPTIONS` in `src/lib/types.ts`: Eastern/Central/Mountain/Mountain-Arizona
  (no DST)/Pacific/Alaska/Hawaii) rather than derived from state, since several states span more
  than one zone (Texas, Florida, Tennessee, and others) and Arizona doesn't observe daylight
  saving.
  No advisor-side timezone setting was needed: every date/time already on the portal
  (`LocalDateTime.tsx`) renders in the *viewer's own device timezone* via
  `toLocaleString(undefined, ...)`, so it already auto-adjusts when an advisor travels (as long
  as their device's automatic timezone is on) — nothing new to build there.
  New `src/lib/timezone.ts` computes the live hour difference between the client's saved
  timezone and the viewer's own current browser timezone (via `Intl.DateTimeFormat` — not a
  hardcoded offset table, so it stays correct through daylight saving changes automatically).
  New `ClientLocationLine.tsx` shows this right under the client's name on their profile, e.g.
  "Dallas, TX — 1 hour behind you." City/State/Timezone are editable on the existing Contact
  Info card (`ContactInfoForm.tsx`, auto-save on blur/change, same pattern as every other field
  there) and captured up front on the New Client form.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_client_timezone.sql`, same paste-into-SQL-Editor step as the last two.

- **Team/Recruit linking: client is the source of truth for phone/email/state — built 9/3,
  extended 9/3.** Karina: "when i link an existing client to a team card, can it auto fill the
  phone number and email and any other info that is the same?" — then, once linking was live,
  asked the natural follow-up: "if an email is changed somewhere will it update across all of
  that person's profiles?" Together these settled the design: the client record is the source of
  truth, one-way, for as long as the two stay linked.
  `linkClientToRecruit` (`team/actions.ts`) copies phone/email/state from the client onto the
  recruit at link time (only fields the client actually has a value for, so linking a client
  with no email on file doesn't blank one the recruit already had). From then on,
  `updateContactInfo` (`clients/actions.ts`) pushes any phone/email/state edit on the client
  straight through to a linked recruit automatically, via a new `syncContactInfoToLinkedRecruit`
  helper — so editing a client's email updates the linked recruit's copy too, no separate step.
  It does NOT go the other way: editing the recruit's own phone/email/state never pushes back to
  the client, and clearing a field on the client doesn't blank out the recruit's copy either
  (only a real value propagates). `full_name` is deliberately left out of all of this — already
  required at recruit creation, and a recruit's name on file isn't wrong just because it differs
  slightly from the client's, e.g. a nickname. No new SQL — this only reads/writes existing
  columns.
  Also fixed a related staleness bug found while building the first half of this:
  `RecruitContactForm` keeps its own field state in `useState`, seeded once from its `recruit`
  prop at mount — so when a server action updates the recruit from somewhere *other* than that
  form itself (linking a client, or now a synced client-side edit), the page revalidates but the
  form kept showing the old fields until a manual reload. Fixed by keying
  `<RecruitContactForm key={recruit.updated_at} .../>` in `team/[id]/page.tsx` so it remounts
  (and re-seeds from fresh props) whenever the recruit row actually changes — synced
  phone/email/state now appear immediately, no refresh needed.

- **DollarInput — auto-formats with commas on blur, portal-wide — built 9/2.** Karina spotted
  "55000" (no commas) sitting right next to "50,000" (with commas) on the same Final Expense
  budget-options card and said commas "need to autofill, that needs to happen across all areas of
  portal." `DollarInput` (`clients/[id]/DollarInput.tsx`) is the one shared component behind
  every dollar figure in the app — Illustrations, Scenarios, and Products all use it — so this
  was a single-file fix that reaches everywhere at once, exactly what "across all areas" needed.
  Doesn't reformat while actively typing (reformatting mid-keystroke fights the cursor and is a
  well-known way to introduce new bugs — digits landing in the wrong place, cursor jumping)
  instead formats on blur (tabbing or clicking away), the same pattern the Client Analyzer's
  separate `CurrencyInput` component already used — this brings the rest of the portal in line
  with a pattern that was already proven there rather than inventing a second convention. Reuses
  `formatMoney()` from `illustration.ts`, the exact same helper the PDF generator already
  formats every dollar figure through, so what an advisor sees on screen now always matches what
  ends up on the PDF — "91.50" stays "91.50" (cents kept only when actually entered), "55000"
  becomes "55,000".
  Verified by bundling the real `DollarInput.tsx` component (not a reimplementation) into an
  isolated test page with esbuild and driving it with Playwright/Chromium — typed "55000",
  "91.50", "10000", "100.35", and "1234567" into the field, blurred, and confirmed both the
  visible input and the value passed to `onChange` (i.e. what actually gets saved) came out
  correctly formatted in every case. Test scaffolding was temporary (outside the project, not
  included in any delivered zip) — the only lasting change is the four-line formatting addition
  to `DollarInput.tsx` itself.

- **Illustration Scenario (Final Expense) — up to 3 face-value/premium budget options on the
  same scenario — built 9/2.** Karina asked for this while reviewing a TruStage Final Expense
  scenario: "sometimes people have room in their budget, so I want to enter more, should be able
  to enter another face value and premium, at least 3 total." Final Expense pricing is a
  straightforward face-value-to-premium table per carrier (guaranteed/simplified issue, no cash
  value or Level/Increasing complexity like IUL), so unlike the cash_value Milestones editor this
  isn't an age-by-age table — just up to 3 flat Death Benefit + Level Premium pairs, fixed at 3
  (not an open-ended "+ Add" list) since that's what was actually asked for.
  Added `deathBenefit2`/`levelPremium2` and `deathBenefit3`/`levelPremium3` as optional fields on
  `FinalExpenseIllustration` (`illustration.ts`) — the existing `deathBenefit`/`levelPremium`
  stay Option 1, so every existing Final Expense scenario is unaffected. New
  `FinalExpenseOptionsEditor` component in `ScenarioForm.tsx` shows Option 1 same as always, plus
  a "+ Add another budget option" button that reveals Option 2, then Option 3, each in its own
  bordered card with a Remove link (removing clears that option's data too, not just hides it).
  On the PDF (`illustration-pdf.ts`): with only Option 1 filled in, the summary looks byte-for-
  byte like it always has — the original single big green box. With 2 or 3 options, it switches
  to that many smaller boxes side by side, each showing its death benefit and "$X/mo" premium.
  **Bug caught and fixed during testing, before this went out**: the first version of the
  3-across boxes reused the single-box version's longer premium phrasing ("$X/mo — guaranteed
  for life"), which wrapped to a second line in the narrower boxes and spilled text below the
  box's fixed height — confirmed via a rendered PDF crop showing "life" sitting on white
  background outside the green box. Fixed by shortening the multi-option boxes' premium line to
  just "$X/mo" (the intro paragraph above the boxes already says everything here is guaranteed
  for life, so nothing is lost) — re-verified with fresh renders of 1, 2, and 3-option scenarios,
  all clean. No SQL needed — all four new fields live inside the existing `data` JSONB column.

- **Illustration Scenario — compare a second monthly premium (e.g. $100/mo vs $200/mo) on the
  same Scenario — built 9/2.** Karina asked to show a client what the same policy looks like at
  two different budgets, "opens up more room for data entry" once a second premium is typed in —
  same interaction pattern as the Level/Increasing split. Discussed scope before building since
  crossing this with Level/Increasing would mean 4 tracks per milestone (Level-A, Increasing-A,
  Level-B, Increasing-B) — too much to type per age and too wide a table. Went with the simpler
  option instead, confirmed with Karina: Premium B is its own single track, NOT crossed with the
  election.
  New optional field `premiumB` on `CashValueIllustration` — a "Compare to a second premium"
  DollarInput next to Monthly Premium in `ScenarioForm.tsx`. Filling it in is the on/off switch
  for the whole feature: blank, and everything (form and PDF) looks exactly like it did before
  this existed. Filled in, and a third sub-block opens up on each Milestone card, labeled with
  the actual amount (e.g. "at $200/mo") via the existing `formatMoney()` helper, bound to two new
  optional fields on `CashValueMilestone`: `cvPremiumB` / `dbPremiumB`.
  On the PDF (`illustration-pdf.ts`): Policy Premium block gets a "Compare to: $X/mo" line. The
  Milestones table grows from 5 to 7 columns when premiumB is set (label + Level/Increasing/
  Premium-B for both Cash Value and Death Benefit) — font size and column widths shrink a size to
  keep it fitting the same page width; with premiumB blank the table is byte-for-byte the
  original 5-column layout. Both charts (Cash Value, Death Benefit) get a third line for Premium
  B — solid gold, legend labeled with the actual dollar amount — alongside the existing solid
  Level / dashed Increasing lines.
  **Also fixed while in this code, an open item from a few messages earlier**: Karina had asked
  whether leaving one side (Level or Increasing) entirely blank would error or "make the PDF make
  sense" — I'd tested it and found it didn't error, but the chart used to draw a flat line sitting
  at $0 with that side's name still in the legend, which reads to a client as "this pays $0"
  rather than "we didn't enter this side." Fixed for all three possible tracks now (Level,
  Increasing, and the new Premium B): a track only gets a line + legend entry on the chart if at
  least one milestone actually has a number for it. The table was never affected by this — a
  blank cell there already showed a plain "—", which was always clear.
  Verified with three rendered PDFs: no `premiumB` at all (pixel-identical to the pre-9/2
  layout), `premiumB` filled in with all three tracks populated (7-column table, 3-line charts,
  correct dollar-amount legend labels), and `premiumB` filled in with Level left entirely blank
  (confirms the flat-$0-line fix — Level shows "—" in the table and doesn't appear on the chart
  or legend at all). No SQL needed — `premiumB`/`cvPremiumB`/`dbPremiumB` all live inside the
  existing `data` JSONB column, same as every other additive scenario field.

- **Illustration Scenario — Initial Death Benefit and Minimum to Avoid Lapse split into Level /
  Increasing, same as the Milestones table — built 9/2.** Direct follow-up to the two-part
  rework below: Karina tested the intake side and wanted the same Level/Increasing split carried
  into the two single up-front numbers that were still one field each. Two changes, both on the
  cash_value branch:
  (1) **Initial Death Benefit** now has a Level Face Value and an Increasing Face Value, entered
  side by side (a carrier can quote a different starting face amount for each election even
  though both grow toward the same eventual target). Added `initialDeathBenefitIncreasing?`
  alongside the existing `initialDeathBenefit` on `CashValueIllustration` (`illustration.ts`) —
  `initialDeathBenefit` is now specifically the "Level" value, same additive pattern as every
  other field in this rework. On the PDF, this now draws as two green boxes side by side when
  both are filled in ("Initial Death Benefit (Level)" / "(Increasing)"); if only the Level value
  is present (any scenario saved before this build), it still renders as one full-width box
  labeled "Initial Death Benefit (Face Value)" exactly as before — fully backward compatible.
  (2) **Minimum to Avoid Lapse** (under Policy Premium) is now also split Level/Increasing — cost
  of insurance differs by election, so the bare minimum that avoids lapse isn't one number.
  Monthly Premium stayed a single field (what the client actually chooses to pay doesn't change
  with the election, only asked about the minimum). Added `minimumPremiumIncreasing?` alongside
  the existing `minimumPremium` (now the "Level" value). PDF shows "Minimum to Avoid Lapse
  (Level): $X/mo" and "(Increasing): $Y/mo" as separate lines, each only if filled in.
  **Bug caught and fixed during testing tonight**: the first render of the new side-by-side
  Initial Death Benefit boxes came out with the second (Increasing) box solid dark instead of
  light green — root cause was that jsPDF draws text glyphs using the same underlying fill color
  as shapes, so drawing the first box's label text after its rect (in dark charcoal) silently
  changed the fill color that the second box's rect then inherited. Fixed by re-setting the fill
  color immediately before each box's rect instead of once up front — verified with a rendered
  PDF showing both boxes correctly light green, and a second rendered PDF confirming the
  single-box/single-line backward-compatible case still looks exactly like it did before this
  build. No SQL needed — both new fields live inside the existing `data` JSONB column, same as
  every other additive scenario field.

- **Illustration Scenario — two-part Level vs. Increasing death benefit comparison, Policy
  Premium moved to the top, Death Benefit Increase caveat added — built 9/1, same night as the
  Policy Premium section below (Karina needed this for an email going out that day).** Follow-up
  to the "Level vs. Increasing Death Benefit concept" and "Policy Premium ordering" entries below
  (both logged earlier tonight as "don't build yet, discuss first") — after the discussion,
  Karina said "let's build what we have talked about... I do need to get this email out today."
  Three changes, all on the cash_value branch:
  (1) **Reordered sections** in `ScenarioForm.tsx` and `generateScenarioIllustrationPDF`
  (`illustration-pdf.ts`) so Policy Premium (Monthly Premium + Minimum to Avoid Lapse) is now
  first, ahead of Initial Death Benefit and Death Benefit Increase — matches the standalone
  "Policy Premium ordering" ask below.
  (2) **Death Benefit Increase caveat**: the helper text under `dbIncreaseAge` now explains the
  real mechanic Karina described — the step-up only fires if cash value is left untouched
  (withdrawals keep the death benefit level instead) — plus a line noting the Level/Increasing
  election can be changed anytime by calling in, with periodic reviews scheduled as part of the
  service anyway. Same two-line caveat now also renders in the PDF's gold callout box (grew from
  26pt to 40pt tall to fit the second line).
  (3) **Two-part Milestones**: each milestone in the Cash Value Milestones editor is now entered
  as two side-by-side sub-blocks, "Level Death Benefit" and "Increasing Death Benefit" (Cash
  Value + Death Benefit each), so an advisor pulling numbers off a carrier's own side-by-side
  illustration can enter both at once. Added `cvIncreasing?`/`dbIncreasing?` as new optional
  fields on `CashValueMilestone` (`illustration.ts`) — additive, existing
  `cvNonGuaranteed`/`dbGuaranteed` keep serving as the "Level" track so nothing about the
  original per-product Illustration flow (Guaranteed/Non-Guaranteed) changes or reads these new
  fields. The PDF's milestones table grew from 3 columns to 5 (blank / Cash Value Level / Cash
  Value Increasing / Death Benefit Level / Death Benefit Increasing), and both charts (cash value
  and death benefit) now plot two series with a small legend — Level as a solid line, Increasing
  as a dashed line — copied from the same dual-series pattern the original per-product PDF
  already used for Guaranteed vs. Non-Guaranteed, to keep the visual language consistent and
  minimize risk of a new bug. The "DEATH BENEFIT OVER TIME (GUARANTEED)" chart title was
  shortened to "DEATH BENEFIT OVER TIME" since it's no longer a guaranteed-only view.
  **Known side effect, worth knowing about**: the wider table header and taller gold callout make
  a typical cash_value scenario PDF taller than before — even an ordinary 3-milestone scenario
  with no notes now runs long enough that the "Prepared by" advisor line and the legal disclaimer
  spill onto their own second page instead of sharing page 1. This was a real bug in an earlier
  pass tonight — the disclaimer either overlapped the advisor line or vanished off the bottom
  edge in some cases — now fixed with a proper page-break: once there's no longer room for both
  blocks before the page bottom, jsPDF starts a fresh page for them rather than squeezing or
  clipping. Verified with rendered PDFs for both a short/typical case and a long-Notes case —
  both now show the advisor line and disclaimer cleanly on their own page, nothing overlapping or
  cut off. No SQL needed — `cvIncreasing`/`dbIncreasing` live inside the existing `data` JSONB
  column on `illustration_scenarios`, same as every other additive scenario field tonight.

- **Illustration Scenario — Policy Premium section added (Monthly Premium + Minimum to Avoid
  Lapse) — built 9/1.** Karina wanted a picture of what the client actually pays vs. the bare
  minimum that keeps the policy from lapsing, for a scenario she needed to send out that night.
  She initially considered putting it next to Face Value but decided against it — different
  topic, deserves its own section — so it's a new standalone "Policy Premium" section in
  `ScenarioForm.tsx` (cash_value products only), sitting between Death Benefit Increase and
  Milestones, with two optional DollarInput fields: Monthly Premium and Minimum to Avoid Lapse.
  The "Minimum to Avoid Lapse" label matches the existing wording on the Products tab
  (`client_products.minimum_premium`) for consistency. Stored as `monthlyPremium` /
  `minimumPremium` on the shared `CashValueIllustration` type in `illustration.ts` — optional
  and additive, same pattern as Initial Death Benefit and Death Benefit Increase, so the
  original per-product Illustration flow is unaffected. Shows on the Scenario PDF
  (`generateScenarioIllustrationPDF`) as a small "POLICY PREMIUM" block right after the Death
  Benefit Increase callout and before the milestones table. No SQL needed — this is all stored
  inside the existing `data` JSONB column, same as every other scenario field.

- **Illustration/Scenario PDFs — dollar figures now always show commas, no matter who typed
  them — built 9/1.** Karina sent a PDF another advisor generated (Royal Hammock, Accumulation
  IUL via Ethos) where every number was missing commas — `$153661` instead of `$153,661` — and
  said "everythg needs to be same across all advisors and my account." Root cause: Cash Value,
  Death Benefit, Initial Death Benefit, Premium, and Income fields on both the Illustration and
  Scenario forms are all plain free-typed `DollarInput` fields (see that component's own
  comment — no forced formatting by design, just a `$` shown next to the box) — so whether a
  number ends up with commas has only ever depended on whether that particular advisor happened
  to type them. Rather than trying to make every advisor type the same way, fixed it where it
  actually matters — the generated PDF — by always re-formatting every dollar value through a
  new `formatMoney()` helper (`illustration.ts`) at the moment the PDF is drawn, regardless of
  how it was typed or already saved. `$153661` and `$153,661` and `$153,661.00` all render as
  `$153,661` now (cents are kept only if actually entered, e.g. `$1,234.50`). Applied to every
  dollar figure across both `generateIllustrationPDF` and `generateScenarioIllustrationPDF` —
  milestone tables, Initial Death Benefit, Initial Premium, and the "$X level premium" callouts.
  Nothing stored changes and no SQL is needed — this only touches how numbers are drawn onto the
  PDF, so it fixes every existing illustration retroactively the next time its PDF is
  (re)generated, not just new ones. Chart axis labels ($500K etc.) were already computed from
  the parsed number, not the raw typed string, so they weren't affected by this bug.

- **Advisor data isolation — Admin no longer sees every advisor's clients — built 9/1.** Karina
  noticed one of her advisors' leads showing up in her own portal and flagged it as wrong:
  "peoples leads should not show up in each others leaders." I checked and this wasn't a bug —
  it was the original, deliberate design: `role = 'admin'` on a profile meant two things at
  once — (1) can invite/manage the team from `/admin/invite`, and (2) bypasses every
  client-ownership check in RLS to see and manage every advisor's clients, notes, tasks,
  reminders, analyses, financial plans, products, meetings, and illustrations. I laid out three
  options; Karina explained the reasoning that settled it: her advisors are independent agents
  operating under her brokerage, not employees, so each advisor's book of business is legally
  and practically their own — nobody else, including her logged in as Admin, should be able to
  browse into it. Built option 3, full lockdown: removed the admin-bypass clause from all 10
  RLS policies that gate client-owned data (`clients` ×2, `client_notes`, `client_tasks`,
  `reminders`, `client_analyses`, `client_financial_plans`, `client_products`,
  `client_meetings`, `product_illustrations`, `illustration_scenarios`) — every one of them now
  checks `owner_id = auth.uid()` (or `agent_id = auth.uid()` for reminders/meetings) with no
  role-based exception at all. Admin keeps ability (1) — inviting and managing the team is
  untouched, only the client-visibility bypass is gone. Updated the explanatory copy on
  `/admin/invite` (used to say making someone Admin gave them "full access to every client" —
  no longer true, now says Admin only adds team management). Deliberately left
  `advisor_credentials` alone (NPN/carrier codes — back-office compliance data, not book of
  business, and arguably something Karina as brokerage owner should still be able to see) and
  `calendar_connections` alone (never had an admin bypass to begin with). This is a real
  security/schema change — see the delivery message for the exact SQL to run in Supabase
  BEFORE uploading the code, since the data each advisor can see changes the moment the
  policies update.

- **"+ Add Illustration" Product field simplified to match "Add Product"'s picker — built 9/1.**
  Karina compared screenshots of the two side by side: "Add Product" (`ProductsSection.tsx`,
  pre-existing) is one free-typed "Product name" field with a native `<datalist>` of suggestions
  — type or pick, no separate carrier/grouping step. The Illustrations picker I'd built earlier
  tonight was a two-step "Product" dropdown (grouped by carrier) plus a separate Product Name
  field below it — more clicking than Add Product needs. Rebuilt `ScenariosSection.tsx` to match:
  one "Product name" field with an `<datalist id="illustration-product-suggestions">` built from
  `KB_PRODUCTS`. Kept the Carrier/Type auto-fill from earlier (Add Product's own datalist doesn't
  auto-fill anything, but Karina never asked for that to go away) — it now fires off an exact
  match on the typed/picked name instead of a dropdown selection. Functionally: same 44 products,
  same real-underwriter-for-Ethos-products carrier logic, just one field instead of two.

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

- **Policy number on Products — built 9/3.** Karina, looking at a client's Products card:
  "I think we should have a section on this product thing for a policy number." Once a product
  is actually issued, the policy number is what you'd reference calling the carrier for service
  or claims — there was nowhere to record it. Added `client_products.policy_number` (freeform
  text, optional — a quote/application doesn't have one yet), a "Policy number (once issued)"
  field on both the Add Product and Edit Product forms (`ProductsSection.tsx` / `ProductRow.tsx`),
  and a "Policy # ..." line on the product card itself, right above the Issued/Expires line, with
  the same hover-to-copy icon used for carrier login numbers on My Profile — a policy number is
  exactly the kind of thing you're reading off a screen mid-call with a carrier.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_policy_number.sql`.
  **Update 9/3**: while looking at this, Karina flagged that the Face Amount / Premium pair on
  both the Add Product and Edit Product forms only ever had placeholder text ("Face amount",
  "Premium") — placeholder text disappears the moment a value is typed, so once a product had
  real numbers saved, editing it again showed two plain "$" boxes with no way to tell which was
  which (unlike Minimum to Avoid Lapse, which has a real label above it). Added the same kind of
  persistent label above each field on both forms. Also checked the comma-formatting question she
  raised in the same message — `DollarInput` formats commas in on blur (tab/click away), by
  design, not while actively typing (avoids cursor-jumping bugs); what she was seeing was that
  behavior working correctly, not a bug — nothing changed there.

- **Auto-reminder before a "convertible without exam" deadline — BUILT 9/3.** Looking at a
  product's conversion deadline field, Karina asked whether the advisor could get a reminder as
  that date approaches rather than needing to notice it themselves — floated 30 or 60 days out;
  went with my recommendation of 60 (more real runway than 30, since a no-exam conversion can
  involve carrier paperwork and back-and-forth). Built the same shape as the existing 18th-
  birthday cron: new daily cron `src/app/api/cron/check-conversion-deadlines/route.ts` (added to
  `vercel.json`, offset an hour from the birthday check to avoid both firing at once) finds every
  product whose `conversion_deadline` falls within the next 60 days and hasn't already gotten a
  reminder, and creates one automatically (`"[Product] ([Client]) can only convert... until
  [date] — 60 days out."`). New `client_products.conversion_reminder_sent` boolean (same one-
  time-only pattern as `clients.turned_18_notice_sent`) stops it from creating a fresh reminder
  every day the deadline is still approaching.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_conversion_reminder.sql`.
  Note for Karina: Vercel's Hobby plan has historically limited free projects to a small number
  of cron jobs / daily-only schedules — this is now the 2nd cron job on the project (the
  birthday check was the 1st). If the deployment errors or the new cron doesn't show up under
  Vercel's Cron Jobs tab after this deploys, that's almost certainly a plan limit, not a bug —
  worth a quick look there after applying this.
  **Second pass, BUILT 9/3: final (exam-required) conversion deadline + no-exam-declined
  tracking.** Follow-up to the "still open" note above. Karina described two more things: (1) a
  way to track where a policy is in the conversion process ("stays organized," not just the
  auto-reminder) — when asked simple-status-tag vs. product-to-product linking, she leaned
  simple and wasn't sure herself ("I have never done a conversion yet... I don't know what do you
  think"); (2) a way to record that the no-exam window was specifically missed/declined, with a
  date, and a way to set a follow-up reminder for the later exam-required conversion window (her
  example: "5 years no exam and convert until age 75"). Her second answer redirected this toward
  a concrete ask: the advisor should be able to input the no-exam conversion date AND a final
  conversion deadline directly.
  Built the concrete, simple version her own answers pointed to — plain date fields, matching how
  the rest of this form already works — and deliberately did NOT build the vaguer "conversion
  pipeline / mark as converting" status tag, or product-to-product linking when a policy actually
  converts: both were the parts she was genuinely unsure about, and her own instinct (a converted
  policy just becomes a new Product entry, same as adding any product today) already covers what
  she described needing in practice, without a new linking mechanism.
  Two new fields on `client_products`: `final_conversion_deadline` (date — the absolute,
  exam-required cutoff after the no-exam window closes) and `no_exam_declined_at` (date — records
  that the no-exam window was specifically missed/declined, rather than just letting the date
  quietly pass). Both editable on the Add and Edit Product forms (`ProductsSection.tsx` /
  `ProductRow.tsx`), next to "Convertible without exam until," and shown on the product card: a
  "No-exam window declined [date] — exam required to convert until [date]" note when
  `no_exam_declined_at` is set, plus the status badge itself (`getProductStatus`,
  `src/lib/products.ts`) now accounts for both fields — e.g. "Convertible — exam now required
  (until [final date])" once the no-exam window passes but a final deadline is on file, or
  "Conversion window closed" once that final deadline itself passes.
  The existing conversion-deadline cron (`check-conversion-deadlines/route.ts`) was extended to
  also watch `final_conversion_deadline`, using its own one-time flag
  (`final_conversion_reminder_sent`) so it fires independently, same 60-day-out heads-up as the
  no-exam reminder, worded for the final deadline instead.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_final_conversion_tracking.sql`.

- **Conversion Pending / Converted — workflow status on Products, BUILT 9/3.** Karina asked what
  happens once a conversion date is coming up and the client actually says yes: is there
  something to click so it moves to its own section on the client's product list, distinct from
  a normal Issued policy the advisor doesn't need to check in on often? Confirmed the design with
  her via two quick questions before building: a manual "Mark as Conversion Pending" button
  (nothing automatic — only a human knows the client agreed), and once the new permanent policy
  is actually issued as its own separate Product (per the earlier no-linking decision), the
  advisor clicks "Mark Converted" to archive the old term product out of the way rather than
  deleting it.
  Two new timestamp fields on `client_products`: `conversion_pending_at` and `converted_at`, both
  manual (not cron-derived, unlike every other date field on Products). New actions in
  `clients/actions.ts`: `markConversionPending`, `undoConversionPending`, `markConverted`,
  `undoConverted` — each a plain one-field update plus `revalidatePath`, undo included both places
  in case of a misclick.
  On `ProductRow.tsx`: while pending, the card gets a gold border/background, a "Conversion
  Pending" badge (replacing the normal date-based status badge, which is less relevant once
  you're actively mid-conversion), a "Conversion pending since [date] — check in with the client"
  line, and "Mark Converted" / "Undo" actions next to Edit/Delete. Once converted, the card is
  dimmed with a muted "Converted [date]" badge and just an "Undo" action.
  On `ProductsSection.tsx`: the product list is now grouped into three sections — Conversion
  Pending at the top (its own labeled group, so it's the first thing the advisor sees), the
  normal active list in the middle (unchanged from before), and Converted collapsed behind a
  "Show converted (N)" toggle at the bottom so old, resolved conversions don't clutter the list
  but stay on file.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_conversion_pending_status.sql`.
  **Update 9/4: "is this convertible" flag, so non-convertible products stop showing conversion
  fields/actions at all.** Karina flagged a juvenile IUL card (not a term product, no conversion
  window at all) still showing a "Mark Conversion Pending" action and all the conversion date
  fields on the Edit form — "since not every product is convertible... too much clutter." Added a
  plain checkbox, "This product can convert to a permanent policy," on both the Add and Edit
  Product forms — unchecked by default, and the four conversion-related fields (no-exam deadline,
  final conversion deadline, no-exam-declined date, conversion notes) only appear once it's
  checked, rather than always showing on every product. New `client_products.is_convertible`
  boolean now also gates the "Mark Conversion Pending" action on the card — it no longer shows on
  a product that isn't marked convertible.
  Backfilled automatically for existing data: any product that already had conversion info on
  file (deadline, final deadline, no-exam-declined date, or was already Pending/Converted) gets
  the flag turned on as part of the migration, so nothing already in use silently disappears —
  only genuinely non-convertible products (like the IUL in her screenshot) lose the clutter.
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_is_convertible_flag.sql`.

- **Policy anniversary check-in reminder — flagged 9/3, needs more thought, NOT built.** Separate
  idea Karina raised in the same message: once a policy is issued, should the system proactively
  remind the advisor to check in around each policy anniversary (she floated ~1 year), rather
  than relying on the advisor to set their own manual reminder? She talked herself partway out of
  it in the same message ("I don't know how we should put that feature in... we need to think on
  that one more") — explicitly logged for later review, not a build order. Open questions for
  when this comes back up: is the anchor date `issue_date` (already on every product) or
  something else; does every product get this automatically or is it opt-in per policy; does it
  repeat every year indefinitely or just once; and how it should read on the reminder itself (a
  generic "annual check-in" vs. something that references the specific policy). Likely the same
  cron + flag shape as the other two date-based reminders on Products, but "fires every year, not
  just once" is new and needs its own design (the existing `*_reminder_sent` boolean pattern only
  fires once ever).

- **Nationwide product lineup — 17 missing Knowledge Base entries added, built 9/3.**
  Karina sent a screenshot of Nationwide's full 19-product list and asked why only 2 were in
  the Knowledge Base. Confirmed the Knowledge Base is a static file (`src/lib/kb-data.ts`),
  not a database table, so this is a pure content/code change — no SQL migration, nothing
  for Karina to run in Supabase. Researched all 17 missing products (5 parallel research
  passes, each told to cite sources and explicitly flag anything it couldn't verify rather
  than invent a number) and added them in the app's existing entry format:
  - IUL: Indexed UL Protector II 2020, Survivorship Indexed UL 2020, YourLife Indexed UL
    Accumulator.
  - Term: 10/15/20/30-year Term GLT (four separate entries — note the 30-year's conversion
    privilege ends at year 20, not the full term, unlike the shorter GLTs).
  - Whole Life: 20-Pay Whole Life, Heritage Single Premium Whole Life, Whole Life 100.
  - LTC hybrids: CareMatters II, CareMatters Together, and CareMatters Annuity — this last
    one is on an annuity chassis (not life insurance) unlike the other two, so underwriting
    is generally lighter; filed under the Annuities group next to the other Nationwide
    annuities instead of with the life products.
  - UL/VUL: No-Lapse Guarantee UL II, Survivorship VUL II, VUL Accumulator, VUL Protector II.
  - Also corrected the existing "Nationwide YourLife IUL Protector" entry along the way
    (renamed to match Nationwide's actual current name, YourLife Indexed UL Protector) — it
    had one bullet conflating two separate riders (a Long-Term Care Rider and a Premium
    Waiver Rider) into one; split them into two accurate bullets.
  - Worth a sanity-check on your end before this reaches agents: none of the figures above
    are fabricated (research was explicitly told to say "could not verify" instead of
    guessing), but products like this get repriced/updated by carriers periodically —
    caps, minimums, elimination periods and similar numbers are worth confirming against a
    current Nationwide illustration/spec sheet before an agent quotes off of them, same as
    with any Knowledge Base entry.
  No schema change, `npm run lint` / `npm run build` both clean.

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

- **Better home page — BUILT 9/3.** See "New Home Page — snapshot dashboard" near the top of
  this file for the full writeup; moved out of low-priority once Karina actually described what
  she wanted.

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
