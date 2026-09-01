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

-- ─────────────────────────────────────────────────────────────
-- 16. "Pending" pipeline stage (added 8/29) — for an already-Issued client who's actively
-- being worked on a new policy, so they don't just sit in "Issued" (which otherwise reads as
-- "nothing to do here") while new business is in progress. Their existing coverage stays
-- visible in Products regardless of what Stage they're on.
-- ─────────────────────────────────────────────────────────────
alter type client_stage add value if not exists 'pending';

-- ─────────────────────────────────────────────────────────────
-- 17. Cal.com scheduling link (added 8/30) — each advisor's own Cal.com booking link for their
-- client-consultation event type. Video (Cal Video, Zoom, Google Meet) is configured on that
-- event type inside Cal.com itself; the portal just opens/sends this link. Null until the
-- advisor sets it in My Profile.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists scheduling_link text;

-- ─────────────────────────────────────────────────────────────
-- 18. In-person meetings (added 8/30) — entered directly on a client's profile (date, location,
-- notes), not booked through a scheduling page. The calendar invite (.ics) that actually lands
-- on the advisor's and client's calendars is generated in the browser from this same row —
-- nothing here talks to an external calendar API.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.client_meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  meeting_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists client_meetings_client_id_idx on public.client_meetings(client_id);

alter table public.client_meetings enable row level security;

