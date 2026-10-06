-- Term length (years) on a product — added 10/6. Run this once in Supabase's SQL Editor.
--
-- Karina: "if it's a term life one and I put the issue date in, can we say just put in how many
-- year term it is and it calculates the date on its own so that the agent doesn't have to do the
-- year math." The Add/Edit Product form's new "Term length (years)" field combines with
-- issue_date to auto-fill term_end_date (addYearsToDateOnly in src/lib/dates.ts) — the advisor
-- can still override the computed date by hand afterward, same as every other date field.
--
-- This column exists purely so the term length is still there to see/edit next time (and shown on
-- the read-only product card, e.g. "20-year term") — it's not read by any Outreach/Time-Sensitive
-- logic, which still treats term_end_date alone as authoritative (see the 9/4 note atop
-- src/lib/products.ts).

alter table public.client_products add column if not exists term_length_years integer;
