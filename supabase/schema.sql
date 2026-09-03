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

create policy "Agents see their own clients"
  on public.clients for select
  using (owner_id = auth.uid());

create policy "Agents manage their own clients"
  on public.clients for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and c.owner_id = auth.uid()
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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_tasks.client_id
        and c.owner_id = auth.uid()
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

create policy "Agents see their own reminders"
  on public.reminders for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_analyses.client_id
        and c.owner_id = auth.uid()
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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_financial_plans.client_id
        and c.owner_id = auth.uid()
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
-- by the existing "owner sees their own" policy above.
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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_products.client_id
        and c.owner_id = auth.uid()
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
drop policy if exists "Agents see their own meetings" on public.client_meetings;
create policy "Agents see their own meetings"
  on public.client_meetings for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = product_illustrations.client_id
        and c.owner_id = auth.uid()
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
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = illustration_scenarios.client_id
        and c.owner_id = auth.uid()
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

-- ─────────────────────────────────────────────────────────────
-- 27. Remove the Admin "see every advisor's clients" bypass (added 9/1) — Karina's advisors are
-- independent agents under her brokerage, not employees, so each advisor's book of business is
-- their own, not something the brokerage (or Karina, logged in as Admin) can browse into. Admin
-- previously meant two separate things: (a) can invite/manage the team via /admin/invite, and
-- (b) bypasses every client-ownership check to see/manage every advisor's clients, notes, tasks,
-- reminders, analyses, financial plans, products, meetings, illustrations, and scenarios. This
-- section removes (b) only — Admin keeps (a). Every advisor (Karina included, if she's ever
-- logged in under an agent account working her own clients) now only sees rows where
-- owner_id/agent_id is their own auth.uid(), full stop, with no role-based exception anywhere.
-- advisor_credentials (NPN/carrier codes — back-office compliance data, not book-of-business) and
-- calendar_connections (never had an admin bypass) are deliberately left untouched.
-- ─────────────────────────────────────────────────────────────

drop policy if exists "Agents see their own clients, admins see all" on public.clients;
drop policy if exists "Agents see their own clients" on public.clients;
create policy "Agents see their own clients"
  on public.clients for select
  using (owner_id = auth.uid());

drop policy if exists "Agents manage their own clients, admins manage all" on public.clients;
drop policy if exists "Agents manage their own clients" on public.clients;
create policy "Agents manage their own clients"
  on public.clients for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Notes follow client visibility" on public.client_notes;
create policy "Notes follow client visibility"
  on public.client_notes for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_notes.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Tasks follow client visibility" on public.client_tasks;
create policy "Tasks follow client visibility"
  on public.client_tasks for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_tasks.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_tasks.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Agents see their own reminders, admins see all" on public.reminders;
drop policy if exists "Agents see their own reminders" on public.reminders;
create policy "Agents see their own reminders"
  on public.reminders for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "Analyses follow client visibility" on public.client_analyses;
create policy "Analyses follow client visibility"
  on public.client_analyses for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_analyses.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_analyses.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Financial plans follow client visibility" on public.client_financial_plans;
create policy "Financial plans follow client visibility"
  on public.client_financial_plans for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_financial_plans.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_financial_plans.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Products follow client visibility" on public.client_products;
create policy "Products follow client visibility"
  on public.client_products for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_products.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_products.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Agents see their own meetings, admins see all" on public.client_meetings;
drop policy if exists "Agents see their own meetings" on public.client_meetings;
create policy "Agents see their own meetings"
  on public.client_meetings for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "Illustrations follow client visibility" on public.product_illustrations;
create policy "Illustrations follow client visibility"
  on public.product_illustrations for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = product_illustrations.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = product_illustrations.client_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Illustration scenarios follow client visibility" on public.illustration_scenarios;
create policy "Illustration scenarios follow client visibility"
  on public.illustration_scenarios for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = illustration_scenarios.client_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = illustration_scenarios.client_id
        and c.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 28. Team / Recruits (added 9/3) — tracking prospective and in-progress agents, kept completely
