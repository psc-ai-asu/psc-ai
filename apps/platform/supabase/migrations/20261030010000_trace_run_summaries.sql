-- One row per run, for the review page's session picker and the agent profile.
--
-- security_invoker applies the reader's RLS on traces, spans and
-- span_attributes, so root_prompt is null for anyone who can see a run's
-- structure but not its text.

begin;

create view public.trace_run_summaries
with (security_invoker = true)
as
select
  t.id as trace_id,
  t.session_id,
  t.started_at,
  t.ended_at,
  t.root_received,
  coalesce(sum(coalesce(sp.input_tokens, 0) + coalesce(sp.output_tokens, 0)) filter (where sp.kind = 'llm'), 0)::integer as tokens,
  (count(*) filter (where sp.kind = 'llm' and sp.input_tokens > 0))::integer as model_calls,
  (count(*) filter (where sp.kind = 'tool'))::integer as tool_calls,
  (count(*) filter (where sp.kind = 'tool' and not sp.tool_ok))::integer as failed_tool_calls,
  -- The root span's gen_ai.prompt, as sent (JSON text); the app reads the user's message from it.
  (
    select sa.attributes ->> 'gen_ai.prompt'
    from public.spans r
    join public.span_attributes sa on sa.span_id = r.id
    where r.trace_id = t.id and r.parent_span_id is null
    limit 1
  ) as root_prompt
from public.traces t
left join public.spans sp on sp.trace_id = t.id
group by t.id;

revoke all on public.trace_run_summaries from anon, authenticated;
grant select on public.trace_run_summaries to anon, authenticated;

commit;
