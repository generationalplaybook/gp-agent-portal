-- GP Agent Portal CRM — database schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query) once your project is created.

-- ─────────────────────────────────────────────────────────────
-- 1. Profiles (one row per agent, mirrors auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role text not null default 'agent' check (role in ('agent','admin')),
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by any signed-in agent"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Agents can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new agent signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 2. Clients (the core CRM record)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type client_stage as enum ('lead','quoted','applied','issued','declined');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birth_date date,
  stage client_stage not null default 'lead',
  source text,
  follow_up_at timestamptz,
  follow_up_note text,
  notes_summary text, -- freeform "at a glance" field, separate from the notes log below
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients(owner_id);
create index if not exists clients_follow_up_at_idx on public.clients(follow_up_at);

alter table public.clients enable row level security;

create policy "Agents see their own clients, admins see all"
  on public.clients for select
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Agents manage their own clients, admins manage all"
  on public.clients for all
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- keep updated_at current
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Notes (interaction history log, one client has many)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx on public.client_notes(client_id);

alter table public.client_notes enable row level security;

create policy "Notes follow client visibility"
  on public.client_notes for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Tasks (per-client to-dos)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists client_tasks_client_id_idx on public.client_tasks(client_id);

alter table public.client_tasks enable row level security;

create policy "Tasks follow client visibility"
  on public.client_tasks for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_tasks.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_tasks.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. Reminders (follow-up notifications — sent by a scheduled job, see /supabase/functions)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  remind_at timestamptz not null,
  message text,
  channel text not null default 'email' check (channel in ('email','sms')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reminders_remind_at_idx on public.reminders(remind_at) where sent_at is null;

alter table public.reminders enable row level security;

create policy "Agents see their own reminders, admins see all"
  on public.reminders for all
  using (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────
-- 6. Client Analyses (saved Client Analyzer runs, one client has many)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  inputs jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists client_analyses_client_id_idx on public.client_analyses(client_id);

alter table public.client_analyses enable row level security;

create policy "Analyses follow client visibility"
  on public.client_analyses for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_analyses.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_analyses.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 7. Client Financial Plans (Full Financial Analysis — one per client)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_financial_plans (
  client_id uuid primary key references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.client_financial_plans enable row level security;

create policy "Financial plans follow client visibility"
  on public.client_financial_plans for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_financial_plans.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_financial_plans.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

drop trigger if exists client_financial_plans_set_updated_at on public.client_financial_plans;
create trigger client_financial_plans_set_updated_at
  before update on public.client_financial_plans
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8. Advisor Credentials (NPN, carrier agent codes, etc — freeform label/code pairs)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.advisor_credentials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  code text not null,
  created_at timestamptz not null default now()
);

create index if not exists advisor_credentials_agent_id_idx on public.advisor_credentials(agent_id);

alter table public.advisor_credentials enable row level security;

create policy "Agents manage their own credentials, admins see all"
  on public.advisor_credentials for all
  using (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (agent_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 9. Calendar connections (Phase 4 — Google OAuth tokens, one per agent)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.calendar_connections (
  agent_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  refresh_token text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now()
);

alter table public.calendar_connections enable row level security;

create policy "Agents manage only their own calendar connection"
  on public.calendar_connections for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 10. Family linking (added 8/27 — links related client records into a household so an
-- advisor can view a whole family at a glance from any one member's profile)
-- ─────────────────────────────────────────────────────────────
-- family_id is just a shared grouping key (a random uuid), not a foreign key to another
-- table — every client that shares the same family_id is considered part of one household.
-- No new RLS policy needed: a family member is still just a row in clients, already governed
-- by the existing "owner sees their own, admin sees all" policy above.
alter table public.clients add column if not exists family_id uuid;
alter table public.clients add column if not exists family_relationship text;

create index if not exists clients_family_id_idx on public.clients(family_id);

-- ─────────────────────────────────────────────────────────────
-- 11. Client Products (added 8/27 — policies/products a client already owns, so the advisor
-- can see coverage they're holding and any conversion window at a glance, e.g. a term policy
-- convertible to an IUL without a medical exam only within a set window)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_name text not null,
  product_type text, -- freeform label: Term Life, Whole Life, IUL, Annuity, Other, ...
  carrier text,
  issue_date date,
  expiration_date date,
  conversion_deadline date, -- convertible to permanent coverage with NO medical exam until this date
  conversion_notes text,
  face_amount numeric,
  premium numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_products_client_id_idx on public.client_products(client_id);

alter table public.client_products enable row level security;

create policy "Products follow client visibility"
  on public.client_products for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_products.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_products.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

drop trigger if exists client_products_set_updated_at on public.client_products;
create trigger client_products_set_updated_at
  before update on public.client_products
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 12. Juvenile policy ownership + automatic 18th-birthday transfer (added 8/27)
-- ─────────────────────────────────────────────────────────────
-- owner_client_id: who currently owns this product, when it's someone other than the client
-- it's attached to — e.g. a parent owns a juvenile policy until the covered child turns 18.
-- Left null for the (normal) case where the client on the product IS the owner.
alter table public.client_products add column if not exists owner_client_id uuid references public.clients(id) on delete set null;

-- turned_18_notice_sent: sirens off the daily birthday-check cron job (see
-- src/app/api/cron/check-birthdays/route.ts) exactly once per client, the day they turn 18 —
-- it transfers ownership on any product they don't already own outright and creates an
-- advisor reminder. This flag stops the same client from re-triggering it if the job ever
-- reruns same-day, and — since turning 18 only happens once in a life — never needs to reset.
alter table public.clients add column if not exists turned_18_notice_sent boolean not null default false;

-- ─────────────────────────────────────────────────────────────
-- 13. Name split — first / middle / last, with full_name auto-derived (added 8/29)
-- ─────────────────────────────────────────────────────────────
-- full_name stays put as a normal column so every existing query, RLS policy, and component
-- that already reads client.full_name / profile.full_name keeps working untouched — a trigger
-- below recomputes it from first/middle/last on every insert or update. Entry forms now collect
-- the three parts; nothing should write to full_name directly anymore.

alter table public.clients add column if not exists first_name text;
alter table public.clients add column if not exists middle_name text;
alter table public.clients add column if not exists last_name text;

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists last_name text;

-- One-time backfill for rows that already exist: naive split on the first space (first word ->
-- first name, everything after -> last name). Covers the common "First Last" case already on
-- file; a name with a middle name already in the data, or just one word, can be re-split by hand
-- in the UI afterward — that's a one-time cleanup, not something worth writing careful SQL for.
update public.clients
  set first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
      last_name = coalesce(last_name, nullif(trim(regexp_replace(full_name, '^\S+\s*', '')), ''))
  where full_name is not null;

update public.profiles
  set first_name = coalesce(first_name, split_part(full_name, ' ', 1)),
      last_name = coalesce(last_name, nullif(trim(regexp_replace(full_name, '^\S+\s*', '')), ''))
  where full_name is not null and full_name <> '';

-- Recomputes full_name any time first/middle/last change. Never returns null (worst case an
-- empty string), so this can't trip clients.full_name's NOT NULL constraint.
create or replace function public.sync_full_name()
returns trigger
language plpgsql
as $$
begin
  new.full_name := trim(both ' ' from
    coalesce(new.first_name, '') ||
    case when coalesce(trim(new.middle_name), '') <> '' then ' ' || trim(new.middle_name) else '' end ||
    case when coalesce(trim(new.last_name), '') <> '' then ' ' || trim(new.last_name) else '' end
  );
  return new;
end;
$$;

drop trigger if exists sync_client_full_name on public.clients;
create trigger sync_client_full_name
  before insert or update of first_name, middle_name, last_name on public.clients
  for each row execute function public.sync_full_name();

drop trigger if exists sync_profile_full_name on public.profiles;
create trigger sync_profile_full_name
  before insert or update of first_name, middle_name, last_name on public.profiles
  for each row execute function public.sync_full_name();

-- Advisor invites now send first/middle/last through the auth metadata instead of one
-- "full_name" string, so the profile row created here needs the same split.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, middle_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'middle_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 14. Product riders (added 8/29) — the endorsements attached to a policy (accelerated death
-- benefit for terminal/critical/chronic illness, overloan protection, carrier-specific perks,
-- etc). A plain text array: a handful of common ones are offered as checkboxes in the UI, and
-- anything else gets typed in free-form, since riders vary a lot by carrier.
-- ─────────────────────────────────────────────────────────────
alter table public.client_products add column if not exists riders text[] not null default '{}';

-- ─────────────────────────────────────────────────────────────
-- 15. Minimum premium to avoid lapse (added 8/29) — for a UL/IUL, the planned/target premium
-- (what's in `premium`) is usually higher than the bare minimum that actually keeps the policy
-- in force. When a policy shows as lapsed, the advisor needs this number fast.
-- ─────────────────────────────────────────────────────────────
alter table public.client_products add column if not exists minimum_premium numeric;
