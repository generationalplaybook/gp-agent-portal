# Backlog

Things Karina has asked to defer to a future build, so they don't get lost.

## Requested, not yet built

- **First / Last / Middle name split.** Right now "name" is a single field everywhere.
  Needs to become separate First Name / Last Name (required) and Middle Name (optional)
  fields, on both:
  - Advisor accounts (the invite form and My Profile)
  - Client records (new client form, client profile contact info, Client Analyzer)

- **Better home page.** The landing page after login is minimal right now. Karina wants
  something more useful here, but said not to worry about it yet.

- **Downloads section.** Left alone for now — no changes requested yet.

- **Presentation embed / training & licensing content.** Karina is still building the
  presentation materials; she said we can add this once that's ready.

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
