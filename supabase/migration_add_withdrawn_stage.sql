-- Withdrawn pipeline stage (added 10/13) — Karina: "in the pipeline we need to add closed, meaning
-- they were approved but didn't execute, or maybe another word" (settled on "Withdrawn", replacing
-- the "Not Taken" label from the first version of this stage).
--
-- Run these TWO steps one at a time in Supabase's SQL Editor (a new enum value can't be used in the
-- same run that creates it).

-- STEP 1 — add the new stage value:
alter type client_stage add value if not exists 'withdrawn';

-- STEP 2 — run separately, after step 1. Only matters if the earlier "Not Taken" version of this
-- stage was already live and a client was put into it: moves any such client to Withdrawn. Safe to
-- run even if none exist (it just updates zero rows).
update public.clients set stage = 'withdrawn' where stage::text = 'not_taken';
