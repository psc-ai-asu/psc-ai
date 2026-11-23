-- Firing agents: a developer takes a poorly performing agent out of use, and
-- has to say what was improved before it can come back.
--
-- An agent's status only changes through fire_agent() and rehire_agent(), which
-- also record why in agent_status_events. A fired agent can't receive reviews.

begin;

-- Status ---------------------------------------------------------------------

update public.agents set status = 'active' where status is null;

alter table public.agents
  alter column status set default 'active',
  alter column status set not null,
  add constraint agents_status_valid check (status in ('active', 'fired'));

-- Owners keep editing their agents while fired, since that's the further work,
-- but not the status. Column privileges don't cover new columns: add any new
-- owner-editable column here too.
revoke update on public.agents from anon, authenticated;
grant update (name, description, framework, public_metrics, github_repo_url)
  on public.agents to authenticated;

-- History --------------------------------------------------------------------

-- One row per fire or rehire. The note is the reason for firing, or what was
-- improved before rehiring, and is shown publicly on the agent's page.
create table public.agent_status_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on update cascade on delete cascade,
  status text not null check (status in ('active', 'fired')),
  note text not null check (char_length(note) between 10 and 1000),
  changed_by uuid references public.profiles (id) on update cascade on delete set null,
  created_at timestamptz not null default now()
);

create index agent_status_events_agent_recent
  on public.agent_status_events (agent_id, created_at desc);

alter table public.agent_status_events enable row level security;

create policy "Enable read access for all users" on public.agent_status_events
  for select using (true);

-- The default privileges grant anon and authenticated everything on new
-- tables, including TRUNCATE, which RLS doesn't cover. Browsers only read.
revoke all on public.agent_status_events from anon, authenticated;
grant select on public.agent_status_events to anon, authenticated;

-- Changing status ------------------------------------------------------------

-- Error codes:
--   42501 not signed in, or not the agent's owner
--   P0002 agent not found
--   22023 the note is too short or too long
--   55000 the agent already has that status
create function public.set_agent_status(p_agent_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  clean_note text := btrim(p_note);
  agent public.agents;
begin
  if actor is null then
    raise exception 'Sign in to change this agent.' using errcode = '42501';
  end if;

  -- Locks the agent so two changes can't both pass the checks below.
  select * into agent from public.agents where id = p_agent_id for update;

  if not found then
    raise exception 'This agent couldn''t be found.' using errcode = 'P0002';
  end if;
  if agent.developed_by is distinct from actor then
    raise exception 'Only the agent''s developer can change its status.' using errcode = '42501';
  end if;
  if agent.status = p_status then
    raise exception 'This agent is already %.', p_status using errcode = '55000';
  end if;
  if clean_note is null or char_length(clean_note) not between 10 and 1000 then
    raise exception 'Write between 10 and 1000 characters.' using errcode = '22023';
  end if;

  update public.agents set status = p_status where id = agent.id;

  insert into public.agent_status_events (agent_id, status, note, changed_by)
  values (agent.id, p_status, clean_note, actor);
end;
$$;

revoke all on function public.set_agent_status(uuid, text, text) from public, anon, authenticated;

create function public.fire_agent(p_agent_id uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.set_agent_status(p_agent_id, 'fired', p_reason);
$$;

create function public.rehire_agent(p_agent_id uuid, p_improvements text)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.set_agent_status(p_agent_id, 'active', p_improvements);
$$;

revoke all on function public.fire_agent(uuid, text) from public, anon;
revoke all on function public.rehire_agent(uuid, text) from public, anon;
grant execute on function public.fire_agent(uuid, text) to authenticated;
grant execute on function public.rehire_agent(uuid, text) to authenticated;

-- Reviews --------------------------------------------------------------------

-- Restrictive, so it applies on top of whatever the insert policies allow
-- without having to restate them.
create policy "only active agents take reviews" on public.reviews
  as restrictive for insert
  with check (exists (
    select 1 from public.agents a
    where a.id = reviews.agent_id and a.status = 'active'
  ));

commit;
