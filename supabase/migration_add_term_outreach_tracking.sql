-- Term end date + term outreach tracking (added 9/4) — mirrors schema.sql section 40.
-- Run this once in Supabase's SQL Editor.
--
-- Karina wants a proactive "shop new coverage / touch base before this term ends" workflow, not
-- just the reactive conversion tracking added earlier. Two new columns on client_products:
--
-- term_end_date — a plain end-of-term date for a policy that does NOT have a conversion option
-- at all (a straight non-convertible term). The is_convertible checkbox now means "this is a term
-- policy" in general (convertible or not) — conversion_deadline/final_conversion_deadline are the
-- relevant dates for the ones that DO convert, term_end_date is the alternate path for the ones
-- that don't.
--
-- term_contacted_at — a manual, per-product "I've reached out to this client about their
-- upcoming term" flag (plain timestamp, not cron-managed), powering a new "Term" view on the
-- Clients page.

alter table public.client_products add column if not exists term_end_date date;
alter table public.client_products add column if not exists term_contacted_at timestamptz;
