# Backlog

Things Karina has asked to defer to a future build, so they don't get lost.

## ⚠ Needs Testing — built, but NOT yet verified by Karina

- **"Resend Invite" for pending advisors — BUILT 9/9, genuinely unverified against a live
  Supabase project, please test with a real pending invite the first chance you get.** Karina:
  "can we have a resend invite option on pending people because they may have not gotten the
  email or accidentally deleted it or it has expired... if that's not an option, then I guess
  we'll have to delete and resend it that way." New "Resend Invite" button on any row still
  showing "Invite Pending" on the Invite Advisor page. Two things make this one worth testing
  before relying on it: (1) Supabase's own docs don't clearly say what happens when you invite
  the same not-yet-confirmed email a second time — some reports online say it just resends
  cleanly, others say it errors "already registered" — so this tries that first and, only if it
  errors, falls back to generating a fresh token itself and emailing it through Resend
  (`src/lib/email.ts`); (2) that fallback path only works once `RESEND_API_KEY` and
  `REMINDER_FROM_EMAIL` are actually set in Vercel (see the 9/9 notification-prefs delivery — not
  confirmed set up yet). If you click Resend Invite and it shows an error instead of "Sent ✓",
  that's this surfacing honestly rather than silently doing nothing — Remove Access, then
  re-invite from scratch, is still the reliable fallback exactly like you described. **No new
  SQL.**

- **"Restore access" un-ban — flagged 9/6, Karina knows and does not plan to test right away.**
  Part of the Advisor Remove Access + client reassignment feature (full writeup under
  "Requested" below). "Remove access" (ban an advisor's login) has no reason to be broken — it's
  the same shape as other admin actions already in use. The one piece that's genuinely unverified
  is the UNDO: "Restore access" sends `ban_duration: "none"` to Supabase's admin API to clear an
  existing ban, which is Supabase's documented way to do it, but this could not be tested against
  a live Supabase project from this session. If "Remove access" is ever used on a real advisor and
  then undone with "Restore access," confirm that advisor can actually log back in — if `"none"`
  doesn't behave as documented, the fix is straightforward (a separate code path is needed) but
  someone would be stuck locked out until it's caught. Karina has been told and is intentionally
  not testing this right away — leaving this flagged here so it isn't forgotten later.

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
  **Update 9/4: commas now also show the moment a field first loads, not just after a blur.**
  Karina caught that opening Edit on a Product showed the saved Face Amount as "227009", no
  commas, until she clicked into the field and blurred it — because the fix above only kicked in
  when a value CHANGED after the component was already on screen; the very first render (loading
  a saved value straight in) never went through that path at all. "I need commas all of the time
  everywhere." Fixed so the value a `DollarInput` starts with — and any later genuine external
  reset, e.g. Cancel restoring the saved value — is formatted immediately, the same way blur
  already does. The tricky part: this component's own onChange also feeds the value right back
  down as a prop (the normal controlled-input round trip), and that echo must NOT get reformatted
  or every keystroke would fight the cursor again, undoing the whole point of the 9/2 fix. Handled
  by having the input's own change/blur handlers mark that round-tripped value as "already
  synced," so only a value that arrives WITHOUT having come from this component's own typing gets
  reformatted.
  Re-verified with the same real-component-in-a-browser approach as 9/2 (esbuild + Playwright,
  temporary scaffolding, not part of any delivered zip): confirmed a value loaded straight in
  (e.g. "227009") displays formatted immediately with no interaction; confirmed typing more
  digits at the end AND at the start of an already-formatted value doesn't reformat mid-keystroke
  (each keystroke lands exactly where typed, no jump); confirmed blur still formats correctly and
  the formatted value is what reaches the parent's `onChange`; and confirmed an external reset
  (simulating Cancel) reformats immediately too. No schema change, no SQL — this is entirely
  inside the one shared `DollarInput.tsx` component, so it reaches every dollar field in the app
  the same way the original 9/2 fix did.

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
  **Update 9/4: checkbox wording fixed.** Karina caught that "This product can convert to a
  permanent policy (e.g. a term policy)" read backwards — the "e.g." landed on the destination
  (permanent) side of the sentence when the example (term) belongs on the source side. Reworded
  to "This is a term (or otherwise convertible) policy that can convert to permanent coverage" on
  both the Add and Edit forms. Copy-only change, no schema/logic touched.
  **Update 9/4: Term end date + a dedicated "Term" tab, so every term policy — convertible or
  not — gets tracked and worked in one place, soonest-expiring first, BUILT 9/4.** Karina, looking
  at the convertible section: a 30-year term needs its own end-of-term date tracked too (not just
  the conversion-window dates), and term policies in general should be tagged and filterable on
  Clients so an advisor can pull up every client with a term policy, ordered by what's expiring
  first, to shop new coverage or just touch base — with a way to mark "already reached out" so a
  contacted policy moves out of the queue without disappearing. Worked through the design with her
  (a false start — an alternate "tag by Product Type" approach turned out to contradict what she
  actually wanted — she then sent a full, concrete spec in one message, which this follows exactly):
  the `is_convertible` checkbox now broadly means "this is a term policy" (convertible into
  something else, or not) rather than narrowly "this converts" — relabeled "This is a term policy
  (convertible or not)." Two of the three existing date fields inside that checkbox's block were
  renamed for clarity: "Convertible without exam until" → "Convertible without medical exam
  until," and "No-exam window missed/declined on" → "No-exam window declined by client." A new
  4th field, "Term end date (for a non-convertible policy)," was added inside the same block but
  visually separated below a divider under an "Or, if it doesn't convert" label, since it's a
  different kind of policy than the other three fields describe. New `client_products.term_end_date`
  column (plain nullable date, same pattern as the other date fields).
  All term policies — with or without a medical-exam conversion window, or plain non-convertible
  term — now show up together on a new "Term" filter chip on the Clients page (only appears when
  at least one exists), which switches the page into two lists: "Needs Outreach" and "Already
  Touched Base," both sorted by whichever of the three possible dates (no-exam deadline, final
  conversion deadline, term end date) is soonest and still upcoming. Each row has a "Mark Touched
  Base" button (new `term_contacted_at` timestamp, per-policy, with an "Undo") that moves it into
  the Touched Base group without deleting or losing track of it — matching the same "clicked by a
  human, not automatic" pattern as Conversion Pending. Rows within 30 days show a red "critical"
  badge, within 60 days an amber "soon" badge, per Karina's "red tab or something... this is high
  level, check this."
  Also added a new "Time-Sensitive Term" card on the home dashboard — a full-width banner above the
  existing 4-card grid, since this needs to be seen immediately rather than buried as a 5th tile.
  It turns red/alert styled once there's at least one term policy within 60 days that hasn't been
  touched base on yet, shows the count and up to 3 preview rows (client, product, and the date
  that's driving the urgency), and links straight into the new Term tab — per Karina's "we should
  probably add another box... so it doesn't get missed."
  SQL needs to be run against Karina's live Supabase project — see
  `migration_add_term_outreach_tracking.sql`.
  **Open questions raised 9/4 while testing, being resolved via AskUserQuestion before next
  build pass:**
  1. Redundant date field. Karina noticed the product form asks for the same "when does this
     policy end" date twice — the generic "Expiration date" up top (next to Issue date, present
     on every product) and the new "Term end date (for a non-convertible policy)" field lower
     down, and only the second one feeds the Term tab/dashboard. Proposed fix: once "This is a
     term policy" is checked, hide the top "Expiration date" field and replace the "Term end
     date (for a non-convertible policy)" field with a single "Term expiration date" field that
     applies whether or not the policy converts (a term has one real end date regardless).
     Non-term products keep the top "Expiration date" field unchanged.
  2. "Mark Conversion Pending" clutter. Karina flagged that the action shows up on every
     convertible product's card the moment it's saved, even one decades from its deadline (her
     test product expires 2055). Options discussed: only show it once the policy is within the
     same 60/30-day urgency window the Term tab uses (still reachable early via Edit), keep it
     always visible but visually deprioritized, or leave as-is.
  **Resolved and BUILT 9/4** via AskUserQuestion:
  1. **Consolidated the date field.** The top "Expiration date" field now hides itself the
     moment "This is a term policy" is checked, on both the Add and Edit forms. In its place,
     the term block's first field is now "Term expiration date" (renamed from "Term end date
     (for a non-convertible policy)"), applying whether or not the policy converts — the "Or, if
     it doesn't convert" divider is gone, since it's no longer a non-convertible-only field.
     Checking the box live copies whatever was already typed into Expiration date over to Term
     expiration date automatically, so nothing typed gets lost mid-entry. For any term product
     saved before today that only has the old Expiration date filled in (not the new field),
     every read path — the status badge, the "Expires ..." line on the card, and the Term tab/
     dashboard milestone calculation — falls back to that existing value automatically, so
     nothing needs to be manually re-entered across her existing book. No schema change; both
     `expiration_date` and `term_end_date` columns stay as they are, this is purely a UI/read
     consolidation.
  2. **"Mark Conversion Pending" restyled, not gated.** Karina chose to keep it always available
     (a client can ask to convert well ahead of any deadline) but made it visually match the
     neutral Edit/Undo styling instead of the gold accent it had, so it no longer reads as a
     highlighted call-to-action on every convertible product regardless of timing.