drop policy if exists "Agents see their own meetings, admins see all" on public.client_meetings;
create policy "Agents see their own meetings, admins see all"
  on public.client_meetings for all
  using (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    agent_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────
-- 19. Policy Illustration Summaries (added 8/30) — advisor-entered highlights from a carrier's
-- own illustration (cash value / death benefit / income at a few milestone ages, or a term
-- summary card), condensed into a one-page client-facing PDF. One illustration per product —
-- saving again overwrites the previous one (see the unique constraint on product_id). `data`
-- shape depends on product_type; see src/lib/illustration.ts.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.product_illustrations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.client_products(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  product_type text,
  data jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_illustrations_client_id_idx on public.product_illustrations(client_id);

alter table public.product_illustrations enable row level security;

drop policy if exists "Illustrations follow client visibility" on public.product_illustrations;
create policy "Illustrations follow client visibility"
  on public.product_illustrations for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = product_illustrations.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = product_illustrations.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

-- 20. Client Intake Links (added 8/30) — each advisor has one public, reusable link
-- (/intake/{their user id}) they can send a prospect before the first meeting. No login
-- required on that page, and it never shows the client any recommendation — submitting it
-- creates a real lead (owner_id = the advisor whose link was used) plus a saved analysis, and
-- flags both so the advisor can find and triage them separately from normal leads.
-- household_summary is a short plain-text summary from the lightweight Family checkboxes
-- (Spouse / Children (+ages) / Aging parent(s) or other dependents) — intentionally NOT a full
-- per-family-member questionnaire, and intake never auto-creates separate family-member client
-- records; the advisor links those manually later if they want to, using the existing Family
-- section.
-- ─────────────────────────────────────────────────────────────
alter table public.clients add column if not exists intake_pending_review boolean not null default false;
alter table public.clients add column if not exists household_summary text;
alter table public.client_analyses add column if not exists from_intake boolean not null default false;

create index if not exists clients_intake_pending_review_idx
  on public.clients (owner_id, intake_pending_review)
  where intake_pending_review = true;

-- 21. Quote tracking for Products (added 8/31) — while a client is in the Quoted stage,
-- a product added is automatically flagged as a candidate quote (is_quote = true) rather than
-- confirmed coverage, since an advisor is often comparing 2-3 carriers before the client picks
-- one. When the client's stage moves to Issued, the advisor is asked which quote actually got
-- issued (see resolveQuotesOnIssue in src/app/(app)/clients/actions.ts): that one is flipped to
-- is_quote = false and kept, and the rest are deleted outright — Karina's call, not archived.
-- ─────────────────────────────────────────────────────────────
alter table public.client_products add column if not exists is_quote boolean not null default false;

-- 22. Height & weight on the client record itself (added 8/31) — captured at New Client and
-- editable on the profile's Contact Info card, so it's on hand for underwriting conversations
-- without needing a Client Analyzer run first. Separate from any saved analysis's own
-- height/weight snapshot, which stays frozen at whatever it was when that analysis ran — this
-- is the client's current, always-editable value.
-- ─────────────────────────────────────────────────────────────
alter table public.clients add column if not exists height_ft integer;
alter table public.clients add column if not exists height_in integer;
alter table public.clients add column if not exists weight integer;

-- 23. Provider-agnostic scheduling link + Cal.com auto-sync (added 8/31) — "Schedule a Call"
-- now works with any booking tool (Calendly, Zoom Scheduler, Acuity, Cal.com, etc.), since it's
-- always been just a public link the portal opens/copies/embeds — that part never needed
-- Cal.com specifically. Cal.com additionally supports real auto-sync: once an advisor connects
-- a Cal.com API key (see connectCalCom in src/app/(app)/profile/actions.ts), the portal
-- registers a webhook on their Cal.com account, and every booking made through their link
-- automatically creates/updates/removes a meeting on the right client's profile — no manual
-- entry needed. Other providers (Calendly, Zoom Scheduler) don't get auto-sync yet — each has
-- its own separate auth/webhook system and is its own integration project for whenever there's
-- real demand. client_meetings.source + external_booking_uid keep the door open for a future
-- provider's webhook handler to write into this same shape without a rearchitecture.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists cal_api_key text;
alter table public.profiles add column if not exists cal_webhook_id text;
alter table public.profiles add column if not exists cal_webhook_secret text;

alter table public.client_meetings add column if not exists source text not null default 'manual' check (source in ('manual','cal.com'));
alter table public.client_meetings add column if not exists external_booking_uid text;

-- Lets the webhook handler safely upsert on retries/reschedules without creating duplicates —
-- scoped to (source, external_booking_uid) so it never collides with manually-entered rows,
-- which never set external_booking_uid.
create unique index if not exists client_meetings_external_booking_uid_idx
  on public.client_meetings (source, external_booking_uid)
  where external_booking_uid is not null;

-- ─────────────────────────────────────────────────────────────
-- 24. Custom intake link handle (added 8/31) — an advisor can set a short, memorable slug
-- (e.g. "karina") so their public intake link reads .../intake/karina instead of the raw
-- profile id. The id-based link keeps working forever even after a slug is set (the intake
-- route tries both forms), so setting/changing a slug is purely additive and never breaks an
-- already-shared id-based link. Case-insensitive-unique across all advisors — matters once this
-- is licensed to multiple companies, so two advisors can never claim the same handle.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists intake_slug text;

create unique index if not exists profiles_intake_slug_idx
  on public.profiles (lower(intake_slug))
  where intake_slug is not null;

-- ─────────────────────────────────────────────────────────────
-- 25. Illustration Scenarios (added 9/1) — a lightweight, exploratory "let's see the numbers"
-- record, deliberately NOT tied to a client_products row. Running an illustration used to
-- require first creating a real Product (client_products), even for options the client hadn't
-- committed to — but Products is meant to mean "coverage this client already owns" (see its own
-- section comment above), so that forced "just exploring" numbers to look like real coverage.
-- This table exists so an advisor can run/compare as many hypothetical scenarios as they want
-- for a client with zero effect on their Products list, then promote exactly one to a real
-- Product once the client actually decides (see convertScenarioToProduct in
-- src/app/(app)/clients/[id]/scenarios/actions.ts, which creates the client_products row AND
-- copies this scenario's numbers into that product's own product_illustrations row — the
-- existing per-product Illustration Summary page and PDF are completely unchanged by this).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.illustration_scenarios (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  product_name text not null,
  product_type text, -- freeform label: Term Life, Whole Life, IUL, Final Expense, Annuity, Other
  carrier text,
  data jsonb not null, -- IllustrationData — same shape src/lib/illustration.ts already defines
  notes text,
  -- Set once this scenario is promoted to a real Product — see convertScenarioToProduct. A
  -- scenario is never deleted on conversion (so the history of "here's how we got here" stays
  -- intact); this just marks it resolved and links to the resulting product.
  converted_product_id uuid references public.client_products(id) on delete set null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists illustration_scenarios_client_id_idx on public.illustration_scenarios(client_id);

alter table public.illustration_scenarios enable row level security;

create policy "Illustration scenarios follow client visibility"
  on public.illustration_scenarios for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = illustration_scenarios.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = illustration_scenarios.client_id
        and (c.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

drop trigger if exists illustration_scenarios_set_updated_at on public.illustration_scenarios;
create trigger illustration_scenarios_set_updated_at
  before update on public.illustration_scenarios
  for each row execute procedure public.set_updated_at();

-- 26. Gender on the client record (added 9/1) — missed on the original build. Plain text rather
-- than a Postgres enum so it's a one-line, no-downtime addition (same reasoning as height/weight
-- in section 22) — the app only ever writes "Male" or "Female" through its own forms, but the
-- column itself doesn't enforce that, so it's safe even if that list needs to grow later.
-- ─────────────────────────────────────────────────────────────
alter table public.clients add column if not exists gender text;
