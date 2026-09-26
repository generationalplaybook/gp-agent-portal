-- Automatic check-in reminders for the Quoted stage (added 9/26) — mirrors schema.sql's Pending/
-- Approved check-in batch (section 53), just with its own, shorter cadence. Run this once in
-- Supabase's SQL Editor.
--
-- Karina, discussing whether Quoted needed the same kind of nudge Pending/Approved already get:
-- a quote going cold with no follow-up is exactly the kind of thing that benefits from an
-- automatic reminder, same reasoning as the other two stages. Unlike Pending (waiting on the
-- carrier) or Approved (waiting on payment), Quoted has no external clock at all — it's purely on
-- the advisor to follow up — so it gets a shorter 3/7/10-day arc (not 3/7/10/14) with day 10
-- marked urgent, instead of stretching out to day 14 like a carrier-underwriting wait would.
-- 'quoted' is already a valid client_stage value (schema.sql line 50), so unlike Approved back in
-- section 53, there's no `alter type ... add value` step needed here — just the same
-- entered-at timestamp + reminder-id-array pair, named to match the existing pending_/approved_
-- columns. See createStageBatch/STAGE_BATCH_FIELDS in src/app/(app)/clients/actions.ts.

alter table public.clients add column if not exists stage_entered_quoted_at timestamptz;
alter table public.clients add column if not exists quoted_reminder_ids uuid[] not null default '{}';
