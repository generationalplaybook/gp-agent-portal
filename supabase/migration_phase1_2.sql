-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query).
-- Purely additive — does not touch any existing data.

-- New profile fields (advisor phone number for the PDF, plus Terms-of-Service
-- acceptance tracking used later in Phase 4)
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- New table: saved Client Analyzer runs, one client can have many
create table if not exists public.client_analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  inputs jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists client_analyses_client_id_idx on public.client_analyses(client_id);

alter table public.client_analyses enable row level security;

drop policy if exists "Analyses follow client visibility" on public.client_analyses;
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