- **Annuity products get their own field set — flagged 9/4, BUILT 9/4.** Karina, testing with a
  mock annuity: Issue date/Expiration date/Policy number are fine as-is, but "This is a term
  policy" obviously doesn't apply, and Face amount/Premium don't fit either — annuities can have
  periodic contributions (e.g. every quarter or six months) but otherwise work very differently
  from a life insurance product. Riders need to change too — the life-insurance checklist
  (Accelerated Death Benefit, etc.) doesn't apply. Researched common annuity riders and the IRS's
  age 59 1/2 early-withdrawal rule (sources below) before building, since neither was something
  to just guess at.
  The Add/Edit Product form now branches on Product Type = "Annuity" (it was already a dropdown
  option, so no new checkbox needed) the same way it already branches on the term checkbox:
  - The "This is a term policy" checkbox and its whole block disappear for an Annuity — switching
    Product Type to Annuity also force-clears `is_convertible` if it was checked, so a product
    can't be both.
  - Face amount and "Minimum to avoid lapse" disappear (neither is a real annuity concept).
    Premium is kept but relabeled "Initial premium / contribution" — an annuity's premium is
    genuinely the same real-world concept (money paid in), so no new column needed there.
  - A new annuity-only block appears: "Ongoing contribution" + a frequency picker
    (monthly/quarterly/every 6 months/annually) for a flexible-premium contract, "Current
    contract value" (a manually-updated snapshot — annuities don't carry a face amount the way
    life insurance does), and "Surrender period ends" (the carrier's own early-withdrawal penalty
    window — separate from the IRS's, below). The read-only card shows all three, with the
    surrender date getting light red/amber coloring inside 30/60 days as a heads-up (same
    language as the Term tab's urgency, but not yet wired into its own outreach queue — see "not
    built this pass" below).
  - Riders swap to an annuity-specific checklist: Income Rider (GLWB), Guaranteed Minimum Income
    Benefit (GMIB), Death Benefit Rider, Return of Premium (ROP) Rider, Long-Term Care/Nursing
    Home Rider, Terminal Illness Waiver, Cost-of-Living Adjustment (COLA) Rider — same
    checkbox-plus-custom-input pattern as life insurance's list, just a different set
    (`RidersField.tsx` now takes an optional `commonOptions` prop instead of hardcoding one list).
  Also built: a new daily-cron milestone for the IRS's 59 1/2 rule Karina flagged — annuity
  withdrawals taken before a client turns 59 1/2 carry a 10% IRS penalty on top of ordinary income
  tax, so once a client who holds at least one Annuity product turns 59 1/2, the advisor
  automatically gets a reminder that the penalty no longer applies. Reuses the exact same
  daily-cron/one-time-flag shape as the existing 18th-birthday check
  (`turned_18_notice_sent`/`turned_59_half_notice_sent`), just added into the same
  `check-birthdays` route rather than a new cron job, plus a new `isHalfBirthdayToday` helper in
  `lib/family.ts` since 59 1/2 isn't a whole-year birthday like the rest of that file assumes.
  New columns: `client_products.annuity_contribution_amount`, `annuity_contribution_frequency`,
  `contract_value`, `annuity_surrender_end_date`, and `clients.turned_59_half_notice_sent`. SQL
  needs to be run against Karina's live Supabase project — see `migration_add_annuity_fields.sql`.
  **Not built this pass, deliberately kept simple for a first round of testing**: the surrender
  date is shown with urgency coloring on the card, but doesn't have its own outreach queue the
  way Term does (no "Annuity" tab, no dashboard banner) — Karina can decide after testing whether
  that's worth building the same way once she's seen the basic field set in use. Riders are a
  general industry list researched for this build, not pulled from her specific carriers
  (Athene, Nationwide, etc.) — she said she'd look into the exact ones her contracts carry and
  we'd adjust the checklist together.
  Sources used for the rider list and the 59 1/2 rule: [A Guide to Fixed-Indexed Annuity Riders
  – RMD Financial Group](https://rmdfinancialgroup.net/a-guide-to-fixed-indexed-annuity-riders/),
  [Annuity Riders: Types, Benefits & Considerations –
  RetireGuide](https://www.retireguide.com/annuities/riders/), [What Is the 59 1/2 Rule? IRA
  Withdrawal Penalties – myannuitystore.com](https://myannuitystore.com/retirement-planning/59-half-rule/).
  **Update 9/4: Expiration date hidden for permanent product types too, BUILT 9/4.** Karina,
  looking at a Final Expense (whole life) product: that field doesn't apply there either, or on
  Whole Life or IUL — none of those expire the way term life does. Hidden the same way it's
  already hidden for a term policy and an annuity, for product_type in {Whole Life, IUL, Final
  Expense} — on both the Add and Edit forms, and on the read-only card (so a legacy record that
  happened to have an old expiration_date on file from before this feature won't show a
  now-meaningless "Expires ..." line either). Left showing for "Other" and a blank/unselected
  type, since it's unknown what those actually are. New `PERMANENT_PRODUCT_TYPES` constant in
  `lib/types.ts` — no schema change.

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

- **Reminder delivery preference (email / text / both) — flagged 9/5, just an idea, NOT built.**
  Karina wants an option, at some later date, for an advisor to choose how they want to be
  notified of a reminder — email, text, or both — rather than one fixed way. Worth noting for
  whenever this comes back up: `reminders.channel` already exists in the schema as a single
  `"email" | "sms"` value, but nothing in the app actually sends an email or text today —
  reminders are purely an in-app list (the Reminders page and the dashboard's Reminders Due
  card). So this isn't just a preference toggle; it would mean building actual outbound
  email/SMS delivery first (a provider to send through, likely a cron job checking `remind_at`),
  then layering the advisor's channel choice on top — probably widening `channel` to allow
  "both," per-advisor or per-reminder. No design work done yet, just capturing the idea.

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

- **Manage / remove advisors — BUILT 9/6, SQL REQUIRED.** See the full writeup further down
  ("Advisor Remove Access + client reassignment") — the "Remove" action asked for here is done.

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

- **Search on the Clients list — BUILT 9/5.** Karina: the list isn't in alphabetical order, and
  even if it were, it'll only get harder to scan as her book grows — she wanted to start typing a
  client's name and have the list narrow down live as she types. New `ClientSearchList.tsx`
  (client component) wraps the "All clients"/stage/Needs Review list — a search box above it
  filters by `full_name` on every keystroke, entirely client-side (no page reload per keystroke,
  since the list is already loaded and she doesn't have that many clients yet for it to matter
  performance-wise). Distinguishes "no clients yet" from "no clients match your search" so the
  right empty-state message shows. Scoped to the main list only — the Term view on this same
  page has its own different (grouped, not flat) layout, so it wasn't touched. No schema change,
  no SQL to run.

- **Family relationship — one-directional fix — BUILT 9/5.** Karina's question: when adding a
  family member from someone's profile, which end of the relationship do you type in, and does
  the system show the relationship from both sides (mom's page shows "Child", child's own page
  shows "Parent")? Confirmed it did NOT — `clients.family_relationship` is a single flat field
  per client row, and both "Link Existing Client" and "Add New Person" only ever wrote it onto
  the OTHER person's row (the one being linked/added in), never back onto the profile you were
  on. So a child's own page never showed their mom as "Parent" unless someone happened to also
  edit the child's row directly.
  - **Fix:** both flows now also write the relationship back onto the profile you're linking
    from — but only when that profile's own `family_relationship` field is still blank, so it
    never overwrites an existing role (needed for a family group of 3+ with mixed relationship
    types, e.g. someone who's already "Parent" to one child shouldn't get clobbered when a second
    child is added). New `inverseRelationship()` helper (`src/lib/family.ts`) auto-fills the
    other side for the four standard types: Spouse↔Spouse, Child↔Parent, Parent↔Child,
    Sibling↔Sibling.
  - **The "Other" question** ("when other selected should we type in the relationship or just
    leave it?"): "Other" and any other free-text relationship (e.g. "Stepchild") has no single
    reliable auto-inverse, so a second, optional field now appears — only when the typed
    relationship isn't one of the four standard types — asking how the profile you're on relates
    back to the person being added (e.g. "And Karina's Client is their…"). Leaving it blank is a
    valid choice: the profile you're on just keeps no relationship recorded for that link, same
    as today.
  - Also clarified the existing relationship field's placeholder text on both forms to spell out
    the direction ("This person is [Client]'s… e.g. Spouse, Child") — directly answering the
    "which end of the relationship is it" confusion, independent of the write-back fix.
  - `FamilySection.tsx` now takes a `clientName` prop (the profile you're on) to build these
    labels. No schema change, no SQL to run — `family_relationship` already exists on `clients`.

- **Illustration Summary polish — BUILT 9/5.** Two small fixes while Karina was testing the
  Illustration Scenario builder:
  - The Death Benefit Increase callout (and its matching line on the generated PDF) said the
    Level/Increasing election "can be changed at any time by calling us" — should say the carrier,
    since it's the insurance company the policy is placed with that the client would actually
    call, not the advisor's own office. Reworded to "by calling the carrier" in both the on-screen
    text (`ScenarioForm.tsx`) and the PDF (`illustration-pdf.ts`).
  - New **View Summary** button next to Download PDF Summary, on both the Scenario builder and
    the per-product Illustration form — opens the same PDF in a new browser tab (the browser's
    built-in PDF viewer) instead of saving a file to disk, for a quick glance without a download
    every time. `generateIllustrationPDF`/`generateScenarioIllustrationPDF` (`illustration-pdf.ts`)
    both take a new optional `"download" | "view"` argument (defaults to `"download"`, so nothing
    else changes) — `"view"` opens `doc.output("bloburl")` in a new tab instead of calling
    `doc.save()`.
  - No schema change, no SQL to run.

- **Illustration Scenario cleanup — BUILT 9/5.** More feedback from Karina while testing:
  - **"Compare to a second premium" removed entirely.** This was the 9/2 feature that opened up a
    third "at $X/mo" column across the Policy Premium section, the Milestones table, and both
    charts. Karina's call: the comparison she actually wants is Level vs. Increasing, not a
    second premium — so the whole premiumB/cvPremiumB/dbPremiumB feature (and its columns/legend
    entries) is gone from `ScenarioForm.tsx`, `illustration-pdf.ts`, and the
    `IllustrationData`/`CashValueMilestone` types in `illustration.ts`. Monthly Premium is back to
    a single field. Any already-saved scenario that has old premiumB data sitting in its JSON
    `data` column just has it silently ignored now — nothing to migrate, no SQL to run.
  - **Researched: does "Minimum to Avoid Lapse (Increasing)" actually rise every year?** Karina
    wasn't sure. Short answer: yes, generally, and more so than under Level. An Increasing death
    benefit keeps the policy's net amount at risk at the full face amount for the life of the
    policy (Level's net amount at risk shrinks as cash value builds up), and cost-of-insurance
    rates also climb with attained age regardless of election — the two compound under Increasing,
    so the minimum premium needed to avoid lapse typically keeps climbing rather than leveling
    off, unlike Level where growing cash value can eventually offset the rising age-based rate.
    Added a short note under the field in the editor and a matching one on the generated PDF next
    to "Minimum to Avoid Lapse (Increasing)," flagging that this isn't a fixed number and to
    confirm the actual year-by-year schedule against the carrier's own illustration.
    Sources: [Universal Life Insurance Death Benefit Options A vs B Compared](https://theinsuranceproblog.com/universal-life-insurance-death-benefit-options/),
    [Universal Life Insurance: Flexible Premiums, Option A vs B](https://legalclarity.org/universal-life-insurance-flexible-premiums-option-a-vs-b/),
    [Universal Life Insurance Expenses: The Complete Breakdown](https://theinsuranceproblog.com/universal-life-insurance-expense-breakdown/).
  - **Update 9/6: re-verified, then softened, since this note is client-facing (it's on the PDF).**
    Karina wasn't sure it was all true and asked us to check before trusting it. Re-researched
    against independent sources beyond the original two blog posts — confirmed the same
    net-amount-at-risk mechanics from an insurance-technical explainer
    ([Hazard & Handling](https://hazardandhandling.com/posts/how-age-affects-cost-of-insurance-in-universal-life-policies):
    "the increasing death benefit option automatically adds cash value growth to the base death
    benefit... maintains higher net amount at risk and could result in steeper COI charges"), plus
    a Maryland Insurance Administration consumer advisory confirming cost-of-insurance rises with
    age generally on any UL policy. The mechanism holds up. One nuance found worth fixing in the
    wording: the original note implied Level's minimum reliably "levels off," which overstates
    it — Level's shrinking net amount at risk *can* offset the age-based rate increase, but isn't
    a guarantee (underperforming cash value, or a policy with no offset built in, can still leave
    Level's minimum climbing too). Reworded on both `ScenarioForm.tsx` and `illustration-pdf.ts`
    to say Level "can help offset" the rise rather than implying it stops climbing — the "confirm
    the actual year-by-year schedule on the carrier's illustration" caveat stays, since that's
    doing the real work regardless of which election. No schema change, no SQL to run.
  - No schema change, no SQL to run for either item.

- **Retired auto-convert-to-Product on Illustration Scenarios — BUILT 9/5, SQL REQUIRED.** Karina,
  testing: "convert" was pulling illustration numbers (Level/Increasing tracks, milestones) into
  the new Product's own Illustration Summary, and it didn't read like a real in-force policy
  record — too much mismatch between "numbers we were illustrating to compare options" and "what
  the client actually has now" (issue date, policy number, the real premium). Her call: stop
  converting anything automatically.
  - **What changed:** the "This Is What They're Going With →" button on a scenario no longer
    creates a Product or copies any numbers anywhere. It now just marks the scenario with a plain
    timestamp (`chosen_at`) recording "the client chose this one, on this date" — for the record,
    in case a client later disputes what they agreed to. An "Undo" link clears it if marked by
    mistake. The scenario list (on the client's profile) shows a "Chosen [date]" badge for these,
    same green styling as before.
  - **The advisor now adds the real Product by hand**, the normal way, in Products below — see the
    next item for the autofill fix that makes that faster.
  - **Already-converted scenarios are untouched.** Any scenario converted under the old flow
    keeps its "Converted" badge and its link to the Product it created — that history isn't going
    anywhere, and `converted_product_id` isn't being repurposed or cleared. Nothing new will ever
    set it again; the underlying `convertScenarioToProduct` function has been removed.
  - **SQL to run before applying this build:** `supabase/migration_scenario_chosen_at.sql` (also
    folded into `schema.sql` as section 42) — adds the new `chosen_at` column. One line, purely
    additive, nothing to backfill.
  - **Product name autofill on Add Product — BUILT 9/5.** Karina noticed picking a known product
    from the datalist (e.g. "Accumulation IUL (via Ethos)") didn't fill in Carrier/Type the way
    the Illustration Scenario picker already does. Same fix: `ProductsSection.tsx`'s product-name
    field now uses the same `KB_PRODUCTS` lookup as `ScenariosSection.tsx`'s "+ Add Illustration"
    field — picking (or typing an exact match of) a known product now autofills Carrier and Type
    (e.g. "Accumulation IUL (via Ethos)" correctly fills Carrier: North American, Type: IUL, not
    "Ethos" — see the `inferCarrier`/`ETHOS_UNDERWRITER_BY_NAME` comment in `kb-data.ts`). Date and
    policy number are still always typed in by hand — those are specific to the actual issued
    policy, nothing to autofill there. No SQL for this part.

- **Minimum to Avoid Lapse / Face Value label rows uneven — BUILT 9/6.** Karina: the Level/Increasing
  field pairs on Policy Premium and Initial Death Benefit looked lopsided — the label + pill badge
  sat inline on one line, and since "Increasing" is a longer word than "Level," only the second
  column's badge wrapped onto its own line, pushing that column's input box down while the first
  column's stayed put. Fixed by always stacking the pill badge on its own line directly under the
  field name (`ScenarioForm.tsx`), for both pairs, instead of only wrapping when it happened not to
  fit — now both columns are the same shape regardless of which badge word is longer. No schema
  change, no SQL to run.

- **Annuity income rider fields — BUILT 9/6.** Karina, on an Annuity scenario: when there's an
  income rider attached, wanted a checkbox that reveals whether income starts immediately or at a
  future age, and what the monthly amount is either way. Added a "This annuity has an income rider"
  checkbox to the annuity scenario editor (`ScenarioForm.tsx`) — once checked, shows an
  Immediate/Starts-at-a-future-age choice, an "Age Income Starts" field (deferred only), and a
  Monthly Income Amount field either way. New `AnnuityIllustration.hasIncomeRider` (boolean),
  `incomeStartTiming` ("immediate" | "deferred"), `incomeStartAge`, `incomeMonthlyAmount` — all
  optional/additive in `illustration.ts`, so every existing annuity scenario is unaffected. Shows
  on both the on-screen editor and the generated PDF (`illustration-pdf.ts`, both the Scenario and
  per-product Illustration generators) once checked.
  **Important correction on the accompanying note — please read before this reaches a client.**
  Karina also asked for a note saying unused money "goes to the beneficiary as a death benefit...
  completely tax free because it's a death benefit." Researched this before writing it onto a
  client-facing PDF, since it's a materially different claim from the Level/Increasing research
  earlier — **it's not accurate as stated.** An annuity's death benefit is taxed very differently
  from a life insurance death benefit: life insurance death benefits are generally fully income-
  tax-free, but an annuity's is NOT — only the return of principal (what was actually paid in)
  passes tax-free to the beneficiary; any growth/earnings above that are taxed to the beneficiary
  as ordinary income, and a qualified (IRA) annuity's death benefit is generally taxed in full.
  Confirmed independently by [Guardian Life](https://www.guardianlife.com/annuities/death-benefits)
  ("annuity death benefits receive different tax treatment than life insurance death benefits...
  beneficiaries only pay taxes on annuity earnings") and
  [SmartAsset](https://smartasset.com/retirement/how-are-non-qualified-annuities-taxed-to-beneficiaries)
  ("any earnings on the annuity are taxable as ordinary income... beneficiaries do not receive a
  step-up in basis for non-qualified annuities"). Built the note with the corrected version instead
  of what was originally described — worded as: unused value passes to the beneficiary as a death
  benefit, but unlike life insurance this isn't automatically fully tax-free — principal passes tax
  free, growth is taxed as ordinary income to the beneficiary, qualified annuities are generally
  taxed in full — and to confirm specifics with the carrier's illustration and a tax advisor.
  **Please double check this wording reads right to you before it goes out to any client** — happy
  to adjust the phrasing, just didn't want to ship the "completely tax free" version since that's
  not correct and this is the kind of claim that could cause a real problem downstream. No schema
  change, no SQL to run.

- **Death Benefit Milestones (IUL/WL scenarios) — BUILT 9/7.** Karina: "should we also have
  milestone death benefit? two fields. so I can show at what age it hits 500K and what age 1M...
  advisor inputs the age and the amount." This is deliberately separate from the existing
  age-by-age Milestones table (which answers "at age Y, what's the cash value / death benefit?")
  — this new section answers the inverse: "at what age does the death benefit reach a specific
  target, like $500,000?" Since Level and Increasing grow into a target differently (Level pays
  the full face amount from day one, Increasing starts lower and grows into it over years), each
  target gets its own Level age and Increasing age rather than one shared age — confirmed with
  Karina this should track per election, not one general age.
  **What it does:** a new "Death Benefit Milestones" section on the cash_value Scenario form
  (between Death Benefit Increase and the detailed Milestones table), always showing at least 2
  rows to start (Karina's own example was two targets), each with a dollar-amount target and two
  age fields (Level / Increasing). "+ Add Target" goes up to 4; "Remove" only appears once there
  are more than 2, so it can never collapse below the two-target layout she asked for. Shows on
  the scenario's PDF summary too, as a short "$500,000 reached — Level: age 45 · Increasing: age
  52" line per target (only targets with an amount entered print; a blank age on either side
  prints as "—" rather than being dropped, so it's clear that side just wasn't entered).
  Optional/additive (`deathBenefitTargets` on `CashValueIllustration`) — every existing scenario
  is unaffected. No SQL to run.

- **Illustration/Scenario forms now autosave — BUILT 9/7.** Karina: "can illustration input auto
  save like the client profile info does? not hitting save and losing info can be tedious." The
  client profile form (ContactInfoForm.tsx) saves per-field on blur, but that pattern doesn't map
  cleanly onto the Illustration/Scenario forms — the milestone/target/rider editors are deeply
  nested sub-components with no onBlur of their own, and threading one down through every one of
  them would be far more invasive than this needed. Instead, both forms now watch their whole
  editable state (Illustration: `data`; Scenario: product name, carrier, notes, and `data`) and
  autosave 1.5 seconds after the last change — long enough that a burst of typing doesn't trigger
  a save per keystroke, short enough that closing the tab or clicking away a couple seconds after
  the last edit won't lose anything. Uses the exact same save action and "Saving…/Saved ✓"
  indicator the manual Save button already used — autosave and the button both just call it.
  **The manual Save button stays** (so does the explicit save `handleMarkChosen` already did
  before marking a scenario chosen) — nothing about how those work changed, autosave just means
  neither should ever actually find unsaved work waiting for it. Added a small "Changes save
  automatically as you type" line above the button row on both forms so it's not a silent
  behavior change. Touched: `IllustrationForm.tsx`, `ScenarioForm.tsx`. No SQL to run, no schema
  change — purely a client-side save-timing change, same server actions as before.

- **Death Benefit Milestones made visual — BUILT 9/7, same day.** Karina, right after seeing the
  new section on a real PDF: "can the death benefit milestones be more visual in layout?" The
  original version was plain text lines ("$500,000 reached — Level: age 55 · Increasing: age
  53"), which blended into the page sitting right below the colored Initial Death Benefit boxes.
  Reworked to match: each target now gets its own rounded box, two per row (same side-by-side
  pattern as the Initial Death Benefit boxes above it) — big dollar amount, then a small "Level"
  / "Increasing" line under it with a colored marker (solid vs. dashed) for each age. Used blue
  rather than green specifically to match the Death Benefit (Level)/(Increasing) chart further
  down this same PDF — same colors, same solid-vs-dashed convention as that chart's legend — so
  the two sections visually connect instead of the milestone boxes looking unrelated to the chart
  right below them. Rendered a sample PDF with Karina's own numbers ($500K/$1M, ages 55/53 and
  69/68) to confirm the boxes fit cleanly side by side with no overlap before shipping this.
  Touched: `illustration-pdf.ts` only — no change to the form inputs, no SQL to run.

- **PDF page breaks fixed — charts were getting cut off — BUILT 9/7, same day.** Karina, after
  the boxes above shipped and pushed a typical cash_value scenario taller: "now the graphs get
  cutoff. dont try to cram everyrhing on one page if it doesnt fit." Root cause: this generator
  only ever had ONE page-break check, at the very end (right before the "Prepared by"/disclaimer
  footer) — everything above that just kept drawing at increasing y with nothing stopping a chart,
  box, or table from starting near the bottom of a page and running straight off the physical
  edge. The new Death Benefit Milestones boxes were what finally pushed a typical scenario past
  that edge mid-chart.
  **Fix:** added an `ensureSpace(neededHeight)` check, called right before every block whose
  height can be known ahead of drawing it — the Policy Premium text, the Initial Death Benefit
  boxes, the Death Benefit Increase note box, the Death Benefit Milestones boxes, the milestones
  table, both charts (Cash Value and Death Benefit), the Notes text, and the annuity table/chart
  and Income Rider block — in both `generateIllustrationPDF` (per-product) and
  `generateScenarioIllustrationPDF` (scenarios), since both share the same charts and were both at
  risk. If a block wouldn't fit in what's left on the current page, it now starts a fresh page for
  that whole block instead of spilling across the boundary and clipping. A scenario with this much
  content (Policy Premium + both DB boxes + DB Increase note + 2 Death Benefit Milestone targets +
  a 4-row table + 2 charts) now runs to 2 pages instead of 1, which is the intended trade-off —
  nothing is cut off, and the "Prepared by" footer still lands right after the last chart rather
  than orphaned alone on its own page.
  **Verified, not just built:** rendered the actual generator (not a mockup) with Karina's real
  numbers from her screenshot — same client, same $500K/$1M targets, same milestone table — and
  confirmed both charts now print in full across the 2 resulting pages before shipping this.
  Touched: `illustration-pdf.ts` only, both PDF generator functions — no SQL to run.

- **PDF color palette and header reworked — BUILT 9/7, same day.** Karina, right after the page-
  break fix: "the blue boxes need more space at the bottom like the green ones also lets work on
  the colors in general. i dont like like the thick black header on the pdf. and we need a color
  pallet that glows and is appealing for the PDF's." Two pieces:
  **Blue box padding** — the Death Benefit Milestones boxes went from 58pt to 68pt tall. They
  stack 4 lines (amount, label, Level age, Increasing age) vs. the green Initial Death Benefit
  boxes' 2, so at the old height they had less room below the last line than the green boxes
  despite having more content — now they have more breathing room than the green boxes, not less.
  **Colors and header** — asked Karina to pick a direction rather than guessing on a client-facing
  document: she chose "Minimal, no block" for the header and "Soft & airy" for the overall
  palette. Removed the solid black 70pt header bar entirely — the wordmark, subtitle, and product
  name now sit directly on the white page (product name bumped from 14pt to 20pt so it still reads
  as the clear focal point), with a thin colored rule marking the end of the header instead of a
  heavy fill. Softened every color constant in the file (still using the same names everywhere
  they're already called, so this was a values-only change, not a rewrite of ~130 call sites) —
  darks eased off pure black/deep tones, the Cash Value green became a soft sage, the Death
  Benefit blue became a soft slate, the notes/warnings gold became a softer amber, hairline rules
  lightened. The header's wordmark and rule deliberately reuse the exact same sage as the Cash
  Value chart (previously an unrelated near-white-on-black color) — the header now visually ties
  to the Cash Value section instead of standing alone.
  **Verified:** rendered the actual generator again with the same real scenario used to verify
  the page-break fix, confirmed the new header, softened colors, and the wider blue boxes all
  render correctly with no regressions. Touched: `illustration-pdf.ts` only — no SQL to run.

- **PDF header/colors refined again — BUILT 9/7, same day, third round.** Karina, after seeing
  the reworked header: "heading the product name can be much smaller... so that can move
  everything up higher... does it have to be in a block? Can we just put it on the right side in
  the header?... we need to change the colors. I don't like this green and blue gold thing
  happening... the stuff that is under those blue boxes they're too close to the boxes." Four
  changes:
  **Smaller product name, everything moved up** — product name went from the 20pt this same day's
  earlier rework used down to 13pt, so it reads as the header's third line rather than a headline
  competing for attention.
  **Client info out of its own block** — the separate cream "Client / product info box" is gone.
  Client name and product type/carrier now sit inline in the header, right-aligned opposite the
  GENERATIONAL PLAYBOOK wordmark — one shorter header instead of a header plus a box, so every
  section below starts noticeably higher on the page (content that used to start at y=104 now
  starts at y=82).
  **Green/blue/gold fixed, not just softened** — the actual complaint was a real inconsistency,
  not just harsh colors: Initial Death Benefit was colored green even though it's a death-benefit
  number, while Death Benefit Milestones (right below it) and the Death Benefit Over Time chart
  (further down) are blue — same concept, two different colors. Initial Death Benefit now uses
  the same blue as the rest of the death-benefit content; green is reserved for Cash Value only.
  The remaining gold/amber box (Death Benefit Increase note) stays gold deliberately — it's an
  advisory callout, the same role gold already plays in the Policy Premium note above it, so
  keeping it visually distinct from the blue data boxes is intentional, not an oversight.
  **Spacing under the blue boxes** — the gap between the Death Benefit Milestones boxes and the
  milestones table below them went from 4pt to 22pt.
  **Verified:** re-rendered the same real scenario a third time — confirmed the right-aligned
  client info, the smaller product name, the now-consistent blue, and the wider gap under the
  boxes, with everything still fitting cleanly across 2 pages and nothing clipped. Touched:
  `illustration-pdf.ts` only — no SQL to run.

- **PDF header/colors refined again — BUILT 9/7, same day, fourth round.** Karina: "i think
  Generational playbook should be in black and the text udner it should be darker but not black
  just a bit darker to its easier to read. the polciy premium should be black and bold under the
  green line header, the header color should line should maybe me generational playbook color not
  a green we need to rband this to match the website more when it comes to colors." All four asks
  are built — three immediately, the fourth (the real brand color) once Karina sent it:
  **GENERATIONAL PLAYBOOK wordmark → black.** Was the sage-green WARM color, now OBSIDIAN.
  **Subtitle ("Policy Illustration Summary · GenerationalPlaybook.com") → darker, not full black.**
  Now uses the existing CHARCOAL constant (a dark gray, not GRAY) — deliberately didn't darken GRAY
  itself, since GRAY is still used for genuinely secondary text elsewhere (the "No milestones
  entered yet" placeholders, the footer disclaimer) that wasn't part of this ask.
  **POLICY PREMIUM and DEATH BENEFIT MILESTONES labels → black and bold.** Both were already bold,
  just gray — now OBSIDIAN, matching each other.
  **Header rule color — resolved same day, once Karina sent it.** Her fourth point was the
  horizontal line under the header shouldn't be "a green," it should be "generational playbook
  color," and more broadly "we need to rebrand this to match the website more when it comes to
  colors." I couldn't fetch generationalplaybook.com directly from here to read its real colors off
  the page, so I asked her for the URL or hex codes instead of guessing again — she sent a
  screenshot of the site's actual "Colors" section instead. It's a neutral palette: three warm
  off-white/cream swatches and two near-black charcoal swatches — no green, no accent hue at all.
  So the sage-green WARM constant this PDF used for the header wordmark and rule was never actually
  a brand color, just an invented guess from an earlier round. Retired WARM entirely: the header
  rule (previously sage-green) now reuses OBSIDIAN directly — sampled the screenshot's darkest
  swatch (~#1C1C1C), which is close enough to OBSIDIAN (#2A2D2F) that reusing it keeps the header
  genuinely monochrome, matching the real site, instead of adding a fourth near-black constant.
  SAND was already a close match to the site's beige swatch without any change needed. GREEN/BLUE/
  GOLD are untouched — those are this document's own semantic colors (Cash Value / Death Benefit /
  advisory notes), not brand colors, and the real site's neutral palette has no equivalent to
  compare them against anyway. **Verified:** re-rendered both the scenario and per-product PDFs —
  wordmark and header rule both read as the same real brand black, subtitle a readable dark gray,
  Policy Premium and Death Benefit Milestones labels black and bold, everything else unchanged and
  nothing clipped. Touched: `illustration-pdf.ts` only — no SQL to run.

- **PDF palette gone fully monochrome — BUILT 9/7, same day, fifth round.** Right after the round
  above shipped, Karina pushed back: "youre still using blue and green though on this example. lets
  talk tis throigh dont build anyting." She was right — GREEN (Cash Value) and BLUE (Death Benefit)
  were still there even though her screenshot proved the real site has no color at all. Explained
  why they existed (functional color-coding so a client can tell two number series apart at a
  glance, not decoration) and asked her to choose: keep that functional coding, go fully
  monochrome, or use one muted accent sparingly. She chose fully monochrome.
  **What changed:** retired GREEN, BLUE, GOLD, LIGHT_GREEN, and LIGHT_BLUE entirely — the file now
  draws everything from OBSIDIAN (black), CHARCOAL (dark gray), SAND (beige), GRAY, and a new
  NEUTRAL_FILL (a light cream sampled straight from Karina's "Colors" screenshot, replacing every
  green/blue/gold-tinted box with one consistent fill). Everywhere two data series used to be told
  apart by color within the same chart or box pair — Non-Guaranteed vs. Guaranteed, Level vs.
  Increasing, and the annuity chart's Accumulation Value vs. Income Value — they're now told apart
  by OBSIDIAN-solid vs. GRAY-dashed instead. Most of those already had a dash difference from the
  Guaranteed/Increasing convention; the annuity chart didn't (it leaned entirely on gold vs. blue),
  so Income Value picked up `dashed: true` there for the first time. Every box in the document —
  Initial Death Benefit, Death Benefit Milestones, the Death Benefit Increase note, Term/Final
  Expense/Final-Expense-budget-option boxes — now uses the same cream fill and black text
  regardless of what it's about, instead of a different tint per topic.
  **Verified:** re-rendered all five illustration shapes (cash_value scenario with every optional
  section filled in, cash_value per-product chart-only, term, final_expense with 3 budget options,
  and annuity with an income rider) — confirmed every chart's two lines and every box stayed
  visually distinguishable using only weight, dash pattern, and the existing bold section headers,
  with nothing clipped across pages. Touched: `illustration-pdf.ts` only — no SQL to run.

- **PDF spacing + footer polish — BUILT 9/7, same day, sixth round.** Karina, after seeing the
  monochrome version: "the generational playbook dot com that is right next to policy illustration
  summary should move to the bottom of each page in the center, like, as a footer. And the if cash
  value is left untouched, that box, and then underneath it where it says death benefit milestones,
  there needs to be some more space there. It's too close to that box, and maybe it should be a
  little bit closer to the box relevant underneath, which is the five hundred thousand showing. And
  then the graphs, the cash value over time, I feel like there needs to be a little bit more space,
  so it's pushed down and the same thing for death benefit over time." Four fixes, all in
  `illustration-pdf.ts`:
  **Site URL → footer.** "GenerationalPlaybook.com" no longer sits in the header subtitle (now just
  "Policy Illustration Summary"); it's drawn centered at the bottom of every page instead, looped
  over `doc.getNumberOfPages()` after all content is drawn so a multi-page illustration carries it
  on each page, not just the last.
  **Death Benefit Increase note → Death Benefit Milestones spacing.** The gap after the "If cash
  value is left untouched..." box grew from 12pt to 26pt of trailing whitespace (box itself
  unchanged at 40pt), and the gap between the "DEATH BENEFIT MILESTONES" label and its own boxes
  shrank from 12pt to 8pt — so the label now reads as grouped with the boxes below it, not floating
  between two sections.
  **Charts pushed down.** The gap before "CASH VALUE OVER TIME" grew from 14pt to 26pt, and the gap
  between the Cash Value chart and "DEATH BENEFIT OVER TIME" grew from 130pt to 142pt — applied
  identically in both `generateIllustrationPDF` and `generateScenarioIllustrationPDF`.
  **Verified:** re-rendered a full-featured scenario (footer now correctly appears on both pages
  once the extra chart spacing pushed Death Benefit Over Time to page 2) and a shorter scenario with
  the DB Increase note but no DB Milestones or Cash Value Increasing data, to confirm the wider gaps
  don't look excessive when less content follows. No SQL to run.

- **Quick-add Meeting/Reminder from their own tabs — BUILT 9/7.** Karina: "for meetings and
  reminders when you're on that tab, you should be able to put in... add meeting... where somebody
  can create a meeting... right from that tab, and then they can start typing in the client's name
  and it auto populates... right now, it's too many steps. If I'm on meetings and I'm like, oh, I
  need to schedule a meeting real quick, I have to go to the clients tab and then have to find the
  client." Also asked how to tell apart clients who share a name in that search: "when there is a
  client that's got the same name, it also shows their birth date underneath their name."
  **What was built:** a "+ Add Meeting" button on `/meetings` and a "+ Add Reminder" button on
  `/reminders` (top-right of the page, next to the title — same style as the Clients tab's
  "+ New Client"), each opening a small centered modal with a client-search field, a date/time
  picker, and the same fields the per-client cards already collect (location + notes for meetings,
  a note for reminders). Both modals call the exact same `addMeeting`/`addReminder` server actions
  the existing per-client cards (`MeetingsCard.tsx`/`RemindersCard.tsx`) already use — no new
  insert logic, no schema change, just a second way to reach the same action without opening a
  client's profile first.
  **New shared client picker** (`ClientPicker.tsx`) — search-as-you-type against a new
  `searchClientsForPicker` action (`clients/actions.ts`, same ILIKE-on-full_name/limit-15 pattern
  as the existing family-linking picker, `searchFamilyCandidates`, just without that one's
  family-specific exclude-list and stage field). Picking a result fills the client in; a "Change"
  link clears it and re-opens the search.
  **Disambiguation:** if two or more of the current search results share the same name, each of
  those rows shows its birth date underneath (formatted from the `birth_date` column, e.g. "Mar 14,
  1985"; "No birth date on file" if it's blank, so it's clear there's nothing to tell them apart
  with rather than looking like the picker forgot). Names that aren't ambiguous in the current
  result set show nothing extra, so this doesn't clutter the normal case. This is deliberately
  scoped to "only when it matters" rather than always showing birth date — Karina's message offered
  both ("or it should just show the birth date all the time or something") so I picked the less
  noisy option; easy to flip to "always show it" if that turns out to be preferred once she's used
  it live.
  **Reminders note:** the picker on `/reminders` only searches clients, not recruits — Karina's ask
  was specifically about clients, and the existing recruit-reminder flow (from a recruit's own
  profile page) is untouched.
  **Not visually tested against real data** — this sandbox has no live Supabase session/browser to
  click through against Karina's actual client list, so verification here was `npm run lint` +
  `npm run build` (full TypeScript type-check across every changed/new file) only, not a screenshot
  like the PDF work above. Worth a quick real click-through once applied — flag anything off with
  the modal, the search, or the birth-date disambiguation and it's a fast fix.
  **No SQL to run** — no schema changes, `addMeeting` picked up one more `revalidatePath("/meetings")`
  call (mirroring what `deleteMeeting` already did) so the global list refreshes when a meeting is
  added from `/meetings` itself, not just from a client's page; `addReminder` already revalidated
  `/reminders` for every write, so no change needed there.

- **PDF milestones table: "Age Age 65" fixed — BUILT 9/7.** Karina: "the PDF has a mistake. It says
  age age sixty five, age age eighty five. We need to move age to the top as a heading, like how
  cash value, cash value level, cash value increasing, death benefit level, death benefit increasing
  is a heading... put age on that line, and then don't have age there again in the line."
  **Root cause:** in `generateScenarioIllustrationPDF`, the milestones table's first column header
  was blank, and the row below it printed `"Age " + m.label` — but `CashValueMilestone.label` is
  itself a freeform field an advisor types as e.g. "Age 65" (that's literally the example in its own
  doc comment), so typing "Age 65" as the label produced "Age Age 65" once the code's own "Age "
  prefix was added on top. The same doubled-up text was also feeding the Cash Value/Death Benefit
  charts' x-axis tick labels below the table, so the bug showed up in three places on the PDF, not
  just the one Karina spotted.
  **Fix:** first column now has "Age" as its own bold heading (matching the other four column
  headings' style), and the row prints `m.label` as typed, with no forced prefix — same fix applied
  to the chart x-axis labels. Also added the same "Age" heading to the per-product
  `generateIllustrationPDF`'s equivalent table for consistency (that one's row never had the double-
  prefix bug, since it never added "Age " itself, but it also had no heading — now both generators
  match). Only touches the cash_value milestones tables specifically — the annuity milestones table
  (Year 5/Year 10-style labels, a different field with different conventions) is untouched.
  **Verified:** re-rendered both generators with milestone labels of "Age 65"/"Age 85" (the same
  values Karina's screenshot showed) — table now reads "Age" as the heading with a clean "Age 65" /
  "Age 85" in each row, and both charts' x-axis labels read the same way, no doubling anywhere.
  Touched: `illustration-pdf.ts` only — no SQL to run.

- **Knowledge Base: Increasing DBO reduces early living-benefit access — BUILT 9/6.** Talked
  through with Karina (nothing to build in the app itself, just Knowledge Base content): if a
  client on Increasing needs to file a Critical/Chronic/Terminal Illness claim early in the
  policy, they get less than the same face amount on Level, because the acceleration percentage/
  cap applies against whatever death benefit is actually IN FORCE at claim time — and Increasing
  hasn't grown into its eventual target yet in those early years. Confirmed this is really how
  accelerated benefit riders work via a real carrier disclosure — North American's Chronic Illness
  Accelerated Benefit Rider bases the accelerated amount on the death benefit as of the election
  date, not a future target (25457/5721429/NAM-1080.pdf on northamericancompany.com). This wasn't
  connected anywhere in the existing Knowledge Base — the "Living Benefits" entry covered claim
  mechanics generally, and the "Death Benefit Options — Level vs. Increasing" entry covered the
  DBO timing tradeoff, but nothing tied the two together.
  Added the connection to both entries in `kb-data.ts` (so whichever one an advisor pulls up, they
  see it): a client on Increasing has less accessible via a living-benefit claim in the early
  years (on top of having less built-up cash value that early too), and — per Karina — if
  Increasing is still the right fit for other reasons but near-term protection/access still
  matters to the client, the recommendation is to pair it with a term policy at the same time and
  split the client's budget across the two, so there's real full coverage from day one either way
  while the IUL grows into its Increasing target. Added to the `does`/`agent`/`client`/
  `highlights` fields of both entries, plus new search tags on each (living benefits ↔ increasing/
  term pairing/split budget) so either one surfaces from a search on the other's terms. Content-
  only change (`src/lib/kb-data.ts` is a static file, not a database table) — no schema change, no
  SQL to run.

- **Advisor Remove Access + client reassignment — BUILT 9/6, SQL REQUIRED.** Karina wants admins
  to add and remove advisors from the portal itself, without going into Supabase directly. Adding
  already existed (the invite flow). Removing didn't, and it's more involved than it sounds:
  `clients.owner_id` was `not null references profiles(id) on delete cascade` — actually deleting
  an advisor's profile row would silently cascade-delete every client (and everything hanging off
  them: notes, tasks, products, illustrations) they owned. Flagged this to Karina before building
  anything — she confirmed this should be a safe "remove access," not a real delete.
  **What it does:** on the "Your Team" list (Invite Agents page), each advisor now has a "Remove
  access" action (two-step confirm, matching the app's usual pattern) that: bans their Supabase
  auth login via the admin API (they can no longer sign in at all), stamps a new
  `profiles.disabled_at` so the row shows a "Removed [date]" badge, and sets `owner_id` to NULL on
  every client they owned — moving their whole book into a new "Unassigned Clients" section
  further down the same page, rather than deleting anything or leaving it stuck under a login
  nobody can use. Removed advisors get a "Restore access" button in place of the role dropdown if
  you need to undo it — this un-bans the login and clears `disabled_at`, but does NOT move their
  clients back (whatever an admin already reassigned stays reassigned).
  **Reassignment:** the new "Unassigned Clients" section lists every client with no owner and lets
  an admin assign them one at a time, or select several and assign them all to the same advisor in
  one action — per Karina, "someone may leave their book of business to anyone or one person," so
  both single and batch reassignment are supported. Reassigning also moves that client's reminders
  and meetings to the new advisor (both tables carry their own separate `agent_id`, not just
  `client_id` — easy to miss, would otherwise leave pending reminders invisible to everyone) —
  see `reassignClients` in `admin/invite/actions.ts`.
  **Also touched:** both daily cron routes (`check-birthdays`, `check-conversion-deadlines`) now
  skip clients with no owner rather than trying to insert a reminder with a null `agent_id` —
  the conversion-deadline one specifically does NOT mark itself "sent" when skipped, so the
  reminder fires correctly once an admin reassigns the client instead of silently being lost.
  **New:** `profiles.disabled_at` (nullable timestamptz). **Changed:** `clients.owner_id` is now
  nullable (was `not null`) — this is the one to read carefully before running, since it loosens
  an existing constraint rather than just adding a column, though it's non-destructive (no data
  changes, no existing row is affected until you actually remove someone). SQL to run against
  Karina's live Supabase project — see `migration_add_advisor_removal.sql`.
  **One thing I couldn't verify from here:** "Restore access" un-bans a login by sending
  `ban_duration: "none"` to Supabase's admin API, which is documented as the way to clear an
  existing ban — but please actually test that a restored advisor can log back in the first time
  you use it, since this couldn't be checked against a live Supabase project from this session.

- **Mobile responsiveness — full pass — BUILT 9/7.** Karina: "Can we refine mobile version so
  advisors can put the portal on their home screens and access it right away so we don't have to
  build an app just yet." Turned out the home-screen piece (Add to Home Screen / PWA installability
  — `manifest.json`, `apple-touch-icon.png`, the `metadata`/`viewport` exports in `layout.tsx`) was
  already fully built before this session and working — so I reframed this as being about the
  actual mobile layout, which was still "very jumbled" per earlier feedback. Asked Karina how much
  to cover; she said "Full pass, everything at once."
  **What was wrong:** two systemic causes, not one-off bugs. (1) The top nav bar hard-rendered all
  9 links (`Home, Clients, Meetings, Reminders, Team, Knowledge Base, Client Analyzer, Compare,
  Downloads`) in a single row with no mobile fallback — on a phone these either wrapped into a mess
  or overflowed off-screen. (2) Dozens of form/detail sections across the app used a bare
  `grid-cols-2` / `grid-cols-3` (no responsive prefix), so two or three fields were forced onto one
  row no matter how narrow the screen, squeezing labels and inputs unreadably small.
  **What it does now:** (1) Nav — `NavLinks.tsx`'s link list is now exported and shared with a new
  `MobileNav.tsx`, a hamburger button (visible only below `md:`, 768px) that opens a full-width
  drawer with all 9 links plus My Profile / Invite Agents (admins) / Sign out, closes itself on
  link click, backdrop click, or Escape. `layout.tsx` shows the existing desktop row only at `md:`
  and up, the hamburger only below it. (2) Grids — every bare `grid-cols-2`/`grid-cols-3` I found
  (38 instances across 9 files: client intake/new-client forms, illustration forms, family/products
  sections, scenario forms including the annuity income-rider fields added this session, the client
  analyzer, and the public client-intake form) now reads `grid-cols-1 sm:grid-cols-2` /
  `grid-cols-1 sm:grid-cols-3` — single column on a phone, back to the original layout at `sm:`
  (640px) and up. (3) Added `overflow-x: hidden` on `body` in `globals.css` as a safety net — a
  narrow miss I didn't specifically catch can no longer force the whole page to scroll sideways on
  a phone; it clips instead of breaking the layout (doesn't fix an individual component's width,
  just contains the damage).
  **Confirmed already fine and left untouched:** the home dashboard, client/team detail pages
  (`lg:grid-cols-[2fr_1fr]`), the Compare page's one `<table>` (already `overflow-x-auto`-wrapped),
  and Profile's Carrier Logins / State Licenses tabs (already had their own responsive
  `grid-cols-2 sm:grid-cols-N` pattern from 9/3). Login/signup/set-password pages had no issues.
  **No SQL required** — this is entirely front-end (React/Tailwind/CSS), nothing touches the
  database. **Ask Karina:** this was a systemic sweep based on the patterns that actually cause
  "jumbled" mobile layouts, not a screen-by-screen click-through on a real phone — if any specific
  screen still looks off once you're testing on your phone, flag it and I'll spot-fix it directly.

- **Server action error handling.** Discovered while fixing the Invite Agents crash:
  Next.js hides any THROWN error from a server action behind a generic message in
  production ("Minified React error #441..."), even when the code does
  `throw new Error("some helpful message")`. The invite/role actions were rewritten to
  return `{ ok, error }` instead of throwing, which fixes it there. Other action files
  (client notes, tasks, reminders, analyses) still use the throw pattern — they haven't
  caused a reported issue yet, but the same silent-masking risk applies to all of them.
  Worth a pass to convert them the same way if more mystery "#441" errors show up.

- **Annuity contract end date + date off-by-one bug fix + Outreach broadened beyond term —
  BUILT 9/7.** Karina: "when I'm putting in a product as an annuity for a client, there's issue
  date, policy number, initial premium, surrender period ends... but we also need a date for
  annuity contract end. Like, if it's a five year, a seven year, a ten or a fifteen year, we need
  to know what that date is so that we can prepare for it." Then, separately in the same message:
  a term policy entered with issuance 10/1/2016 and term expiration 10/1/2026 showed the right
  red "Term ends..." warning but the wrong date on it (September 30 instead of October 1), and
  didn't show up on the home page's Time-Sensitive section or in the Clients "Term" view's Needs
  Outreach count even though it's ~24 days out — "This also shouldn't be just term policies. It
  should be for anything that has an end date that an adviser would need to touch base with the
  client for."
  **Three separate things, all fixed:**
  (1) **New "Annuity contract end date" field.** Added alongside the existing "Surrender period
  ends" field (relabeled "Surrender charge period ends" for clarity — that one is the carrier's
  early-withdrawal-penalty window, this new one is the contract's own maturity date; an annuity
  can outlast its surrender period). New `annuity_contract_end_date` column — **run the migration
  below**. I didn't reorder the rest of the annuity form (issue date/policy number/premium) since
  it wasn't clear whether you meant reorder-the-whole-form or just this one field — flag it if you
  actually wanted the full sequence reshuffled.
  (2) **The date-off-by-one bug.** Root cause: a plain Postgres `date` column comes back as a bare
  "2026-10-01" string, and `new Date("2026-10-01")` parses that as UTC midnight — which then
  displays as the previous day in any US timezone behind UTC (i.e. everywhere in the US). This was
  hitting every date-only field displayed in a browser: issue date, expiration date, no-exam-
  declined date, final conversion deadline, term end date/"Term ends..." badge, and the annuity
  surrender/contract-end dates. Fixed with a new shared helper (`src/lib/dates.ts`) that parses the
  year/month/day directly instead of going through UTC, applied everywhere these dates get
  formatted. (The reverse mistake — "fixing" a real timestamp field like `converted_at` or
  `term_contacted_at` the same way — would have broken those, so I left them alone; they're
  genuine instants, not calendar dates, and were already displaying correctly.)
  (3) **Outreach broadened beyond term.** The "Term" view/chip on Clients is now "Outreach", and
  no longer requires the "this is a term policy" checkbox to be checked — any product with a
  relevant date on file (term expiration, either conversion deadline, or now either annuity date)
  shows up, is sorted soonest-first, and can be marked "Touched Base" the same way as before. Same
  broadening on the home page's banner (renamed "Time-Sensitive Term" → "Time-Sensitive"). A
  permanent policy (Whole Life/IUL/Final Expense) with no relevant date on file still doesn't show
  up — nothing forces it into the queue.
  **On the "Needs Outreach: 0" report specifically:** I traced the query and computation logic
  carefully and it looks correct — a term product with `is_convertible` true, not converted, not
  marked contacted should have appeared even before this fix, and the badge you saw ("Term ends
  September 30") could only have rendered if `is_convertible` was already true on that product. I
  couldn't reproduce it without your live data, so I can't rule out a one-off (maybe the save
  didn't stick, or the page hadn't refreshed). The broadening in (3) should make this whole class
  of "why isn't this showing up" issue much less likely going forward either way. If it's still
  showing 0 for that product after this update, open it in Edit and double check the term/date
  fields saved the way you expect, and let me know if they didn't.
  **SQL to run** (Supabase SQL Editor, additive/non-destructive):
  ```sql
  alter table public.client_products add column if not exists annuity_contract_end_date date;
  ```

- **Time-Sensitive/Outreach still showing nothing + weekday added to every date — BUILT 9/8.**
  Karina, after the fix above: the product page now correctly says "Term ends October 1, 2026,"
  but the home page's Time-Sensitive banner still says "Nothing urgent right now," and the
  Outreach view still shows "Needs Outreach: 0" — worse than before, since the previous fix landed
  and the badge itself is right.
  **Most likely cause: the SQL migration from the previous entry hasn't been run yet.** Both the
  home page query and the Outreach view's query now select the new `annuity_contract_end_date`
  column — if that column doesn't exist yet in your actual Supabase database, the whole query
  fails outright (not just for the one product — for everything), which would produce exactly
  this symptom: both lists totally empty even though the underlying data and code are otherwise
  correct. **Please run this in the Supabase SQL Editor if you haven't yet:**
  ```sql
  alter table public.client_products add column if not exists annuity_contract_end_date date;
  ```
  I also added error surfacing so this kind of failure is never silent again — if that query fails
  for any reason (missing column or anything else), the home page banner and the Outreach view now
  show the actual database error message in red instead of quietly rendering an empty state that
  looks identical to "nothing to show." If you run the migration and it's still empty, whatever
  shows up in that red text will tell us exactly what's wrong.
  **Weekday added everywhere a date is shown.** Karina: "we should show the day, like, if it's
  Tuesday... if I'm looking at this at a glance, I might say, oh, no, I'm good to go on that day
  when you're really not." Every meeting, reminder, and outreach/follow-up date across the app now
  reads like "Tue, Sep 8, 2026" (with time for meetings) instead of just the date — home page
  previews, the Meetings and Reminders tabs, the "Follow up" date on Clients/Team list rows, a
  family member's next-reminder line on a client's profile, and the Outreach queue's milestone
  dates. Left unchanged: purely informational timestamps that aren't about scheduling (e.g. a
  financial plan's "Last updated" date) — flag it if you want weekday there too, it's a small
  change.
  **No SQL beyond the migration above** — the weekday change is pure formatting.

- **Real root cause of the empty Outreach/Time-Sensitive lists found — BUILT 9/8, same day.**
  The error-surfacing added above immediately paid off: instead of a silent empty state, the home
  page showed the actual database error — "Could not embed because more than one relationship was
  found for 'client_products' and 'clients'." That's a genuine, previously-invisible bug, and it
  had nothing to do with the SQL migration.
  **Root cause:** `client_products` has two separate foreign keys pointing at `clients` —
  `client_id` (whose client this policy belongs to) and `owner_client_id` (added later, for when
  someone else — e.g. a parent — owns a juvenile policy). Supabase auto-generates the `clients(...)`
  join from whichever foreign key it can find, and once a second one existed, it could no longer
  tell which relationship you meant — so the whole query started failing outright. This wasn't
  something my broadening introduced; the query shape (`clients(id, full_name)` on a
  `client_products` select) already looked like this before 9/7, so this has likely been silently
  broken since `owner_client_id` was added. That silent failure — not the SQL migration, not a
  data issue on your specific product — is why "Needs Outreach: 0" showed up in the first place;
  I couldn't have found it without the error text actually surfacing.
  **Fix:** told Supabase explicitly which foreign key to use for the join —
  `clients!client_id(id, full_name)` instead of `clients(id, full_name)` — in the home page query
  and the Outreach view's query. I also found and fixed the exact same bug in the daily
  conversion-deadline cron job (`check-conversion-deadlines`), which uses the same join shape
  twice — meaning the 60-days-out auto-reminders for a term policy's no-exam/final conversion
  deadlines have likely not been firing at all since `owner_client_id` was added. That's now
  fixed too, so those should start creating reminders again on its next scheduled run.
  **No SQL to run** — this was a query-shape bug in the app code only, nothing to change in the
  database.

- **Schedule a Call from the Meetings tab — BUILT 9/8.** Karina, looking at the new "Add Meeting"
  popup: "should this have an option to schedule a call too?" Asked what she meant since a
  meeting's date/time already covers a phone call logged after the fact — she meant sending her
  actual Cal.com booking link so the client can pick a time themselves, same as the existing
  "Schedule a Call" card on a client's own profile (Open Scheduling Page / Copy Link to Send /
  Book Here widget). Added a "+ Schedule a Call" button next to "+ Add Meeting" on the Meetings
  tab — pick a client the same way as the quick-add flow, then get those same three actions,
  personalized with that client's name/email. Reused the existing `ScheduleCallCard` component
  as-is rather than rebuilding it, so it stays in sync with whatever changes there later. If you
  haven't set a scheduling link in My Profile, this shows the same "add your link" prompt the
  client-profile version already shows. **No SQL required.**

- **Outreach queue scoped to what's actually time-sensitive + bumped to 90 days — BUILT 9/8.**
  Karina, looking at the Outreach view showing 2: "this should not say 2 need outreach that second
  one is so far away. outreach need should only be the ones that are time sensitive and lets bump
  the time up to 90 days instead of 60." Two changes: (1) the "soon" urgency window (the same one
  that decides what counts as time-sensitive on the home page banner too) is now 90 days instead
  of 60. (2) "Needs Outreach" now only lists products that are actually urgent (critical/soon/
  overdue) — a product with a real date on file that's just decades out (like the Nov 2055 one
  you saw) no longer clutters the list next to one that's 24 days out. It's not lost — it simply
  doesn't appear in Needs Outreach OR Already Touched Base until it crosses into that 90-day
  window on its own, since it was never contacted either. The "Outreach" chip's badge count now
  reflects this too, so it won't overcount. **No SQL required.**
  **On your other question — what happens after Mark Touched Base, is there a resolution/pending
  state:** right now, no. Clicking it just stamps a timestamp and moves the item into "Already
  Touched Base" — that's the entire lifecycle inside this view. It stays there indefinitely (with
  an Undo), with no prompt for what actually happened on that call and no further state. Separately,
  there IS an existing resolution workflow, but it's not connected to this — on a term product's own
  card (client profile → Products), "Mark Conversion Pending" → "Mark Converted"/Undo lets you track
  that a client is actively converting to a new policy, then confirm once it's issued. It's a manual
  click on the product itself, not something Mark Touched Base leads into. I didn't build anything
  new here yet since it's not clear what outcome states you actually want tracked — asked you
  directly in chat rather than guessing and building the wrong thing.

- **Outreach outcomes + auto follow-up reminders — BUILT 9/8, same day, after asking what she
  wanted.** Answers: outcomes needed are Shopping for new coverage, Renewing/keeping as-is,
  Declining/letting it lapse, and Couldn't reach them yet; picking one is now required (no more
  plain one-click "Mark Touched Base"); resolved items split into their own section per outcome
  rather than one flat "Already Touched Base" list; and "Couldn't reach them" / "Shopping for new
  coverage" should each auto-create a follow-up reminder since both mean more work is still coming.
  **What changed:** "Mark Touched Base" is now a dropdown — "What happened?" — with the four
  outcomes as choices; picking one records it and moves the item straight into that outcome's own
  section (Couldn't Reach Them Yet → Shopping for New Coverage → Renewing/Keeping As-Is →
  Declining/Letting It Lapse, in that order — Couldn't Reach and Shopping first since those still
  need more attention). Picking "Couldn't reach them yet" creates a reminder 3 days out ("Try
  again — couldn't reach about {product}"); picking "Shopping for new coverage" creates one 14
  days out ("Check in on new coverage shopping — {product}") — both show up on the Reminders tab
  and the client's own profile like any other reminder. "Renewing"/"Declining" don't create a
  reminder since both are settled either way. Undo still exists on a resolved item and clears the
  outcome, moving it back to Needs Outreach if it's still time-sensitive.
  **Left alone:** the separate "Mark Conversion Pending"/"Mark Converted" workflow on a term
  product's own card — this doesn't feed into or trigger that, they're two different tracking
  systems for two different things (this is "did I talk to them and what did they say," that one
  is "are they actively getting a new policy issued"). If you want those connected later (e.g.
  picking "Shopping for new coverage" also flips the product to Conversion Pending automatically),
  say so and I'll wire it up.
  **SQL to run** (Supabase SQL Editor, additive/non-destructive):
  ```sql
  alter table public.client_products add column if not exists outreach_outcome text;
  ```

- **"Shopping for new coverage" re-enters the sales pipeline — BUILT 9/8, same day.** Karina: "does
  it move to lead section so the advisor can start working on it and then mark it quotes when a
  quote is sent... so it doesn't get left and forgotten." Yes now — picking that outcome also sets
  the client's pipeline stage to Lead (the same `stage` field the Client Pipeline card and the
  Clients page's stage filters already use), so they reappear in the normal pipeline and get moved
  forward by hand exactly like any other prospect (Quoted once a quote goes out, Applied, Issued).
  Only "Shopping for new coverage" does this — the other three outcomes don't touch stage at all.
  **One thing worth knowing:** `stage` is a single field per client, not per policy — for a client
  who already has other coverage marked Issued, this overwrites that back to Lead too, since there's
  no way to say "just this one policy is up for replacement, the rest of their file is fine" without
  a bigger change. That's what you described, so that's what it does, but flagging it in case it
  causes confusion once you're using it for real — a currently-Issued client whose old term policy
  goes up for renewal will show back up as a Lead. If that turns out to be the wrong call for that
  case, let me know and I can make it smarter (e.g. only reset stage if they're not already further
  along, or track it separately from the main pipeline stage).
  **No SQL beyond the migration in the previous entry.**

- **"Forgot password?" on the login page — BUILT 9/8, same day, urgent.** Karina got locked out
  on a different device: "I'm trying to log in from a different device, and I don't remember my
  password, and there's no option for that. So I should get a reset email or a one time code to
  log in ... or if I wanna reset my password." Two things:
  1. **Immediate unblock (no deploy needed):** told Karina to use Supabase Dashboard →
     Authentication → Users → find her row → the row's ⋯ menu → "Send password recovery" /
     "Send magic link," so she isn't stuck waiting on a build+deploy cycle to get back in.
  2. **The actual feature**, new `/forgot-password` page, linked from a new "Forgot password?"
     line under the password field on `/login`. Leads with the same choice she asked for:
     - **"Email me a one-time code"** — sends a 6-digit code (Supabase's email-OTP flow) that she
       types into a form right here on the site (no link to click) and is signed straight in.
       Deliberately code-entry rather than a magic link: no link means nothing for an email
       provider's automatic link-prescanning to accidentally burn before she gets to click it —
       the same failure mode the `/auth/confirm` page's comments describe for invite links.
     - **"Reset my password"** — emails a link that lands on the existing `/set-password` page
       (same redirect target the admin-invite flow already uses to invite new agents), where she
       sets a new password. No new page needed there — it already handles a fresh recovery
       session the same way it handles an invite.
     Both options show a generic "check your email" message regardless of whether the address is
     on file — matches how Supabase's own API behaves (never reveals whether an email is
     registered) rather than leaking who has an account.
     **No SQL needed.** One thing to know about Supabase project settings, not a to-do: this reuses
     `/set-password` as the reset-link landing page, which is already an allowed redirect URL
     (proven by the invite flow already using it), so no dashboard config change should be needed
     for the reset-link option. The one-time-code option relies on Supabase's default "Magic Link"
     email template including the numeric code — if her code emails ever show up without an actual
     code in the text, that template needs the `{{ .Token }}` variable added in Supabase Dashboard
     → Authentication → Email Templates, but this is expected to work out of the box.

- **"Renewing / keeping as-is" split into two separate outcomes, each with real follow-up
  actions — BUILT 9/8, same day.** Karina, looking at that combined outcome: "if its renewing or
  keeping as is we need actions. renewing should move to lead. keeping as is should just go back
  to issued and be done until the next date there should be a follow up." So that one outcome is
  now two:
  - **"Renewing — new policy"** (was half of the old "Renewing / keeping as-is") — behaves like
    "Shopping for new coverage" now: moves the client's pipeline stage to Lead so the advisor
    works it forward (Quoted, Applied, Issued) the same as any new prospect. No follow-up reminder
    (same as shopping) — the pipeline itself is the tracking now.
  - **"Keeping current coverage as-is"** (the other half) — moves the client's pipeline stage to
    Issued (nothing to actively work — the existing policy just continues) and now REQUIRES a
    next follow-up date before it'll save, picked from a small inline control that opens right in
    the Outreach row: quick "1 yr" / "2 yrs" buttons, or a custom date/time via "Confirm." That
    date becomes a real Reminder ("Renewal check-in due — [product]"), so it resurfaces on its own
    at the date picked, exactly like the outreach reminders already do for the other outcomes.
  Both directions still overwrite the client's pipeline stage the same way "Shopping" already did
  (same caveat as before: `stage` is one field per client, not per policy) — at the time this was
  built, "Declining" and "Couldn't reach them" were unchanged; see the next entry for Declining.
  **SQL:** none — reuses the existing `outreach_outcome` text column (no DB check constraint on
  it, same as before), just a new value the app code now understands.

- **"Declining / letting it lapse" gets the same follow-up treatment — BUILT 9/8, same day, right
  after the entry above.** Karina: "for declining and letting lapse we need actions too." Asked
  her two clarifying questions on exactly what: whether it should move the client's pipeline stage
  to the existing Declined value, and whether it needed a follow-up reminder like "Keeping as-is"
  just got. She was unsure on the first ("did they decline to continue coverage or what is it,
  letting lapse is same I guess") but confirmed yes on the reminder, so this went with the
  straightforward reading — declining/lapsing IS what the existing Declined pipeline stage already
  means, so it moves there, same as Keeping moves to Issued and Shopping/Renewing move to Lead.
  Picking "Declining / letting it lapse" now opens the same inline "Next follow-up?" picker built
  for "Keeping as-is" (1 yr / 2 yrs / custom date+time) — that control is now shared by both
  outcomes rather than special-cased to just one. The reminder it creates reads "Check back in —
  lapsed coverage, [product]." Same overwrite caveat as the other stage-changing outcomes — only
  "Couldn't reach them" still leaves stage untouched.
  **If "declining" and "letting it lapse" turn out to need to be two different things after all**
  (one truly final, one worth a real win-back push) — flag it and this can split the same way
  "Renewing / keeping as-is" did, now that there's a working pattern for it.
  **SQL:** none — same `outreach_outcome` column, no new value needed (declining already existed).

- **Outreach view turned into clickable thumbnails instead of one long scrolling page — BUILT
  9/8, same day.** Karina, looking at the Outreach page once it had grown to 7 possible sections
  (Needs Outreach + the 5 outcome categories + the legacy catch-all): "this section should maybe
  have thumbnails like the home page, so you can click into each list to do your outreach if all
  lists are in one long line it can be easy to miss." Landing on `/clients?view=outreach` now
  shows a grid of cards — one per category, same visual language as the home page's dashboard
  cards (count, a short 3-item preview, click through) — instead of every list unrolled top to
  bottom. Clicking a card (`?view=outreach&section=needs|unreachable|shopping|renewing|keeping|
  declining|legacy`) expands into that one category's full working list (the same
  Mark-Touched-Base / Undo rows as before), with a "← All categories" link back to the grid.
  "Needs Outreach" gets the same amber highlight it always had, both as its own card and once
  expanded. Every outcome category shows as a card even at 0 (matches how the Client Pipeline
  card on the home page always shows all 6 stages) — only the legacy "no outcome recorded"
  catch-all is left off the grid entirely when there's nothing in it, same as before. The
  "Outreach" chip badge in the filter row above still counts Needs Outreach specifically, unchanged.
  **No SQL** — purely a rendering/navigation change, same underlying data and query as before.

- **Needs Outreach banner brought back above the thumbnail grid — BUILT 9/8, same day, right
  after the entry above.** Karina, right after seeing the grid: "show a few, maybe three to five,
  above still, like, across the whole page, and then have those boxes underneath just so that
  there's something there and you see red — so you're like, okay, this has gotta be worked on
  urgently." The grid's counts alone didn't convey urgency the way actually seeing a couple of
  real names did. So the Outreach landing view now has, top to bottom: a full-width "Needs
  Outreach" banner (up to 5 real names/products/dates, turns red — same border/background as the
  home page's Time-Sensitive card — the moment anything's in it), then the thumbnail grid of every
  category underneath, unchanged. The banner links straight into the same "Needs Outreach" full
  list the grid's own card does. Only shown on the grid landing view — once a category's expanded,
  the banner steps aside since you're already looking at a full list.
  **No SQL** — same data, just a second (now more visible) way of surfacing it.

- **Needs Outreach banner made directly actionable, not just a preview — BUILT 9/8, same day,
  right after the entry above.** Karina asked: "once you address one and move it to a category,
  will another one push up in? So there's always constantly five there." Yes — and to make that
  actually usable, the banner's 5 rows are now the same live Mark-Touched-Base/Undo rows as the
  full list, not static preview text you had to click through to act on. Since needsOutreach is
  freshly queried and re-sorted on every page load, and marking one touched base already
  revalidates this page, addressing a row here drops it out of the list and the next-soonest item
  takes the 5th slot automatically the next time the page renders — no separate "refill" logic
  needed, it just falls out of always taking the top 5 of the current list. (Had to drop the
  banner's outer Link wrapper for this — a `<select>`/button nested inside an `<a>` doesn't work
  right — so it's a plain card now with its own small "View all N →" link at the bottom instead.)
  **No SQL.**

- **Outreach categories now "graduate" items out instead of holding them forever — BUILT 9/8,
  same day, flagged as needing real testing before it's trusted.** Karina: "is that going to
  filter out so eventually it's not a thousand different things in there?" then walked through
  each outcome. Rules built, exactly as she gave them:
  - **Couldn't reach them yet** — unchanged. "That's fine, that's not good to stay as is."
  - **Shopping for new coverage** — stays put through Lead/Quoted. The moment the client's
    pipeline stage reaches Applied, it now shows under **Renewing — new policy** instead (without
    you having to re-pick anything — it's computed live from the client's current stage every time
    the Outreach page loads, not written into the stored outcome).
  - **Renewing — new policy** (whether it started there or arrived from Shopping above) — stays
    visible until the client's pipeline stage reaches **Issued**, then drops off the Outreach page
    entirely. "Once it's in the issued state, it should move out of that category."
  - **Keeping current coverage as-is** / **Declining / letting it lapse** — both drop off the
    Outreach page **14 days** after you record the outcome (she asked what I'd recommend; picked
    14 as long enough to double-check what was recorded, short enough not to clutter — it's one
    constant, easy to change).
  Nothing about this ever deletes or overwrites data — `term_contacted_at` and `outreach_outcome`
  on the product stay exactly as recorded, permanently. This only changes what still shows up on
  the Outreach page today; everything is recomputed fresh on every page load from the CURRENT
  client stage and the recorded date, so it stays right no matter where or how a stage got changed
  (her own profile, elsewhere) — nothing to keep in sync, nothing that can drift out of date.
  **Also added, since she asked for it in the same message:** the client's own product now shows
  this record too — "Outreach: Keeping current coverage as-is — Sep 8, 2026" (or whichever
  outcome) right on the product card in Products, which wasn't visible anywhere outside the
  Outreach page before.
  **Known gap, not covered:** if a client's stage moves to Declined while they're mid-"Shopping"/
  "Renewing" on a DIFFERENT product (e.g. they declined the new policy after applying), that
  product doesn't auto-drop — the advisor would mark that product's own outcome as Declining to
  resolve it. Not something she described, flagging it as a real edge case worth knowing about
  rather than guessing at a rule for it.
  **Karina flagged this needs real testing** — walking through Shopping → Applied → Renewing →
  Issued → drops off, and Keeping/Declining → 14 days → drops off, on a real test client (or a
  few, with her team) before trusting it day to day.
  **No SQL** — same columns as before, this is purely how the Outreach page reads and displays
  them.

- **Undo now deletes the reminder it auto-created — BUILT 9/8, SQL REQUIRED.** Karina sent a
  screenshot of the Reminders page with a pile of leftover "Try again — couldn't reach..."
  reminders: "if you do undo, the reminder should get removed as well... it's autogenerated."
  She was right — undoing an outcome cleared the product but left its auto-created reminder
  (from "Couldn't reach them," "Shopping," "Keeping," or "Declining" — all four create one) sitting
  in Reminders forever with nothing pointing back to it. Fixed by tracking, on the product itself,
  the exact reminder id created for it (`outreach_reminder_id`) — Undo now deletes that specific
  reminder, then clears the outcome, exactly reversing what marking it did.
  **This does NOT retroactively clean up the reminders already stranded from before this fix** —
  those rows have no id recorded to look up (the column didn't exist yet when they were created),
  and there's no reliable way to match a reminder back to a product after the fact once several
  "Try again" reminders for the same product exist, like in her screenshot. Those need a one-time
  manual Delete on the Reminders page — going forward, new ones won't pile up this way.
  **SQL required:**
  ```sql
  alter table public.client_products add column if not exists outreach_reminder_id uuid references public.reminders(id) on delete set null;
  ```

- **Meeting location wasn't clickable and could overhang its card — BUILT 9/8.** Karina sent a
  screenshot of a client's Meetings & Calls card with a Cal.com video link
  (`https://app.cal.com/video/...`) sitting there as plain text, running past the edge of the
  card: "a link should be clickable and should not overhang." Turned out the global Meetings tab
  already handled this correctly (built back on 9/3 — detects a URL and makes it a real clickable
  link that truncates instead of overflowing), but the client profile's own Meetings & Calls card
  is a separate, older component that never got the same fix. Brought it up to the same behavior:
  a location starting with `http(s)://` is now a real link (opens in a new tab); anything else
  (a plain address, "In-person meeting") still shows as plain text. Also added the `min-w-0`
  Tailwind needs for truncation to actually work inside a flex row like this one — without it, a
  long unbroken URL can still push past the card's edge even with `truncate` applied, so this was
  a real (if narrow) gap in the 9/3 fix too, not just something missing from the client-profile
  card. No visual change for a short location like a street address — only long links stop
  overhanging and gain an underline.
  **No SQL** — this is a display-only fix, same `location` column and data as before.

- **Client page sidebar reordered, Schedule a Call combined into Meetings & Calls — BUILT 9/8.**
  Karina: "On the client page, it should be pipeline reminders, schedule a call, meetings and
  calls. Client analysis, full analysis, and then medical report link. That's the order I want it
  in. Um, should schedule a call be combined with meetings and calls? So it's one. What do you
  think? Okay. Yeah." Sidebar order on a client's profile page is now: Pipeline Stage → Reminders
  → Meetings & Calls → Client Analyses → Full Financial Analysis → Medical Report Link. "Schedule
  a Call" is no longer its own separate card — its buttons (Open Scheduling Page / Copy Link to
  Send / Book Here) now live inside the "Meetings & Calls" card, above the meeting list, separated
  by a thin divider. `ScheduleCallCard` no longer draws its own border/heading (it did before, and
  used to be a standalone card); it's built to be embedded now, so it also updated its other use —
  the "+ Schedule a Call" popup on the global Meetings tab — which now supplies its own divider
  where the card's border used to be, so that popup keeps its same look. Functionality unchanged,
  this is purely layout/order.
  **No SQL** — no schema or data involved.

- **Client link for the Financial Needs Analysis — BUILT 9/9, SQL REQUIRED.** Karina: "can we
  generate a link to end out for the financial needs analysis" (send out). Confirmed she meant the
  whole Full Financial Analysis (goals, cash flow, net worth, debt, and protection/insurance
  needs) as a client self-fill link — same idea as the existing Medical Report Link, not just the
  Protection section and not a read-only report link.
  New `clients.financial_analysis_token` (random uuid, unique, defaulted — same pattern as
  `medical_report_token`) and a new public route `/financial-analysis/[token]`, resolved with the
  admin client exactly like the Medical Report link resolves its token. A new
  `FinancialAnalysisLinkCard.tsx` under the "Full Financial Analysis" sidebar card shows/copies
  it. The public page uses its own component (`PublicFAClient.tsx`) rather than reusing the
  advisor's `FAClient.tsx` directly — it needed a few real differences: no editable "Advisor on
  this case" panel (shown read-only instead), no placeholder tabs like Liquidity/Retirement/
  Client Report that only make sense internally, client-facing copy ("Your info" instead of
  advisor-facing labels), and — the main one — a Save button that's reachable from every tab, not
  just the first one (the advisor tool's Save only lives on its Dashboard tab, which is fine for
  an advisor who built the muscle memory, but a client filling this out over several sittings
  needs to be able to save from wherever they left off). Both write to the exact same
  `client_financial_plans` row/shape, so answers a client saves show up immediately in the
  advisor's own Full Financial Analysis tool and vice versa — one shared plan, two doors in, same
  approach as the Medical Condition Report.
  **Also found and fixed a real bug while building this**: `/medical-report` links were never
  added to the login-wall's public-paths list (`src/proxy.ts`) back when that feature was built —
  meaning a client who was actually logged out (the normal case) and opened their Medical Report
  link would have been redirected to the login screen instead of the form. Added both
  `/medical-report` and `/financial-analysis` to that list now, so this is fixed for both going
  forward — worth mentioning in case any client reported a Medical Report link "not working" and
  it got shrugged off, since this was the reason.
  **SQL required:**
  ```sql
  alter table public.clients add column if not exists financial_analysis_token uuid default gen_random_uuid();
  update public.clients set financial_analysis_token = gen_random_uuid() where financial_analysis_token is null;
  alter table public.clients alter column financial_analysis_token set default gen_random_uuid();
  alter table public.clients alter column financial_analysis_token set not null;
  create unique index if not exists clients_financial_analysis_token_idx on public.clients(financial_analysis_token);
  ```

- **Intake Link — several fields switched from optional to required — BUILT 9/9.** Karina, about
  the per-advisor Client Intake Link (`/intake/[advisorId]`, `IntakeForm.tsx`): "the link that goes
  out... unique to every agent... it says gender optional, that should not be optional. We need to
  know their gender. Household optional, that's fine. Health should not be optional. We need to
  know those things. Financial coverage products optional is fine... money type, we need to know...
  that financial section should not say financial optional. It should say existing coverage such
  products is optional, but money type, other retirement accounts, funding method, annual income
  should not be optional. Total debt can be optional. Goals optional, that's not optional. We need
  to know their primary goals or time horizon, risk tolerance, and their need before fifty nine and
  a half."
  Changed, on the public Intake form only (the advisor's own internal Client Analyzer tool,
  `client-analyzer/AnalyzerClient.tsx`, is a separate component and untouched — it still lets an
  advisor skip anything mid-call):
  — **Now required** (the "optional" badge/label removed, a real answer enforced before submit,
  and the "Skip"/"Unsure" choice removed from each so it can't be picked instead of answering):
  Gender, Tobacco Use, Health Conditions, Previously Declined or Rated?, Money Type, Other
  Retirement Accounts?, Funding Method, Annual Income, Primary Goal(s), Time Horizon, Risk
  Tolerance, Needs Access Before 59½?. The "Health", "Financial", and "Goals" section headers no
  longer say "(optional)" either.
  — **Left optional, unchanged** (Karina confirmed both by name): Existing Coverage / Products,
  Total Debt. "Family (optional)" / Household also unchanged — she said that one's fine as-is.
  — **Not touched** (not named, so left as they were): Approximate Other Retirement Amount, Monthly
  Budget, Lump Sum Amount, Periodic Contribution Amount, and "How Often" (periodic frequency) — all
  four only ever show up conditionally under an already-required parent field anyway.
  **No SQL** — this only changes which fields the form requires before it lets someone submit;
  same columns and submission path as before.

- **Invite Agents page — shows whether each agent accepted their invite yet — BUILT 9/9.** Karina:
  "the agents, is there a way to see if they accepted the invite or not." There wasn't — the
  `profiles` row for an invited agent gets created the moment the invite is SENT (a DB trigger,
  not tied to acceptance at all), so nothing on that table said whether they'd actually opened it.
  Pulled the real signal from Supabase Auth instead: `last_sign_in_at` is null until an agent
  clicks their invite link (that's what actually starts their session — happens right when
  `/set-password` loads, even before they've typed a password). Each row in "Your Team" now shows
  an amber "Invite Pending" badge next to their name until that happens, and once it has, "last
  signed in [date]" under their email (updates every time they log back in, not just the first
  time — a live read of whether they're actually using it, not just a one-time acceptance flag).
  Removed agents are unaffected — they keep the existing red "Removed" badge instead.
  **No SQL** — nothing new stored; this only reads data Supabase Auth already had.

- **Small wording fixes — "Invite Agents" → "Invite Advisor", Intake page intro trimmed — BUILT
  9/9.** Karina: "Can the invite agents tab be called invite adviser? And even that page should be
  called invite adviser." Renamed both nav entries (mobile drawer and the desktop user menu) and
  the page's own heading from "Invite Agents" to "Invite Advisor" — same page/route, wording only.
  Separately, on the public Intake link: "It says 'a few quick questions for... and then it's the
  adviser's name to review before your first meeting.' I think it should end there, not have that
  other part of the sentence." That page's intro used to continue past "before your first
  meeting" with "— so we can come prepared with real options instead of starting from scratch."
  That trailing clause is gone now; the sentence ends at "before your first meeting."
  Also discussed, no changes made: a live premium calculator by age/height/weight (she raised it
  then talked herself out of it — "every carrier is different," wasn't sure it's even possible —
  so nothing built; happy to dig into feasibility whenever you want to actually pursue it). Hiding
  the Downloads tab — she reversed herself on this one too, leaving it as-is. Team page — she said
  it's fine as it is.
  **No SQL** — wording only.

- **App icon replaced — BUILT 9/9.** Karina: "how do we change this icon?" (screenshot of the
  browser tab showing the old black-circle/triangle mark next to "GP Advisor Portal"). That icon
  wasn't part of any page's markup — it's the site's favicon/app icon, generated from a handful of
  image files. She uploaded the new layered-chevron mark (512×512, on the same cream background
  the rest of the portal uses); regenerated all four files from it: `src/app/favicon.ico`
  (16/32/48/64px, browser tab icon), `public/icon-192.png` and `public/icon-512.png` (Android/PWA,
  referenced from `manifest.json`), and `public/apple-touch-icon.png` (180px, iOS "Add to Home
  Screen"). Nothing else needed changing — the "GP Advisor Portal" text next to it in the nav bar
  is a separate, plain text link, untouched.
  **No SQL** — static asset files only.

- **New Pre-Intake link — a lighter first-touch form for prospects who don't yet know it's life
  insurance/annuities — BUILT 9/9.** Grew out of the "before your first meeting" wording
  discussion: Karina, once we talked through it — "Yes. There should be a pre intake form...
  This would be for somebody that is booking a meeting based on us saying, oh, you know, we do
  financial and legacy planning, but we haven't exactly told them that it's life insurance and
  annuities... if you talk to somebody and they're like, oh yeah, I wanna book a meeting, I wanna
  learn more about this, and you haven't told them that it's through life products, then you
  would send them the pre intake, and we need to highlight that in the description above the
  link."
  New public route `/pre-intake/[advisorId]` (reuses the SAME custom link handle as the existing
  Intake link — `profiles.intake_slug` — nothing new to configure), a new `PreIntakeForm.tsx`
  with a deliberately short question set: name, phone, email, "What's on your mind? What would
  you like to accomplish?" (required), and two optional ones — approximate amount they're
  thinking of investing, and timeline (Right away / In the next few months / Just exploring).
  Nothing about health, money type, or funding — anything that would tip off it's an insurance
  conversation before that conversation has happened. On submit it creates a real client (source
  "Pre-Intake Form", flagged for review, same as the regular Intake link) and drops everything
  they answered into one note on Notes & Interaction History — no recommendation is run (there
  isn't nearly enough here — no DOB, no health, no financials — for that to produce anything
  trustworthy).
  On the Profile page, a new "Your Pre-Intake Link" card sits directly above the existing intake
  card (now relabeled "Your Full Intake Link"), each with the description she asked for right
  above its link explaining exactly when to send which one.
  **Also discussed, no changes made:**
  — Whether the forms should ask what day/time the client wants to meet. My take, for what it's
  worth: I'd leave that out of both forms and keep using the existing Schedule a Call / Cal.com
  flow for booking — baking a date picker into these forms would mean re-solving availability and
  conflicts that Cal.com already handles, for no real gain. Open to adding a simple "preferred
  time" free-text field to either form instead if you'd rather ask than route people to Cal.com.
  — The full Intake form can still be filled out live together with a client (open it yourself on
  a call) or sent for them to fill out on their own — that's existing behavior on that link,
  unchanged; the new Pre-Intake link works the same either way too.
  **No SQL** — reuses the existing `clients`, `client_notes`, and `profiles.intake_slug`.

- **Pre-Intake → Intake no longer creates a duplicate profile — BUILT 9/9.** Karina asked directly:
  "if they do the pre intake, it creates their profile, and then they do the intake form after —
  is it going to match to their current profile, or is it going to create a whole new profile for
  them? We wanna make sure it doesn't create a new profile, and also we want to make sure that two
  people with the same name don't get mixed up. And I think the way to track that is by making the
  phone number and email mandatory." Good catch — until now, both public forms just always
  inserted a new client, so submitting Pre-Intake and then the full Intake (in either order, or
  either one twice) would have created two separate profiles for the same person.
  New shared helper (`src/lib/client-matching.ts`, used by both `intake/[advisorId]/actions.ts`
  and `pre-intake/[advisorId]/actions.ts`): before creating a client, look for an existing one
  owned by that SAME advisor with a matching phone OR email — deliberately never matched by name,
  exactly per her ask, since two different people can share a name but not both a phone and an
  email. A match updates that existing client (fills in whatever the deeper form asked that the
  earlier one couldn't have, flags it for review again) instead of inserting a new row; no match
  still creates a new client exactly as before. A matched client's pipeline stage and lead source
  are left untouched either way — filling in more info about someone shouldn't reset where they
  already are.
  Both forms already required phone AND email before this (confirmed, no field changes needed) —
  that's exactly what makes the matching reliable.
  **One known edge case, flagged rather than silently ignored**: if a submitted phone matches one
  existing client and the submitted email matches a completely different existing client, it picks
  whichever of those two was created first. That needs two different existing clients to each
  separately share one piece of contact info with the new submission — rare, but technically
  possible, so worth knowing about rather than assuming it can't happen.
  **No SQL** — matching logic only, same columns as before.

- **Per-advisor email notification toggles + new-intake/reminder alert emails + 90-day conversion
  window fix — BUILT 9/9.** Karina, after agreeing "Email only, for now" for the new-intake alert:
  "Before you build that, we also need to give control to the adviser that, like, do they want
  email notifications, or are they just gonna be in the habit of checking their portal? Because
  agents might get overwhelmed with multiple emails. So let's have that option built in as well
  right away, and then give the adviser the option to also get email alerts for those time
  sensitive reminders that are coming up automatically." Then, clarifying scope: "just the auto
  ones" (not manually-added reminders) and "it is 90 days not 60 days" (the conversion-deadline
  window). "Both default ON" for the two toggles.
  Two new toggles on My Profile, under a new "Email Notifications" card — **New intake submitted**
  and **Time-sensitive reminders** — each independently on/off, saved instantly, both default ON
  for every advisor (new `profiles.notify_new_intake_email` / `notify_reminder_email` columns).
  New shared email helper (`src/lib/email.ts`) sends through Resend's API (no new npm dependency —
  plain `fetch`, same as everything else in this codebase) — it needs `RESEND_API_KEY` and
  `REMINDER_FROM_EMAIL` set in Vercel's environment variables to actually send anything (see
  `.env.local.example`, "Phase 3"); until then it silently skips sending rather than erroring, so
  nothing breaks in the meantime. **This is still the one piece you need to set up**: sign up at
  resend.com (free tier is plenty), grab an API key, add `RESEND_API_KEY` and `REMINDER_FROM_EMAIL`
  to the project's environment variables in Vercel, redeploy — once that's done both alert types
  below start actually sending, no other change needed.
  — **New-intake alert**: wired into both `intake/[advisorId]/actions.ts` and
  `pre-intake/[advisorId]/actions.ts` — right after a Pre-Intake or full Intake form is submitted,
  if the owning advisor has that toggle on, they get an email with the client's name and a link
  straight to their profile.
  — **Reminder alert**: new shared helper `src/lib/reminder-notify.ts`, called from both daily
  crons (`check-birthdays`, `check-conversion-deadlines`) right after each one creates its
  automatic reminder — if the owning advisor has that toggle on, they get an email with the same
  message that landed in their Reminders list. Deliberately scoped to just the three automatic
  reminder types (18th birthday, 59½ annuity milestone, conversion deadline) per her "just the auto
  ones" — a manually-added reminder never emails anyone. No separate "how far in advance" setting
  needed: the conversion-deadline cron already creates its reminder 90 days ahead of the deadline,
  and the birthday cron creates its reminder the day the milestone happens — the reminder being
  created already IS the heads-up, so the email just rides along at that same moment.
  — **90 vs 60 days**: while in there, fixed the conversion-deadline cron's window from 60 days to
  90 days, per her correction — both the no-exam and final (exam-required) conversion reminders now
  fire 90 days out instead of 60, in both the query window and the reminder message text.
  **Not built this round — asked, not yet decided**: real calendar sync (a meeting created in the
  portal automatically showing up on an advisor's own Google/Outlook/Apple calendar). Confirmed
  what exists today: Cal.com sync is one-way and inbound only (a booking made through an advisor's
  own Cal.com link creates a meeting in the portal — nothing flows the other direction), and the
  only way a portal-created meeting gets onto a personal calendar today is the manual, per-meeting
  "Add to Calendar" (.ics download) button. True two-way sync would mean building Google Calendar's
  OAuth flow from scratch (already anticipated as unbuilt "Phase 4" in `.env.local.example`) — a
  much bigger, separate project requiring her to set up a Google Cloud project. A smaller middle
  ground exists now that this delivery adds real email-sending: emailing a calendar-invite (.ics
  attachment) whenever a meeting is created/edited, which most calendar apps auto-offer to add —
  not built, waiting on her steer on which direction (or neither, for now) she wants.
  **SQL required:**
  ```sql
  alter table public.profiles add column if not exists notify_new_intake_email boolean not null default true;
  alter table public.profiles add column if not exists notify_reminder_email boolean not null default true;
  ```

- **In-portal "Getting Started" walkthrough — BUILT 9/9, SQL REQUIRED.** Karina: "can we build a
  getting started step so completing your profile? Like, setting up your links, linking your
  calendars and step by step of what they need to do... they can either do that right away as
  soon as they make the account, or they can return to it later, and they can restart it at any
  time that they need a refresher."
  New page, `/getting-started`, reachable any time from the account menu (both desktop and
  mobile) — six steps: Complete Your Profile, Set Your Custom Link, Know Your Two Links, Connect
  Your Calendar, Review Your Notification Settings, Try It With a Client. Each has a plain-language
  explanation and a button straight to where you actually do it.
  Three steps auto-detect as done from real profile data (filled-in profile, custom link set,
  Cal.com connected) — no separate flag, so they can't drift out of sync with reality. The other
  three (no natural DB signal — they're explanations/actions, not fields) are a manual "Mark as
  done" checkbox. "Restart Walkthrough" clears just those manual checkmarks so someone can walk
  through it again as a refresher — it can't touch the auto-detected ones, since those just
  reflect whatever's actually true about the account.
  Also added a dismissible "Finish setting up your account" banner at the top of Home, shown until
  either all six steps are done or an advisor dismisses it — that's the "right away" path; the
  account-menu link is the "come back later" path, and it stays available either way.
  **Not literal screenshots, on purpose**: each step has a small custom line-icon in the same
  style already used on the Home dashboard cards, instead of real screenshots of the app — a
  screenshot goes stale the moment a page's layout changes, an icon doesn't. Happy to swap in real
  screenshots later if you'd rather, once you've seen this live.
  **SQL required:**
  ```sql
  alter table public.profiles add column if not exists onboarding_steps jsonb not null default '{}'::jsonb;
  alter table public.profiles add column if not exists onboarding_dismissed_at timestamptz;
  ```

- **Getting Started redesigned into an in-context "click here" tour — BUILT 9/9, same day, no new
  SQL.** Karina, right after trying the checklist-style first draft: "Me clicking the getting
  started deleted all of my existing stuff. I don't think that the getting started or restarting
  should delete what was already inputted... I want it so that it highlights where the person is
  supposed to click and where they're supposed to input the info... you know when you get a new
  platform and it says, oh, click this, it highlights, okay, click here, this is your profile...
  and then you go next, and then it goes to the next step."
  **On the reported deletion**: traced through every place the first draft touched the database —
  the "Mark as done" checkboxes and "Restart Walkthrough" button only ever wrote to one new field,
  `profiles.onboarding_steps`. Neither could touch a name, phone, link, Cal.com connection, or any
  client — those live in entirely separate columns/tables that nothing in that feature ever wrote
  to. What "Restart" actually did, by design, was clear the 3 manual checkmarks back to unchecked
  — which reasonably reads as "my stuff got deleted" even though no real data was at risk. Rather
  than just relabel that button, the redesign below removes the concept of a resettable checkmark
  entirely, so there's structurally nothing left that a "restart" could ever appear to delete.
  **New design**: "Getting Started" (still reachable any time from the account menu) is now a
  short landing page with a "Start the Tour" button and a live, read-only status of the 3 things
  that have real signals (profile filled in, custom link set, Cal.com connected) — not
  checkboxes, just a reflection of what's actually true on the account right now. Clicking Start
  launches an overlay that spotlights the real field or button on the real page — Complete Your
  Profile and Set Your Custom Link and Know Your Two Links and Connect Your Calendar all on My
  Profile, then Try It With a Client on the Clients page — with a tooltip bubble (title,
  explanation, Back/Next/Skip) that follows you across those two pages. Built by hand (no new npm
  dependency, matching how this project avoids adding libraries where a small amount of code does
  the job — same reasoning as `src/lib/email.ts` using plain `fetch` instead of Resend's SDK): a
  CSS box-shadow ring highlights the target element and dims everything else, sized/positioned
  live off the real element's on-page location, while a tooltip card floats near it with the
  step's copy and controls. New files: `TourEngine.tsx` (the overlay + a `useTour()` hook any
  button can call to launch it, mounted once in `layout.tsx` so it survives navigating from
  Profile to Clients mid-tour) and `tour-steps.ts` (the 6 stops, each naming a page and a
  `data-tour="..."` selector — those attributes are now on the real Profile/Clients elements).
  Stores no per-step progress anywhere — relaunching the tour just replays it against whatever's
  real on the page that moment, so there's nothing to reset and nothing to lose.
  Old files removed: `StepToggle.tsx`, `RestartButton.tsx`. `profiles.onboarding_steps` (added
  earlier today) is no longer read or written by anything — left in place rather than dropped,
  same additive-only convention as everywhere else in this schema; `onboarding_dismissed_at` is
  still used, unchanged, for the "finish setting up" banner on Home (now says "Take the Tour").
  **No new SQL** — nothing here needed a new column.

- **Real bug found and fixed: My Profile's Save could silently wipe real saved data — BUILT 9/9,
  no new SQL.** Karina confirmed her name/phone on My Profile actually got cleared — not the
  onboarding checkmarks from earlier today, her real profile fields. This is a pre-existing bug in
  `updateMyProfile`/`ProfileInfoForm.tsx` (both written well before today, never touched by any of
  today's onboarding work) — most likely trigger: the read that loads My Profile
  (`supabase.from("profiles").select(...).single()`) had its `error` silently thrown away —
  `const { data: profile } = await ...` — so if that read ever failed (even briefly), the page
  rendered a completely blank, fully-editable, fully-saveable form instead of any kind of error.
  Save has always unconditionally overwritten every field with whatever the form currently held,
  with nothing stopping an all-blank submit from clobbering real data — so a save from that blank
  state would wipe first/middle/last name, phone, NPN, and scheduling link in one shot.
  **Two-part fix:**
  1. That read's `error` is no longer ignored — if it fails, My Profile now shows a plain red
     "Couldn't load your saved info right now" message instead of a blank form, and doesn't render
     the (Save-able) form at all in that state, so there's nothing there to accidentally overwrite
     good data with.
  2. Independent of the above, added a last-line-of-defense guard on Save itself: if name AND
     phone are BOTH blank at submit time, a confirmation ("Saving will clear them if they were set
     before — continue?") has to be accepted before it goes through. Doesn't get in the way of
     clearing one field on purpose (e.g. removing just a scheduling link) — only catches the
     specific catastrophic case of wiping identity fields at once, which should never happen by
     accident.
  **Also fixed while in there**: the Email Notifications toggle switches — the white circle had no
  explicit anchor position (`left-0.5` was missing from `NotificationPreferencesCard.tsx`), so the
  "off" position relied on the browser's implicit fallback instead of an explicit value, which is
  exactly the kind of thing that renders inconsistently. Now explicitly anchored left with a clean
  transform to the right when on — matches how every other toggle in the app already behaves.
  **What I can't do from here**: recover what was actually cleared — that's real data loss with no
  undo button on my end. Re-entering name/phone/NPN/scheduling link on My Profile is the only way
  forward unless Supabase point-in-time recovery is enabled on your project (Settings → Database →
  Backups) and you'd rather restore from a snapshot than retype three fields — probably not worth
  the effort for this specific case, but flagging that the option exists.
  **No new SQL** — this fix changes what the page does when a read fails and what Save allows, not
  the schema.

- **Getting Started tour — narrowed to profile setup, motion reduced, 7th step added — BUILT
  9/9, no new SQL.** Karina tried the redesigned tour end to end and gave three pieces of
  feedback:
  1. "It should go down and show them carrier and licensing." Added a 7th (now final) stop —
     `data-tour="carrier-licensing"` on the Carrier & Licensing card in `profile/page.tsx`, new
     entry in `tour-steps.ts`.
  2. "This bouncing when it goes from... there's too much motion." Two real sources, both fixed
     in `TourEngine.tsx`: the scroll-to-target was `behavior: "smooth"` layered on top of the
     spotlight's own CSS position transition (two animations at once), now instant; and the
     polling loop that keeps the spotlight aligned called `setRect` on every 400ms tick
     regardless of whether anything actually moved, so sub-pixel layout noise quietly retriggered
     the position transition and read as a faint continuous "breathing." Now it only updates when
     the position actually changed by more than half a pixel.
  3. "When it goes to try with a client... it literally just freezes, and then I have to click
     finish." This was the tour's last step leaving My Profile to spotlight "+ New Client" on
     Clients — the overlay stayed up and blocked the real button until Finish was clicked, which
     defeated the point of that step. Rather than patch the freeze, removed the step: Karina's own
     read on it — "that profile needs to be set correctly for everything else to flow... I'm
     leaning towards that getting started thing just being the profile setup" — is the right call.
     A client can start from Pre-Intake, full Intake, or a manual add, and meetings, reminders,
     and illustrations are a whole layer beyond that; trying to fold all of that into one
     interactive tour was going to keep growing. That part is better as live team training or a
     short video instead. The tour is now 6 stops, all on My Profile, ending at Carrier &
     Licensing — Getting Started's copy and the account-menu description updated to match.
  **No new SQL** — no schema change, just `tour-steps.ts`, `TourEngine.tsx`,
  `profile/page.tsx`, `getting-started/page.tsx`, and removing the now-unused
  `data-tour="new-client"` from `clients/page.tsx`.

- **Getting Started moved out of the account dropdown — BUILT 9/9, no new SQL.** Karina, off two
  screenshots of the "Karina Bath ▾" menu: "get started should show up before the person's name
  and once completed it should maybe hide at the bottom of the profile page, not in this
  dropdown." Removed the "Getting Started" row from both the desktop dropdown
  (`UserMenu.tsx`) and the mobile drawer (`MobileNav.tsx`) entirely, and replaced it with two
  spots that hand off to each other based on the same 3-signal "done" check already used for the
  Home banner and the getting-started page itself (profile filled in, custom link set, Cal.com
  connected):
  1. **While it's not done**: a green "Getting Started" pill in the top nav, positioned first in
     the right-hand group — before the name/dropdown on desktop, before the hamburger on mobile —
     so it's the first thing a new advisor notices (`layout.tsx`).
  2. **Once it's done**: that pill stops showing anywhere in the header, and a quiet "Need a
     refresher? Restart the Getting Started tour" text link appears at the very bottom of My
     Profile instead (`profile/page.tsx`, new `RestartTourLink.tsx`) — still one click away
     whenever it's wanted, just out of the way once it's no longer needed.
  **No new SQL** — reuses columns already read elsewhere (first/last/phone, intake_slug,
  cal_api_key), no schema change.

- **Invite Advisor page — Removed date shows the year, Team/Removed tabs, alphabetical, search
  bar added ahead of need — BUILT 9/9, no new SQL.** Four small requests off one look at the
  page:
  1. "Removed September eighth. I think it should show the year too." The badge on a removed
     advisor's row now reads e.g. "Removed Sep 8, 2026" (`AgentRoleRow.tsx`).
  2. "I think they should move to another tab... especially for me as admins, because then
     they're mixed in." New `TeamList.tsx` splits the roster into two tabs — Team and Removed —
     instead of one list with a badge buried partway down it.
  3. "This list should be alphabetical order." Changed the query behind it from sort-by-signup-
     date to sort-by-name (`page.tsx`); both tabs inherit that order.
  4. "Undecided on if we need a search bar... but if we think we should have it in the future,
     let's just add it now." Added a name/email search box above the tabs — filters whichever tab
     is open.
  Also answering the "your team" naming question along the way: I'd leave it as "Your Team" —
  this page is admin-only to begin with (the role check at the top blocks anyone else from
  opening it), so "your" already means "the team you, as an admin, are responsible for," which
  matches what you said settled it for yourself. Say the word if you'd rather it read differently.
  **No new SQL** — same columns, just re-ordered and re-rendered.

- **Intake page copy — "before your meeting," not "before your first meeting" — BUILT 9/9, no
  new SQL.** One-word fix on the public Get Started/Intake page's subhead, off a screenshot:
  "before your meeting not first meeting" (`src/app/intake/[advisorId]/page.tsx`).

- **Tobacco Use / Marijuana Use split into two questions — BUILT 9/9, no new SQL.** Screenshot
  of the "Tobacco Use" buttons: "shoul[d] be able to select two options[,] someone could smoke
  tobacco and marijuana." The old control was one 4-way choice — Never used / Former user /
  Current user / Marijuana use (no tobacco) — which forced picking exactly one, so a current
  tobacco smoker who also used marijuana had no correct answer. Split into two independent
  questions instead: Tobacco Use stays a 3-way choice (still mutually exclusive — nobody is both
  a never-user and a current user), and Marijuana Use is now its own separate Yes/No question
  that can be answered either way regardless of the tobacco answer. Changed in three places that
  all share this same data shape: the public Intake form (both required, matching how the rest of
  that form's Health section already works), the internal Client Analyzer tool (both stay
  optional/skippable, matching that tool's Health section), and the PDF export, which now prints
  tobacco and marijuana together on one line (e.g. "Tobacco: current · Marijuana use") since the
  info box only had room budgeted for three lines on that side.
  **No new SQL** — Client Analyzer results are stored as a single `inputs`/`result` jsonb blob
  (`client_analyses` table), not individual columns, so this is purely a shape change to what
  goes into that jsonb — nothing to migrate. Any past analysis saved with the old
  `tobacco: "marijuana"` value just keeps showing that on its own saved PDF/record; only new
  analyses use the split fields.

- **Marijuana Use — reworded off "Marijuana use" as a toggle label, now a 3-way question with a
  stopped-using cutoff — BUILT 9/10, no new SQL.** Karina, on the split from yesterday: "i dont
  like how it say marijuana use on the selection maybe word it as do you use marijuana... and it
  be yes or no and stopped[,] also look into how long someone has to have stopped for it to not
  count and add that in maybe." Two changes:
  1. The field is now phrased as a question — "Do You Use Marijuana?" — with three answers (No /
     Stopped (12+ months) / Yes) instead of the old two-option "No marijuana use"/"Marijuana use"
     toggle. Same shape as Tobacco Use right above it (never/former/current), just simpler
     wording, per what she asked for.
  2. On the lookback: I looked into what carriers actually use here, and it's worth knowing
     before treating this the same as tobacco. Tobacco has a fairly standard ~12-month
     smoke-free window most carriers use for non-tobacco rates. Marijuana doesn't have an
     equivalent industry standard — most carriers today classify CURRENT use by frequency (e.g.
     "occasional," roughly up to 1-2x/month, often still gets non-tobacco rates even though it's
     current use), not by a clean-time cutoff the way tobacco works. The one recurring number
     that does show up is ~12 months, most commonly as how long insurers ask someone to have
     stopped before requesting their policy be re-rated after the fact — so that's what I used
     for "Stopped (12+ months)," matching Tobacco Use's own wording, but it's a reasonable
     default to ask about here, not an industry rule the way it is for tobacco. Worth keeping in
     mind if this ever needs to hold up against a specific carrier's actual guidelines.
  **No new SQL** — same jsonb blob as the split above, just its value shape changed again
  (`"no"`/`"former"`/`"yes"`/`"skip"` instead of `"no"`/`"yes"`/`"skip"`).

- **Marijuana Use — added "Occasional" — BUILT 9/10, no new SQL.** Karina: "maybe it should say
  occasional as an option." Follows directly from the research in the entry above it — occasional
  use (roughly up to 1-2x/month) is the actual line most carriers use to still qualify someone
  for non-tobacco rates even though it's current use, so the form now asks that directly instead
  of lumping every current user together. Now four answers instead of three: No / Stopped (12+
  months) / Occasional (1-2x/month) / Regular use — relabeled the old plain "Yes" to "Regular
  use" so it reads clearly against "Occasional" now that both exist. Same two places as before
  (Intake form, Client Analyzer); PDF export needed no change since it already just prints
  whatever value is on the record.
  **No new SQL** — same jsonb blob, one more possible value in it.

- **9/11 — the big one. Karina's message, verbatim:** "So you just embarrassed me during a
  client meeting. I was doing a financial needs analysis, and that analysis is not fully
  complete. I have told you to complete it. It only went up to protection, liquidity,
  retirement, education, estate, action plan, and client report is not built out. And then,
  also, I told you to put commas everywhere where there's supposed to be money and dollar signs.
  There is throughout this whole thing when you're going into cash flow, there's zeros. There's
  no dollar sign. Also, get rid of the up and down sign because if the mouse scrolls up or down,
  it changes the amount... on the Client analysis... why are the colors still thick black at the
  top? It needs to be minimalistic just like the renderings are for the illustrations... based on
  the answers where we said funding method, thousand dollars lump sum, you are recommending a[n]
  Athene[,] Ascent Pro annuity, which has a minimum requirement for the lump sum... gotta fix the
  colors. All of the PDFs need to match... It needs to be at the bottom center of each page on a
  PDF... I did not get an email when the client did an intake... this client was approved for a
  quote, but they didn't pay for it yet... pending should come after applied, and issued should
  be where pending is in the pipeline... once a client is pending, can we set an automatic nudge
  maybe for three or four days out... the intake form does not have state and location... We
  should also ask for the city and state on the pre intake form... Advisor on this case, adviser
  name, title. I mean, do we really need that because you're the adviser?... Medium term needs to
  be changed to, like, middle or something... there needs to be a next button at the bottom of
  the page on each page... let's get this right because you cannot embarrass me at any more
  meetings."
  Nine things, all BUILT 9/11:
  1. **Sitewide currency formatting.** The Financial Analysis wizard's money fields were a plain
     native `<input type="number">` — no `$`, no commas, no forced cents, and the mouse scroll
     wheel silently changed the value while focused. Rebuilt on `DollarInput`, the same component
     every other money field in the app already uses (`src/app/.../financial-analysis/FAClient.tsx`
     and the public `PublicFAClient.tsx`). Also fixed `formatMoney()` (`illustration.ts`) to
     always show 2 decimals (was skipping them on even dollar amounts) and `fa.ts`'s separate
     `fmt()` the same way, plus two un-decimaled Client Analyzer result lines — so every dollar
     figure across Illustrations, Scenarios, Products, the Client Analyzer, and the full Financial
     Analysis now formats identically. **No new SQL.**
  2. **The five missing Financial Analysis pillars + Client Report, actually built.** Liquidity
     (3-6-months emergency fund, default 6), Retirement (4%-rule/25x capital-needs analysis off
     the client's real age, with an explicit "this doesn't assume future contributions" caveat),
     Education (funding-progress vs. projected cost per dependent), and Estate (2026 federal
     exemption — $15M individual / $30M married — with a loud state-tax-varies caveat since state
     rules aren't modeled) are all real, editable-assumption calculators now, same pattern as the
     existing Protection tab — not hardcoded, everything on each tab is something you can see and
     adjust. Action Plan auto-synthesizes a prioritized gap list pulled from every pillar. Client
     Report is a real "Download PDF" button on its own tab, in the same light/airy style as
     everything else (see #3 below). Overall Financial Wellness Score now blends across all 7
     scored pillars (was hardcoded /6 from when only 3 existed — preserved faithfully until now,
     per fa.ts's own header comment about the original tool never building these). **No new SQL**
     — `client_financial_plans.data` is one jsonb column, so new pillar fields just land in it.
  3. **All PDFs rebuilt to match — no more black header block, branding moved to the bottom.**
     `analyzer-pdf.ts` (Client Analyzer) had a solid black header bar — rebuilt entirely onto the
     same monochrome palette `illustration-pdf.ts` already uses (obsidian/charcoal/sand/gray, no
     green/red/blue — what used to be color-coded, like "Avoid" or "Primary," is now told apart
     by label text instead). The "GENERATIONAL PLAYBOOK" wordmark moved out of every PDF's header
     entirely and into a bottom-center footer on every page, next to GenerationalPlaybook.com
     (which was already down there from an earlier request) — applies to `illustration-pdf.ts`,
     `analyzer-pdf.ts`, and the new `fa-pdf.ts` (Client Report) alike, so all three PDF types now
     look the same.
  4. **Annuity recommendations now check the lump sum against a real minimum.** Client Analyzer's
     recommendation engine (`analyzer.ts`) never checked whether a lump sum could actually open
     the annuity it was recommending. Added a $10,000 minimum check — below that, an insurable
     client's recommendation redirects to an IUL with living benefits, funded by splitting the
     lump sum across the first year's premiums (buying time to build an ongoing monthly budget),
     exactly as described. Deliberately does NOT touch the uninsurable-client branch (annuities
     are recommended there specifically because they require no underwriting — redirecting to an
     underwritten IUL would be wrong for that case).
  5. **"Pending" pipeline stage repositioned between Applied and Issued.** Was sitting after
     Issued (for a different original purpose — an in-force client being worked on new business,
     which still fits fine here too). Reviewed every place in the code that checks a specific
     stage by name (`products.ts`, `StageSelect.tsx`, `clients/actions.ts`) — none of them assume
     array order, so this was a safe reorder. **No new SQL** — `pending` already existed in the
     Postgres enum.
  6. **Automatic 3-day nudge reminder for Pending clients.** New daily cron
     (`api/cron/check-pending-checkins`) — same shape as the existing birthday/conversion-deadline
     crons. **Needs new SQL — see schema.sql section 50** (`clients.stage_entered_pending_at`,
     `clients.pending_checkin_reminder_sent`). Also added a 3rd entry to `vercel.json`'s cron
     list — if your Vercel plan caps the number of daily cron jobs, double-check this one actually
     registers after deploying.
  7. **City/State added to both the Pre-Intake and full Intake forms.** The full Intake form had
     no location field at all (the "Location" field you may be thinking of is a different one, on
     the advisor-facing Financial Analysis form). **No new SQL** — `clients.city`/`clients.state`
     already existed from an earlier request, just weren't wired into either public form yet.
  8. **Financial Analysis "Advisor on this case" simplified.** Name/Email/Phone are now read-only,
     auto-filled from your own logged-in profile (no more typing your own name in) — Title was
     dropped entirely since nothing ever auto-filled it anyway. Also renamed "Medium Term" to
     "Mid-Term" on the Goals tab (matches "Short Term"/"Long Term").
  9. **Next/Back buttons on every Financial Analysis tab**, both the advisor tool and the public
     client-facing link — walks the same tab order as the tab strip up top, scrolls to the top of
     the page on click.

  **On the missing intake email** — I dug into this rather than guessing at a fix. The
  notification code itself is correct and symmetric in both the Pre-Intake and full Intake forms
  (both gate on your own "new intake alerts" toggle in My Profile, default on). The most likely
  real cause is that `RESEND_API_KEY` and `REMINDER_FROM_EMAIL` aren't actually set in Vercel yet
  — `sendEmail()` is designed to no-op silently rather than error when they're missing, exactly so
  a misconfigured environment doesn't break the rest of the app, which unfortunately also means it
  fails silently from your end. Worth checking your Vercel project's environment variables for
  those two before assuming this is a code bug — I can't check or set Vercel env vars from here.

## Blocked on Karina

- **Phase 6 — carrier PDFs.** Need 6 missing carrier PDF files (Ameritas Life,
  Ameritas Annuities, Nationwide Life, Nationwide Annuities, MOO Life, MOO Annuities)
  to wire into the Downloads page's `downloads-data.ts`.

- **Terms of Service text — RESOLVED 9/6, no longer blocked.** This had been sitting in "Blocked
  on Karina" since it needed her real legal text — but the literal "PLACEHOLDER TEXT" label was
  actually already removed back on 8/27, and what's live in `src/lib/terms.ts` is a working draft
  (confidentiality, no competing use, client data ownership, revocable access, "verify before you
  rely on it") that was never actually a raw placeholder, just never attorney-reviewed. Checked
  back in with Karina 9/6 on whether to keep it, revise it, or wait for real counsel-reviewed
  text — her call: keep the current draft as final for now. No code change needed; just noting
  this is resolved and moving it out of "Blocked." Revisit only if she gets real legal text later
  (drop it into `TERMS_TEXT` verbatim and bump `TERMS_VERSION` so everyone gets re-prompted).
