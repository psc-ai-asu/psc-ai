begin;

-- Personal credentials identify the reviewer sending telemetry, never an agent owner.
create table public.trace_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_prefix text not null check (token_prefix ~ '^rma_trace_[A-Za-z0-9_-]{8}$'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index trace_tokens_user_created_idx on public.trace_tokens (user_id, created_at desc);
alter table public.trace_tokens enable row level security;

create policy trace_tokens_select_own on public.trace_tokens for select to authenticated
  using ((select auth.uid()) = user_id);
create policy trace_tokens_insert_own on public.trace_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy trace_tokens_revoke_own on public.trace_tokens for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The baseline grants ALL by default. Explicitly remove those inherited grants.
revoke all on public.trace_tokens from public, anon, authenticated;
grant select (id, user_id, name, token_prefix, created_at, last_used_at, revoked_at)
  on public.trace_tokens to authenticated;
grant insert (user_id, name, token_hash, token_prefix) on public.trace_tokens to authenticated;
grant update (revoked_at) on public.trace_tokens to authenticated;
grant all on public.trace_tokens to service_role;

-- Browser roles can only revoke, never resurrect or choose a future revocation time.
create function public.trace_tokens_stamp_revocation() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.revoked_at := coalesce(old.revoked_at, now());
  return new;
end;
$$;
revoke all on function public.trace_tokens_stamp_revocation() from public, anon, authenticated;
create trigger trace_tokens_stamp_revocation
  before update of revoked_at on public.trace_tokens
  for each row execute function public.trace_tokens_stamp_revocation();

comment on table public.trace_tokens is 'Reviewer-owned telemetry credentials. Full secrets are never stored. Ingestion is a later workstream.';
commit;
