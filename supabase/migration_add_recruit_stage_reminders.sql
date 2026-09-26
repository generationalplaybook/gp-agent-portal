-- Automatic weekly check-in reminders for recruit pipeline stages (Lead/Studying/Licensed) —
-- added 9/26. Run this once in Supabase's SQL Editor.
--
-- Karina, looking at the Team Follow-ups dashboard card: wanted the same kind of automatic
-- nudging clients already get on Pending/Approved/Quoted, applied to recruits too, but on a
-- slower, weekly cadence rather than the clients' 3/7/10-day rhythm — recruiting (especially
-- studying for a license) plays out over weeks, not days, so a faster cadence would just be noise.
--
-- Unlike clients (which use a SEPARATE entered-at timestamp + reminder-id array PER stage —
-- pending_reminder_ids, approved_reminder_ids, quoted_reminder_ids — because those three stages
-- have genuinely different cadences/behaviors and were added incrementally over time), a recruit
-- is only ever in one of Lead/Studying/Licensed at a time and every stage gets the identical
-- day-7/14/21 cadence, so one generic pair of columns is enough to track "the current stage's
-- live batch" without three redundant, always-in-lockstep columns. See
-- createRecruitStageBatch/clearRecruitStageBatch in src/app/(app)/team/actions.ts.

alter table public.recruits add column if not exists stage_entered_at timestamptz;
alter table public.recruits add column if not exists stage_reminder_ids uuid[] not null default '{}';
