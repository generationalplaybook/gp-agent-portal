-- Explicit "is this convertible" flag (added 9/4) — mirrors schema.sql section 39.
-- Run this once in Supabase's SQL Editor.
--
-- Karina, looking at a juvenile IUL product card showing a "Mark Conversion Pending" action:
-- "since not every product is convertible, maybe when adding a product an advisor can check if
-- it is convertible then the fields popup because otherwise it's too much clutter." A plain
-- checkbox on the Add/Edit form now controls whether the conversion-related fields (no-exam
-- deadline, final conversion deadline, no-exam-declined date) show at all, and the same flag
-- gates whether "Mark Conversion Pending" appears on the card.

alter table public.client_products add column if not exists is_convertible boolean not null default false;

-- Backfill: turn the flag on for any existing product that already has conversion data on file,
-- so nothing already in use disappears from view.
update public.client_products
set is_convertible = true
where is_convertible = false
  and (
    conversion_deadline is not null
    or final_conversion_deadline is not null
    or no_exam_declined_at is not null
    or conversion_pending_at is not null
    or converted_at is not null
  );
