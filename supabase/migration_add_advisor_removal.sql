-- Advisor "Remove access" + client reassignment (added 9/6)
--
-- Karina wants an admin to be able to remove an advisor's portal access without going into
-- Supabase directly, and to reassign that advisor's book of business afterward (to one person,
-- or split across several).
--
-- clients.owner_id is `not null references profiles(id) on delete cascade` — actually DELETING a
-- profile row would cascade-delete every client (and everything hanging off them: notes, tasks,
-- products, illustrations, the works) tied to that advisor, so this is deliberately NOT a real
-- delete. "Remove access" instead: bans the advisor's Supabase auth login (via the admin API, so
-- they can no longer sign in at all), stamps profiles.disabled_at so the UI can show they've been
-- removed, and sets owner_id to NULL on every client they owned — moving their whole book into an
-- "Unassigned Clients" admin-only section rather than deleting anything or silently leaving it
-- under a login nobody can use anymore. An admin then reassigns each client (one at a time, or in
-- a batch) to whichever advisor is taking over that piece of the book, which also moves that
-- client's reminders and meetings (both carry their own separate agent_id, not just client_id) to
-- the new owner, so nothing pending silently disappears from view for either advisor.
--
-- Both statements are purely additive/loosening — nothing existing is dropped or backfilled.

alter table public.clients alter column owner_id drop not null;
alter table public.profiles add column if not exists disabled_at timestamptz;
