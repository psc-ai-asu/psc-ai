-- Optional link to the agent's source code. Only canonical GitHub repo URLs are
-- allowed, so the value is always safe to render as a link.
alter table public.agents
  add column github_repo_url text,
  add constraint agents_github_repo_url_format check (
    github_repo_url is null
    or github_repo_url ~ '^https://github\.com/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})/[A-Za-z0-9._-]{1,100}$'
  );

comment on column public.agents.github_repo_url is 'Public GitHub repository for the agent, as https://github.com/<owner>/<repo>';
