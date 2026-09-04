-- Conversion Pending / Converted workflow status (added 9/3) — mirrors schema.sql section 38.
-- Run this once in Supabase's SQL Editor.
--
-- Karina wanted a way to mark a term product as "we're actively converting this" once a client
-- actually says yes, so it stands out in its own section on the client's Products list rather
-- than sitting quietly alongside every other Issued policy. Deliberately manual — only a human
-- knows the client agreed. Once the new permanent policy is actually issued, the advisor adds it
-- as a brand-new Product (no linking between the two) and marks this old term product Converted,
-- which archives it out of the way but keeps the record on file.

alter table public.client_products add column if not exists conversion_pending_at timestamptz;
alter table public.client_products add column if not exists converted_at timestamptz;
