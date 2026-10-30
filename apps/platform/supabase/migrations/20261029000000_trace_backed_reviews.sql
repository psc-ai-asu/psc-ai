-- Execution traces and Trace-backed reviews.
--
-- The ingest route (/api/otel/v1/traces) writes trace_sessions, traces, spans
-- and span_attributes with the service-role key, which bypasses RLS. Browsers
-- only read them, and a review is marked verified ("Trace-backed") only
-- through submit_trace_backed_review().
--
-- A session is one conversation with an agent (LangGraph's thread_id), a trace
-- is one run inside it, and spans are the steps of a run. Prompt and output
-- text lives in span_attributes, which only the submitter and the agent's
-- owner can read; public viewers see structure, timings and token counts.

begin;

-- Sessions ------------------------------------------------------------------

create table public.trace_sessions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on update cascade on delete cascade,
  submitted_by uuid not null references public.profiles (id) on update cascade on delete cascade,
  -- thread_id from langsmith.metadata.thread_id, or the trace id when a run has none.
  session_key text not null,
  created_at timestamptz not null default now(),
  last_span_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Runs sent with the same thread_id after a review start a new session, so the
-- key is only unique among sessions that haven't been reviewed yet.
create unique index trace_sessions_open_key
  on public.trace_sessions (agent_id, submitted_by, session_key)
  where reviewed_at is null;

create index trace_sessions_submitter_recent
  on public.trace_sessions (submitted_by, agent_id, last_span_at desc);

-- Runs ----------------------------------------------------------------------

create table public.traces (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.trace_sessions (id) on delete cascade,
  otel_trace_id text not null unique check (otel_trace_id ~ '^[0-9a-f]{32}$'),
  -- Earliest and latest span times seen so far; the root span's own times once it arrives.
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- The root span finishes, and is exported, last; until it arrives the run is still in progress.
  root_received boolean not null default false
);

create index traces_session on public.traces (session_id);

-- Spans ---------------------------------------------------------------------

create table public.spans (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid not null references public.traces (id) on delete cascade,
  span_id text not null check (span_id ~ '^[0-9a-f]{16}$'),
  -- No foreign key: a child is often stored before its parent arrives, so the
  -- tree is built when it's read.
  parent_span_id text check (parent_span_id ~ '^[0-9a-f]{16}$'),
  name text not null,
  kind text not null check (kind in ('llm', 'tool', 'chain', 'agent', 'other')),
  -- LangGraph's per-step "model" and "tools" node spans, hidden in the span tree.
  is_wrapper boolean not null default false,
  status_code smallint not null default 0,
  status_message text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  model text,
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  tool_name text,
  -- Tool spans only. Tools report failures in their result, not the span
  -- status, so the ingest route sets this from the result (false when it has
  -- an "error" key or "ok": false).
  tool_ok boolean,
  unique (trace_id, span_id)
);

-- Every raw attribute as sent, including prompts and outputs. Kept apart from
-- spans so its RLS can be stricter.
create table public.span_attributes (
  span_id uuid primary key references public.spans (id) on delete cascade,
  attributes jsonb not null
);

-- A session backs at most one review --------------------------------------

alter table public.reviews
  add column session_id uuid unique references public.trace_sessions (id) on delete set null;

-- One Trace-backed review per reviewer per agent.
create unique index reviews_one_verified_per_reviewer
  on public.reviews (agent_id, review_by)
  where verification_status = 'verified';

-- Plain inserts stay unverified and can't claim a session; only
-- submit_trace_backed_review() can.
drop policy "auth insert" on public.reviews;
create policy "auth insert" on public.reviews for insert with check (
  auth.uid() = review_by
  and verification_status = 'unverified'
  and session_id is null
);

-- Read access ----------------------------------------------------------------

-- Structure, timings and token counts: the submitter, the agent's owner, or
-- anyone once the session backs a review of an agent with public metrics.
create function public.can_view_trace_session(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trace_sessions s
    join public.agents a on a.id = s.agent_id
    where s.id = target
      and (
        s.submitted_by = auth.uid()
        or a.developed_by = auth.uid()
        or (a.public_metrics and exists (select 1 from public.reviews r where r.session_id = s.id))
      )
  );
$$;

-- Prompt and output text: the submitter and the agent's owner only.
create function public.can_view_trace_text(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trace_sessions s
    join public.agents a on a.id = s.agent_id
    where s.id = target
      and (s.submitted_by = auth.uid() or a.developed_by = auth.uid())
  );
$$;

alter table public.trace_sessions enable row level security;
alter table public.traces enable row level security;
alter table public.spans enable row level security;
alter table public.span_attributes enable row level security;

create policy "visible sessions" on public.trace_sessions for select
  using (public.can_view_trace_session(id));

create policy "visible traces" on public.traces for select
  using (public.can_view_trace_session(session_id));

create policy "visible spans" on public.spans for select
  using (public.can_view_trace_session(
    (select t.session_id from public.traces t where t.id = spans.trace_id)
  ));

create policy "submitter and owner read text" on public.span_attributes for select
  using (public.can_view_trace_text(
    (select t.session_id from public.spans sp join public.traces t on t.id = sp.trace_id where sp.id = span_attributes.span_id)
  ));

-- The default privileges grant anon and authenticated everything on new
-- tables, including TRUNCATE, which RLS doesn't cover. Browsers only read.
revoke all on public.trace_sessions, public.traces, public.spans, public.span_attributes from anon, authenticated;
grant select on public.trace_sessions, public.traces, public.spans, public.span_attributes to anon, authenticated;

-- Submitting a Trace-backed review -------------------------------------------

-- Error codes the review page maps to messages:
--   42501 not signed in, or the session was recorded by another account
--   P0002 session not found
--   23505 the session already backs a review, or the reviewer already has a
--         Trace-backed review of this agent
--   55000 a run in the session is still in progress
--   22023 the session has no model call with token usage
create function public.submit_trace_backed_review(
  p_session_id uuid,
  p_task text,
  p_goal_completion smallint,
  p_helpfulness smallint,
  p_coherence smallint,
  p_factuality smallint,
  p_safety smallint,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid := auth.uid();
  session public.trace_sessions;
  review_id uuid;
begin
  if reviewer is null then
    raise exception 'Sign in to submit a review.' using errcode = '42501';
  end if;

  -- Locks the session so two submits can't both pass the checks below.
  select * into session from public.trace_sessions where id = p_session_id for update;

  if not found then
    raise exception 'This session couldn''t be found.' using errcode = 'P0002';
  end if;
  if session.submitted_by <> reviewer then
    raise exception 'This session was recorded by another account.' using errcode = '42501';
  end if;
  if session.reviewed_at is not null then
    raise exception 'This session already backs a review.' using errcode = '23505';
  end if;
  if not exists (select 1 from public.traces where session_id = session.id)
    or exists (select 1 from public.traces where session_id = session.id and not root_received) then
    raise exception 'This session is still in progress. Try again in a moment.' using errcode = '55000';
  end if;
  if not exists (
    select 1
    from public.spans sp
    join public.traces t on t.id = sp.trace_id
    where t.session_id = session.id and sp.kind = 'llm' and sp.input_tokens > 0
  ) then
    raise exception 'This session has no model calls to back a review.' using errcode = '22023';
  end if;

  -- The unique indexes on reviews raise 23505 for a second Trace-backed
  -- review of the same agent.
  insert into public.reviews (
    agent_id, review_by, task, goal_completion, helpfulness, coherence,
    factuality, safety, review_note, verification_status, session_id
  )
  values (
    session.agent_id, reviewer, p_task, p_goal_completion, p_helpfulness, p_coherence,
    p_factuality, p_safety, p_review_note, 'verified', session.id
  )
  returning id into review_id;

  update public.trace_sessions set reviewed_at = now() where id = session.id;

  return review_id;
end;
$$;

revoke all on function public.submit_trace_backed_review(uuid, text, smallint, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.submit_trace_backed_review(uuid, text, smallint, smallint, smallint, smallint, smallint, text) to authenticated;

-- Per-agent metrics ------------------------------------------------------------

-- Only finished runs from sessions that back a review count. security_invoker
-- applies the reader's RLS, so agents without public metrics show nothing to
-- anyone but their owner.
create view public.agent_metrics
with (security_invoker = true)
as
with runs as (
  select
    s.agent_id,
    s.id as session_id,
    t.id as trace_id,
    extract(epoch from (t.ended_at - t.started_at)) * 1000 as latency_ms
  from public.traces t
  join public.trace_sessions s on s.id = t.session_id
  where t.root_received
    and exists (select 1 from public.reviews r where r.session_id = s.id)
),
run_totals as (
  select
    runs.agent_id,
    runs.session_id,
    runs.latency_ms,
    coalesce(sum(coalesce(sp.input_tokens, 0) + coalesce(sp.output_tokens, 0)) filter (where sp.kind = 'llm'), 0) as tokens,
    count(*) filter (where sp.kind = 'tool') as tool_calls,
    count(*) filter (where sp.kind = 'tool' and sp.tool_ok) as tool_calls_ok
  from runs
  left join public.spans sp on sp.trace_id = runs.trace_id
  group by runs.agent_id, runs.session_id, runs.trace_id, runs.latency_ms
)
select
  agent_id,
  count(distinct session_id)::integer as sessions,
  count(*)::integer as runs,
  round(avg(tokens))::integer as avg_tokens_per_run,
  round(avg(latency_ms))::integer as avg_latency_ms,
  sum(tool_calls)::integer as tool_calls,
  round(sum(tool_calls_ok)::numeric / nullif(sum(tool_calls), 0), 3) as tool_success_rate
from run_totals
group by agent_id;

revoke all on public.agent_metrics from anon, authenticated;
grant select on public.agent_metrics to anon, authenticated;

commit;