-- separate from Clients. Karina's own stages: "Lead" (watching the intro calls, progressing
-- through the early conversation), "Studying" (actively studying for their license exam),
-- "Licensed" (active, appointed agent). Deliberately flat — explicitly no upline/downline, and
-- no commission tracking (the broker already handles that). client_id is an OPTIONAL
-- cross-reference for the case where an existing client wants to become an agent — it links the
-- two records without merging them; a recruit is never altered just because the linked client
-- changes, and vice versa.
-- ─────────────────────────────────────────────────────────────
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
  -- Optional link to an existing client who wants to become an agent — see comment above.
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

-- Reminders can now belong to a recruit instead of a client — this is the "nudge" for follow-ups
-- Karina asked for, wired straight into the existing Reminders table/page/UI rather than building
-- a second notification system. client_id becomes nullable; the check constraint keeps every
-- reminder pointed at exactly one of the two. Existing rows are unaffected (they all already have
-- client_id set and recruit_id defaults null, which satisfies the constraint as-is). No RLS
-- change needed here — reminders were already scoped by agent_id = auth.uid(), not by walking
-- through the client, so a recruit's reminders are private to the owning agent automatically.
alter table public.reminders alter column client_id drop not null;
alter table public.reminders add column if not exists recruit_id uuid references public.recruits(id) on delete cascade;

alter table public.reminders drop constraint if exists reminders_client_or_recruit_chk;
alter table public.reminders add constraint reminders_client_or_recruit_chk check (
  (client_id is not null and recruit_id is null) or (client_id is null and recruit_id is not null)
);

create index if not exists reminders_recruit_id_idx on public.reminders(recruit_id) where recruit_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 29. Medical Condition Report (added 9/3) — a universal, condition-agnostic questionnaire tied
-- to a client's profile, for gathering enough detail to call carrier underwriting for an informal
-- risk assessment before a formal application (Karina's own motivating example: a client with 3
-- strokes, now medication-controlled). Fillable either by the agent live on a call, or by the
-- client themselves via a unique per-client public link. Scoped strictly to the condition itself
-- per Karina's "No, just condition" when asked whether to fold in client-level fields (tobacco,
-- family history, etc.) — those don't belong here; height/weight already live on clients
-- (section 22) and stay there.
-- One row per condition per client — a client can log more than one (a cardiac history and
-- diabetes, say). events/medications are kept as jsonb arrays (simple date+text shape, no need
-- for their own relational identity) rather than child tables — same reasoning as
-- illustration_scenarios.data.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.medical_conditions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  condition_name text not null,
  onset_date date,
  current_status text, -- e.g. "Controlled with medication", "Resolved", "Ongoing — moderate"
  treating_physician text,
  latest_report_date date,
  latest_report_summary text,
  hospitalizations text,
  additional_notes text,
  events jsonb not null default '[]'::jsonb, -- [{date, description}] — initial event + recurrences
  medications jsonb not null default '[]'::jsonb, -- [{name, dosage, start_date, lifelong}]
  -- true when submitted through the public client-facing link rather than entered by the agent
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

-- Per-client unique, unguessable token for the public "fill this out" link — deliberately NOT
-- the client's own id (unlike the advisor-level Intake link), since health information is more
-- sensitive than a general intake form. Defaulted so every client — existing and new — always
-- has one without a separate "generate" step.
alter table public.clients add column if not exists medical_report_token uuid default gen_random_uuid();
update public.clients set medical_report_token = gen_random_uuid() where medical_report_token is null;
alter table public.clients alter column medical_report_token set default gen_random_uuid();
alter table public.clients alter column medical_report_token set not null;

create unique index if not exists clients_medical_report_token_idx on public.clients(medical_report_token);

