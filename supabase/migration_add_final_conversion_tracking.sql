-- Final (exam-required) conversion deadline + no-exam-declined tracking (added 9/3) — mirrors
-- schema.sql section 37. Run this once in Supabase's SQL Editor.
--
-- Karina described two more things after the 60-day no-exam reminder: (1) an absolute final
-- deadline for converting to permanent coverage at all (after the no-exam window closes,
-- conversion is often still possible with a medical exam, up to some final cutoff — her example:
-- "5 years no exam and convert until age 75") — she wants to record that date and get the same
-- kind of heads-up reminder; (2) a way to record that the no-exam window was specifically
-- missed/declined, with the date that happened.

alter table public.client_products add column if not exists final_conversion_deadline date;
alter table public.client_products add column if not exists final_conversion_reminder_sent boolean not null default false;
alter table public.client_products add column if not exists no_exam_declined_at date;
