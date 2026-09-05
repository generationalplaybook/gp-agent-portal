-- Migration: retire auto-convert-to-Product on Illustration Scenarios, add chosen_at tracking
-- (added 9/5). See schema.sql section 42 for the full writeup.
--
-- Karina found too much mismatch between what a scenario captures (illustration numbers for
-- comparing options) and what a real in-force Product record needs (issue date, policy number,
-- the actual numbers the client is now paying) to trust an automatic copy between the two. The
-- app no longer offers a "convert this scenario to a Product" action — the advisor now adds the
-- real Product by hand, the same way as any other product.
--
-- `illustration_scenarios.converted_product_id` is LEFT IN PLACE, untouched — any scenario
-- already converted under the old flow keeps its historical link/badge. Nothing new ever sets
-- it again; no data is deleted or changed by this migration.
--
-- `chosen_at` is new: a plain timestamp an advisor sets to record "this is what the client went
-- with" and when — for the record, in case a client later disputes what they agreed to.

alter table public.illustration_scenarios add column if not exists chosen_at timestamptz;
