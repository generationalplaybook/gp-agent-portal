-- GP Agent Portal CRM — database schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query) once your project is created.

-- ─────────────────────────────────────────────────────────────
-- 1. Profiles (one row per agent, mirrors auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'agent' check (role in ('agent','admin')),
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
-- 6. Calendar connections (Phase 4 — Google OAuth tokens, one per agent)
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
