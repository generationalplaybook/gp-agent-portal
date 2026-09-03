-- Adds the Medical Condition Report feature (9/3): a new `medical_conditions` table (one row
-- per condition per client), plus a unique per-client token on `clients` for the public
-- client-facing fill-out link. Run this in the Supabase SQL Editor (Project > SQL Editor > New
-- query) once. Safe to run even if some of this is already present — every statement is
-- idempotent (if not exists / drop-then-create). Same content as section 29 of schema.sql —
-- schema.sql is the full cumulative reference; this file is just this one change on its own.

create table if not exists public.medical_conditions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  condition_name text not null,
  onset_date date,
  current_status text,
  treating_physician text,
  latest_report_date date,
  latest_report_summary text,
  hospitalizations text,
  additional_notes text,
  events jsonb not null default '[]'::jsonb,
  medications jsonb not null default '[]'::jsonb,
  submitted_by_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_conditions_client_id_idx on public.medical_conditions(client_id);

alter table public.medical_conditions enable row level security;

drop policy if exists "Medical conditions follow client visibility" on public.medical_conditions;
create policy "Medical conditions follow client visibility"
  on public.medical_conditions for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = medical_conditions.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = medical_conditions.client_id
        and c.owner_id = auth.uid()
    )
  );

drop trigger if exists medical_conditions_set_updated_at on public.medical_conditions;
create trigger medical_conditions_set_updated_at
  before update on public.medical_conditions
  for each row execute procedure public.set_updated_at();

-- Per-client unique, unguessable token for the public "fill this out" link.
alter table public.clients add column if not exists medical_report_token uuid default gen_random_uuid();
update public.clients set medical_report_token = gen_random_uuid() where medical_report_token is null;
alter table public.clients alter column medical_report_token set default gen_random_uuid();
alter table public.clients alter column medical_report_token set not null;

create unique index if not exists clients_medical_report_token_idx on public.clients(medical_report_token);
