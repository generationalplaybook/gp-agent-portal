-- Adds city, state, and an explicit timezone selection to clients (9/3) — so you can see how
-- many hours apart you and a client are before calling, emailing, or booking something. Run this
-- in the Supabase SQL Editor (Project > SQL Editor > New query) once. Safe to run even if some of
-- this is already present. Same content as section 30 of schema.sql.

alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists state text;
alter table public.clients add column if not exists timezone text;