-- ─────────────────────────────────────────────────────────────
-- 30. Client city/state + timezone (added 9/3) — Karina's use case: before calling or emailing a
-- client, or booking something with them, know how many hours apart you are. `timezone` is an
-- explicit selection (an IANA zone id, e.g. "America/Chicago") rather than inferred from state,
-- since several states span more than one zone (Texas, Florida, Tennessee, Kentucky, Indiana,
-- Michigan, and others) and Arizona doesn't observe daylight saving — city/state are just
-- reference context to help pick the right one; the app never tries to derive a timezone from
-- them. See src/lib/types.ts (US_TIMEZONE_OPTIONS) for the offered list and src/lib/timezone.ts
-- for how the "N hours ahead/behind you" comparison is computed (live, against whatever timezone
-- the advisor's own device currently reports — so it's already correct while traveling, same as
-- every other date/time on the portal; see LocalDateTime.tsx).
-- ─────────────────────────────────────────────────────────────
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists state text;
alter table public.clients add column if not exists timezone text;

-- ─────────────────────────────────────────────────────────────
-- 31. Carrier Logins + State Licenses (added 9/3) — Karina was tracking her own broker/carrier
-- portal logins (F&G, North American, Ethos, Athene, Nationwide, WinFlex, Mutual of Omaha, etc.)
-- in a messy personal spreadsheet — this is a private, per-advisor replacement, added as a new
-- "Carrier & Licensing" section on My Profile (two tabs), NOT on client profiles — none of this
-- is client data, it's the same regardless of which client the advisor is working on.
-- Deliberately does NOT track license expiration/renewal dates or status — that's compliance
-- data already tracked authoritatively in SureLC; duplicating it here risks a second,
-- silently-stale copy. This is organization/quick-access only: which carriers, which states,
-- and the numbers/links needed to log in fast.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.carrier_logins (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  company text not null,
  username text,
  password text,
  -- Most carriers issue a SEPARATE agent ID per product line — Karina's own F&G row has
  -- "Annuities 000763473 / Life 000756492" as two distinct numbers under one company. Split so
  -- each has its own field instead of cramming both into one text box (added 9/3 — see section 33
  -- below for the migration that renames the original single `agent_number` on an existing table).
  life_agent_number text,
  annuity_agent_number text,
  agency_number text, -- the agency/GA/IMO's own number with that carrier, distinct from the agent's personal number above
  profile_code text, -- freeform: a code, a note, or a URL — whatever that carrier's portal calls it
  link text, -- the portal login URL
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

-- ─────────────────────────────────────────────────────────────
-- 32. NPN on the advisor's own profile (added 9/3) — Karina had been storing her National
-- Producer Number as a generic entry in My Credentials, alongside carrier agent codes and state
-- license numbers now that both of those have proper homes (My Credentials, Carrier Logins,
-- State Licenses — section 31). NPN is a single, one-per-advisor identifier, not a repeatable
-- list, so it gets its own field on Your Info instead of sharing the generic label/code shape.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists npn text;

-- ─────────────────────────────────────────────────────────────
-- 33. Split carrier_logins.agent_number into life_agent_number + annuity_agent_number (added 9/3)
-- — most carriers issue a separate agent ID per product line (Karina's own F&G row has
-- "Annuities 000763473 / Life 000756492"). The create table statement in section 31 above was
-- edited in place to define the two new columns directly, but Karina's live database already ran
-- that create table before this split existed, so her real carrier_logins table still has the old
-- single `agent_number` column — with real data in it. This block detects that case and renames
-- the old column to `life_agent_number` (an arbitrary but reasonable choice — it can be
-- re-sorted per-row afterward) so no data is lost, then adds `annuity_agent_number` as a normal
-- safety net for everyone else. Idempotent either way: safe to run on a fresh database (where
-- section 31 already created the new columns and there's no old one to rename) or on Karina's
-- live one.
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'carrier_logins' and column_name = 'agent_number'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'carrier_logins' and column_name = 'life_agent_number'
  ) then
    alter table public.carrier_logins rename column agent_number to life_agent_number;
  end if;
end $$;

alter table public.carrier_logins add column if not exists life_agent_number text;
alter table public.carrier_logins add column if not exists annuity_agent_number text;
