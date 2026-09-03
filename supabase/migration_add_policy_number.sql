-- Policy number on Products (added 9/3) — mirrors schema.sql section 35.
-- Run this once in Supabase's SQL Editor.
--
-- Karina, looking at a client's Products card: "I think we should have a section on this
-- product thing for a policy number." Once a product is actually issued, the policy number is
-- what you'd reference calling the carrier for service/claims — there was nowhere to record it.
-- Freeform text (not every carrier's numbers are purely numeric), optional since a quote/
-- application doesn't have one yet.

alter table public.client_products add column if not exists policy_number text;
