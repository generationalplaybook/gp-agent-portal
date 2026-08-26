-- Fixes: "column clients.birth_date does not exist"
-- The live clients table predates birth_date being added to the schema, so it
-- never picked up the column. This adds it without touching any existing data.
alter table public.clients add column if not exists birth_date date;
