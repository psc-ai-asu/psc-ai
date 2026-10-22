# PSC-AI Platform

The main PSC-AI platform, built with Next.js and Supabase.

Developer docs live at **[docs.reviewmyagent.today/contributing](https://docs.reviewmyagent.today/contributing/quickstart)**:

- [Local Setup](https://docs.reviewmyagent.today/contributing/local-setup) — run the platform against a local Supabase database
- [Test Accounts](https://docs.reviewmyagent.today/contributing/test-accounts) and [Local Services](https://docs.reviewmyagent.today/contributing/local-services)
- [Database Changes](https://docs.reviewmyagent.today/contributing/database-changes) and [Seed Data](https://docs.reviewmyagent.today/contributing/seed-data)
- [Troubleshooting](https://docs.reviewmyagent.today/contributing/troubleshooting)
- [Safety Rules](https://docs.reviewmyagent.today/contributing/safety-rules)

## Quickstart

From `apps/platform`, with Docker Desktop running:

```bash
supabase start
cp .env.example .env.local   # then paste ANON_KEY from `supabase status -o env`
```

Then from the repo root:

```bash
npx turbo dev --filter=@psc-ai/platform
```

The app runs at [http://localhost:3001](http://localhost:3001).
