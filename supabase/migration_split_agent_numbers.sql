-- Migration: split carrier_logins.agent_number into life_agent_number + annuity_agent_number
-- Run this once in Supabase's SQL Editor.
--
-- Why: most carriers issue a separate agent ID per product line — your own F&G row had
-- "Annuities 000763473 / Life 000756492" crammed into one field. This splits that single
-- "Agent #" field into two: Life Agent # and Annuity Agent #.
--
-- Safe to run even though your carrier_logins table already has real data in the old
-- agent_number column — this renames that column to life_agent_number (keeping your existing
-- numbers, since most of what was in there was the life number) and adds a new, empty
-- annuity_agent_number column for you to fill in per carrier. It won't error if run twice.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'carrier_logins' and column_name = 'agent_number'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'carrier_logins' and column_name = 'life_agent_number'
  ) then
    alter table public.carrier_logins rename column agent_number to life_agent_number;
  end if;
end $$;

alter table public.carrier_logins add column if not exists life_agent_number text;
alter table public.carrier_logins add column if not exists annuity_agent_number text;
