begin;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where username is not null
    group by lower(btrim(username))
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate normalized profile usernames before applying this migration';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and t.tgfoid = 'public.handle_new_user()'::regprocedure
  ) then
    raise exception 'Expected auth.users profile trigger was not found';
  end if;
end;
$$;

create unique index if not exists profiles_username_normalized_key
  on public.profiles (lower(btrim(username)))
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := btrim(new.raw_user_meta_data ->> 'username');
begin
  if new.raw_user_meta_data ? 'username'
    and (requested_username is null or requested_username !~ '^[A-Za-z0-9_-]{3,30}$') then
    raise exception 'Invalid username' using errcode = '22023';
  end if;

  insert into public.profiles (id, username, email)
  values (new.id, requested_username, new.email);

  return new;
end;
$$;

commit;
