-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query).
-- Purely additive and safe to re-run — every statement is idempotent (IF NOT EXISTS / DROP
-- POLICY IF EXISTS), so it's fine even if you already ran the previous migration file.

-- From the previous round, included again just in case it wasn't run yet:
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

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

-- ── New this round ──────────────────────────────────────────

-- Full Financial Analysis — one saved plan per client
create table if not exists public.client_financial_plans (
  client_id uuid primary key references public.clients(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.client_financial_plans enable row level security;
drop policy if exists "Financial plans follow client visibility" on public.client_financial_plans;
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

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_financial_plans_set_updated_at on public.client_financial_plans;
create trigger client_financial_plans_set_updated_at
  before update on public.client_financial_plans
  for each row execute procedure public.set_updated_at();

-- Advisor credentials — NPN, carrier agent codes, freeform label/code pairs
create table if not exists public.advisor_credentials (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  code text not null,
  created_at timestamptz not null default now()
);
create index if not exists advisor_credentials_agent_id_idx on public.advisor_credentials(agent_id);
alter table public.advisor_credentials enable row level security;
drop policy if exists "Agents manage their own credentials, admins see all" on public.advisor_credentials;
create policy "Agents manage their own credentials, admins see all"
  on public.advisor_credentials for all
  using (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (agent_id = auth.uid());

-- ── Make yourself an admin (required for the Invite Agents screen) ──
-- Uncomment and run this line with your own email to grant yourself admin access:
-- update public.profiles set role = 'admin' where email = 'karina@karinabath.com';
