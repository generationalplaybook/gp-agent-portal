-- Second portal link on a carrier login (added 10/13) — Karina: "some websites have different
-- logins for life and annuities." `link` stays as the life (or only) portal URL; this is the
-- separate annuity one. Run once in Supabase's SQL Editor.
alter table public.carrier_logins add column if not exists annuity_link text;
