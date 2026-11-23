-- Storing ingested spans.
--
-- The ingest route (/api/otel/v1/traces) calls ingest_trace_spans() once per
-- export request with the rows normalize.js produced, so a batch is stored in
-- one transaction. Exporters retry and send a run's spans in several batches,
-- possibly at once, so every write is an upsert and a batch may be replayed.

begin;

-- p_spans is a JSON array of objects whose keys are the spans columns, plus
-- otel_trace_id, session_key and attributes (the raw attributes object).
--
-- Error codes the route maps to responses:
--   42501 a trace id in the batch belongs to another account's or agent's session
create function public.ingest_trace_spans(
  p_agent_id uuid,
  p_submitted_by uuid,
  p_spans jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  run record;
  existing record;
  target_session uuid;
  target_trace uuid;
  stored integer;
begin
  -- One row per run in the batch. Ordered by trace id so concurrent batches
  -- lock traces in the same order.
  for run in
    select
      x.otel_trace_id,
      -- normalize.js gives every span of a run the same key; prefer a thread_id over the fallback.
      coalesce(max(x.session_key) filter (where x.session_key <> x.otel_trace_id), x.otel_trace_id) as session_key,
      min(x.start_time) as first_start,
      max(x.end_time) as last_end,
      min(x.start_time) filter (where x.parent_span_id is null) as root_start,
      max(x.end_time) filter (where x.parent_span_id is null) as root_end
    from jsonb_to_recordset(p_spans) as x(
      otel_trace_id text, session_key text, parent_span_id text, start_time timestamptz, end_time timestamptz
    )
    group by x.otel_trace_id
    order by x.otel_trace_id
  loop
    -- A run that's already stored stays in its session, even once that
    -- session backs a review (a retried batch can arrive after the review).
    select t.id, t.session_id, s.agent_id, s.submitted_by into existing
    from public.traces t
    join public.trace_sessions s on s.id = t.session_id
    where t.otel_trace_id = run.otel_trace_id;

    if found then
      target_session := existing.session_id;
    else
      insert into public.trace_sessions (agent_id, submitted_by, session_key, last_span_at)
      values (p_agent_id, p_submitted_by, run.session_key, run.last_end)
      on conflict (agent_id, submitted_by, session_key) where reviewed_at is null
        do update set last_span_at = greatest(public.trace_sessions.last_span_at, excluded.last_span_at)
      returning id into target_session;
    end if;

    -- Locks the run until commit. Until the root span arrives the run's times
    -- widen to cover every span seen; once it does, they're the root's own.
    insert into public.traces as t (session_id, otel_trace_id, started_at, ended_at, root_received)
    values (
      target_session, run.otel_trace_id,
      coalesce(run.root_start, run.first_start), coalesce(run.root_end, run.last_end),
      run.root_start is not null
    )
    on conflict (otel_trace_id) do update set
      started_at = case
        when excluded.root_received then excluded.started_at
        when t.root_received then t.started_at
        else least(t.started_at, excluded.started_at)
      end,
      ended_at = case
        when excluded.root_received then excluded.ended_at
        when t.root_received then t.ended_at
        else greatest(t.ended_at, excluded.ended_at)
      end,
      root_received = t.root_received or excluded.root_received
    returning id, session_id into target_trace, target_session;

    -- Checked after the upsert too, since a concurrent batch may have created
    -- the run first. Raising undoes everything this call wrote.
    select s.agent_id, s.submitted_by into existing
    from public.trace_sessions s
    where s.id = target_session;

    if existing.submitted_by <> p_submitted_by or existing.agent_id <> p_agent_id then
      raise exception 'Trace % belongs to another session.', run.otel_trace_id using errcode = '42501';
    end if;

    update public.trace_sessions
    set last_span_at = greatest(last_span_at, run.last_end)
    where id = target_session;
  end loop;

  -- A retried span replaces its earlier copy. distinct on keeps one row per
  -- span, since an upsert can't touch the same row twice in one statement.
  with incoming as (
    select distinct on (x.otel_trace_id, x.span_id) x.*
    from jsonb_to_recordset(p_spans) as x(
      otel_trace_id text, span_id text, parent_span_id text, name text, kind text,
      is_wrapper boolean, status_code smallint, status_message text,
      start_time timestamptz, end_time timestamptz, model text,
      input_tokens integer, output_tokens integer, tool_name text, tool_ok boolean,
      attributes jsonb
    )
  ),
  upserted as (
    insert into public.spans as sp (
      trace_id, span_id, parent_span_id, name, kind, is_wrapper, status_code, status_message,
      start_time, end_time, model, input_tokens, output_tokens, tool_name, tool_ok
    )
    select
      t.id, i.span_id, i.parent_span_id, i.name, i.kind, coalesce(i.is_wrapper, false),
      coalesce(i.status_code, 0), i.status_message, i.start_time, i.end_time, i.model,
      i.input_tokens, i.output_tokens, i.tool_name, i.tool_ok
    from incoming i
    join public.traces t on t.otel_trace_id = i.otel_trace_id
    on conflict (trace_id, span_id) do update set
      parent_span_id = excluded.parent_span_id,
      name = excluded.name,
      kind = excluded.kind,
      is_wrapper = excluded.is_wrapper,
      status_code = excluded.status_code,
      status_message = excluded.status_message,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      model = excluded.model,
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      tool_name = excluded.tool_name,
      tool_ok = excluded.tool_ok
    returning sp.id, sp.trace_id, sp.span_id
  )
  insert into public.span_attributes (span_id, attributes)
  select u.id, coalesce(i.attributes, '{}'::jsonb)
  from upserted u
  join public.traces t on t.id = u.trace_id
  join incoming i on i.otel_trace_id = t.otel_trace_id and i.span_id = u.span_id
  on conflict (span_id) do update set attributes = excluded.attributes;

  get diagnostics stored = row_count;
  return stored;
end;
$$;

-- Only the ingest route, with the service-role key, stores spans.
revoke all on function public.ingest_trace_spans(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ingest_trace_spans(uuid, uuid, jsonb) to service_role;

commit;
