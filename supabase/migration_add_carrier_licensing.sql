-- Carrier Logins + State Licenses (added 9/3)
-- Paste this into Supabase → SQL Editor → New query → Run.
-- Adds two new private, per-advisor tables for the new "Carrier & Licensing" section on My
-- Profile. Nothing here touches clients or any existing table.

create table if not exists public.carrier_logins (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  username text,
  password text,
  agent_number text,
  agency_number text,
  profile_code text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carrier_logins_agent_id_idx on public.carrier_logins(agent_id);

alter table public.carrier_logins enable row level security;

drop policy if exists "Agents manage their own carrier logins" on public.carrier_logins;
create policy "Agents manage their own carrier logins"
  on public.carrier_logins for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop trigger if exists carrier_logins_set_updated_at on public.carrier_logins;
create trigger carrier_logins_set_updated_at
  before update on public.carrier_logins
  for each row execute procedure public.set_updated_at();

create table if not exists public.state_licenses (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  state text not null,
  license_number text,
  is_resident boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists state_licenses_agent_id_idx on public.state_licenses(agent_id);

alter table public.state_licenses enable row level security;

drop policy if exists "Agents manage their own state licenses" on public.state_licenses;
create policy "Agents manage their own state licenses"
  on public.state_licenses for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop trigger if exists state_licenses_set_updated_at on public.state_licenses;
create trigger state_licenses_set_updated_at
  before update on public.state_licenses
  for each row execute procedure public.set_updated_at();
