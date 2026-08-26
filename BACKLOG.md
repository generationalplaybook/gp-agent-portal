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

## Blocked on Karina

- **Phase 6 — carrier PDFs.** Need 6 missing carrier PDF files (Ameritas Life,
  Ameritas Annuities, Nationwide Life, Nationwide Annuities, MOO Life, MOO Annuities)
  to wire into the Downloads page's `downloads-data.ts`.

- **Terms of Service text.** `src/lib/terms.ts` currently has clearly-labeled placeholder
  text for the "Proprietary Technology Notice" agents accept on first login. Needs
  Karina's real, verbatim legal text before this is production-ready.
