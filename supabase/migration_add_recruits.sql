-- Adds the Team / Recruits feature (9/3): a new `recruits` table, independent of `clients`, plus
-- the change needed so a Reminder can belong to a recruit instead of a client (the "nudge" for
-- follow-ups). Run this in the Supabase SQL Editor (Project > SQL Editor > New query) once.
-- Safe to run even if some of this is already present — every statement is idempotent
-- (if not exists / drop-then-create). This is the same content as section 28 of schema.sql —
-- schema.sql is the full cumulative reference; this file is just this one change on its own.

create table if not exists public.recruits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  state text, -- state they're licensing/appointed in — carrier appointments are state-specific
  stage text not null default 'lead' check (stage in ('lead','studying','licensed')),
  source text, -- freeform: referral, former client, conference, etc.
  target_license_date date,
  notes_summary text, -- freeform "at a glance" field, same pattern as clients.notes_summary
  -- Optional link to an existing client who wants to become an agent — a cross-reference only,
  -- never a merge of the two records.
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruits_owner_id_idx on public.recruits(owner_id);
create index if not exists recruits_client_id_idx on public.recruits(client_id) where client_id is not null;

alter table public.recruits enable row level security;

drop policy if exists "Agents manage their own recruits" on public.recruits;
create policy "Agents manage their own recruits"
  on public.recruits for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop trigger if exists recruits_set_updated_at on public.recruits;
create trigger recruits_set_updated_at
  before update on public.recruits
  for each row execute procedure public.set_updated_at();

-- Reminders can now belong to a recruit instead of a client. client_id becomes nullable; the
-- check constraint keeps every reminder pointed at exactly one of the two. Existing rows are
-- unaffected (they all already have client_id set, recruit_id defaults null). No RLS change
-- needed — reminders were already scoped by agent_id = auth.uid(), not by walking through the
-- client.
alter table public.reminders alter column client_id drop not null;
alter table public.reminders add column if not exists recruit_id uuid references public.recruits(id) on delete cascade;

alter table public.reminders drop constraint if exists reminders_client_or_recruit_chk;
alter table public.reminders add constraint reminders_client_or_recruit_chk check (
  (client_id is not null and recruit_id is null) or (client_id is null and recruit_id is not null)
);

create index if not exists reminders_recruit_id_idx on public.reminders(recruit_id) where recruit_id is not null;
