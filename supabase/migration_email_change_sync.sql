-- Migration: keep profiles.email in sync when an agent's login email changes
-- Run this once in Supabase's SQL Editor.
--
-- Why: agents can now change their own login email from My Profile. Supabase Auth handles the
-- actual email-change confirmation flow, but the "Email" column on the profiles table was only
-- ever set once, at signup — nothing kept it in sync if the login email changed afterward. This
-- adds a trigger that copies auth.users.email onto the matching profiles row whenever it
-- actually changes (self-service here, or an admin editing it directly in Supabase).
-- Safe to run more than once.

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_change();
