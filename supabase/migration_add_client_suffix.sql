-- Name suffix (Jr., Sr., II, III…) on clients (added 10/17) — Karina: "i need a section for jr sr on
-- name etc." Run once in Supabase's SQL Editor, BEFORE deploying the matching code.
-- Adds clients.suffix and makes the full_name trigger append it ("John Smith Jr."), so every
-- place that already shows full_name picks it up with no other change. Advisors' own profiles keep
-- using the original sync_full_name() function and are not affected.

alter table public.clients add column if not exists suffix text;

create or replace function public.sync_client_full_name()
returns trigger
language plpgsql
as $$
begin
  new.full_name := trim(both ' ' from
    coalesce(new.first_name, '') ||
    case when coalesce(trim(new.middle_name), '') <> '' then ' ' || trim(new.middle_name) else '' end ||
    case when coalesce(trim(new.last_name), '') <> '' then ' ' || trim(new.last_name) else '' end ||
    case when coalesce(trim(new.suffix), '') <> '' then ' ' || trim(new.suffix) else '' end
  );
  return new;
end;
$$;

drop trigger if exists sync_client_full_name on public.clients;
create trigger sync_client_full_name
  before insert or update of first_name, middle_name, last_name, suffix on public.clients
  for each row execute function public.sync_client_full_name();
