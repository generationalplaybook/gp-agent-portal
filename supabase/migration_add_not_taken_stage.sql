-- Not Taken pipeline stage (added 10/13) — Karina: "in the pipeline we need to add closed, meaning
-- they were approved but didn't execute, or maybe another word." Run once in Supabase's SQL Editor.
-- Adds the new value to the client_stage enum; no data changes, nobody is moved automatically.
alter type client_stage add value if not exists 'not_taken';
