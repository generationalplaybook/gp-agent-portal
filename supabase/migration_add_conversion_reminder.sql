-- Auto-reminder before a "convertible without exam" deadline (added 9/3) — mirrors schema.sql
-- section 36. Run this once in Supabase's SQL Editor.
--
-- Karina, looking at the conversion_deadline field on a product: wants a heads-up before it
-- passes rather than needing to notice it herself. A new daily cron
-- (src/app/api/cron/check-conversion-deadlines/route.ts) finds every product whose
-- conversion_deadline falls within the next 60 days and hasn't already gotten a reminder, and
-- creates one automatically. conversion_reminder_sent is the one-time-only flag that stops it
-- from creating a new reminder every day the deadline is still approaching.

alter table public.client_products add column if not exists conversion_reminder_sent boolean not null default false;
