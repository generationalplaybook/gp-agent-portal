-- NPN on the advisor's own profile (added 9/3)
-- Paste this into Supabase → SQL Editor → New query → Run.

alter table public.profiles add column if not exists npn text;
