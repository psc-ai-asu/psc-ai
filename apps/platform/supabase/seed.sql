-- Local development seed data. Fake data only; never copy prod data here.
-- Every test user's password is: password123
--
-- Three demo accounts, one per role in the showcase:
--   demo_developer   owns every agent, including the Course Planner demo agent
--   demo_reviewer_1  runs the Course Planner and writes the Trace-backed review
--   demo_reviewer_2  a second reviewer, e.g. to show a session can't be used by another account

-- Users. The on_auth_user_created trigger creates each matching public.profiles row.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'developer@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"demo_developer"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'reviewer1@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"demo_reviewer_1"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'reviewer2@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"username":"demo_reviewer_2"}', now(), now(), '', '', '', '');

-- Email/password login also needs an identity row for each user.
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email in ('developer@example.com', 'reviewer1@example.com', 'reviewer2@example.com');

update public.profiles set bio = 'Builds and onboards agents.'
where id = '10000000-0000-0000-0000-000000000001';

-- Agents, all owned by demo_developer
insert into public.agents (id, developed_by, name, description, framework, public_metrics, status)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Research Assistant', 'Summarizes papers and finds related work.', 'LangChain', true, 'active'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Code Reviewer', 'Reviews pull requests for bugs and style issues.', 'OpenAI Agents SDK', true, 'active'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   'Trip Planner', 'Plans itineraries from a budget and dates.', 'CrewAI', false, 'fired'),
  -- The demo agent in examples/course-planner; its .env points at this id.
  ('a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   'Course Planner', 'Plans a one-semester class schedule from a student''s request.', 'LangChain', true, 'active');

-- Reviews by the two reviewer accounts (scores are 1-5; overall_score is calculated
-- automatically). All unverified: a verified (Trace-backed) review needs a recorded
-- session, which only the review flow creates.
insert into public.reviews (agent_id, review_by, task, date, goal_completion, helpfulness, coherence,
                            factuality, safety, review_note, verification_status)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
   'Summarize a paper on retrieval-augmented generation', now() - interval '5 days',
   5, 4, 5, 4, 5, 'Accurate summary, missed one key limitation.', 'unverified'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
   'Find related work on agent evaluation', now() - interval '2 days',
   3, 4, 4, 2, 5, 'Two of the citations did not exist.', 'unverified'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'Review a 200-line Python PR', now() - interval '1 day',
   4, 5, 4, 5, 5, null, 'unverified'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   'Plan a 3-day trip under $500', now() - interval '10 days',
   2, 3, 3, 3, 4, 'Went over budget by $120.', 'unverified');
