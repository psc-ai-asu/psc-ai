# PSC-AI Platform

The main PSC-AI platform, built with Next.js and Supabase. This guide covers running it locally against a **local Supabase database**, so local development never touches the live database.

## Prerequisites

- [Node.js](https://nodejs.org) (v18 or higher) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running whenever you use the local database)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (macOS: `brew install supabase/tap/supabase`)

You don't need to install PostgreSQL. The Supabase CLI runs Postgres and the rest of Supabase in Docker.

## First-Time Setup

1. Install dependencies from the **repo root**:
   ```bash
   npm install
   ```

2. Start the local Supabase stack from **`apps/platform`**:
   ```bash
   cd apps/platform
   supabase start
   ```
   The first run downloads the Docker images, which takes a few minutes. It then builds the database from `supabase/migrations/` and loads test data from `supabase/seed.sql`.

3. Create your env file:
   ```bash
   cp .env.example .env.local
   ```
   Then replace the `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholder with the `ANON_KEY` value from:
   ```bash
   supabase status -o env
   ```
   The hCaptcha values in `.env.example` are hCaptcha's official test keys and always pass, so leave them as they are.

4. Start the app. From the repo root:
   ```bash
   npx turbo dev --filter=@psc-ai/platform
   ```
   The app runs at [http://localhost:3001](http://localhost:3001).

5. Log in with one of the test accounts below.

## Test Accounts

The seed data creates these users. Every password is `password123`.

| Email | Username | Notes |
|---|---|---|
| dev1@example.com | alice_builder | Owns two agents |
| dev2@example.com | bob_reviewer | Owns one agent, has written reviews |
| dev3@example.com | casey_reviewer | Has written reviews |

You can also sign up new users locally. Confirmation emails and password-reset codes don't actually send. They show up in Mailpit (see below).

## Local Services

| Service | URL | Used for |
|---|---|---|
| App | http://localhost:3001 | The platform |
| Supabase Studio | http://127.0.0.1:54323 | Browsing tables, running SQL |
| Mailpit | http://127.0.0.1:54324 | Reading auth emails (e.g. password-reset codes) |
| Supabase API | http://127.0.0.1:54321 | What the app connects to |

## Everyday Commands

Run these from `apps/platform`.

| Command | What it does |
|---|---|
| `supabase start` | Start the local database. Data is kept between runs. |
| `supabase stop` | Stop the local database. |
| `supabase status` | Show local URLs and keys. |
| `supabase db reset` | Wipe the local database, re-run all migrations, and reload the seed data. |

After pulling changes that add a migration, run `supabase db reset` to bring your local database up to date.

## Making Database Changes

Schema changes are made as **migration files** in `supabase/migrations/` and committed with your code. Never change the production schema from the Supabase dashboard.

1. Create a migration, either by writing SQL yourself:
   ```bash
   supabase migration new <short_description>
   ```
   or by making changes in local Studio and generating the SQL from them:
   ```bash
   supabase db diff -f <short_description>
   ```
2. Test it with `supabase db reset`. This rebuilds the database from every migration, so it catches errors before they reach production.
3. Commit the migration file with the code that uses it, and open a PR into `dev`.

Migrations are applied to production separately, after the PR is merged. Check with the team before running any command against production.

## Seed Data

`supabase/seed.sql` holds the test data: users, profiles, agents and reviews. It reloads on every `supabase db reset`.

- **Use fake data only.** Never copy production data into the seed.
- Users are inserted into `auth.users`. The `on_auth_user_created` trigger creates each matching `public.profiles` row from the `username` in `raw_user_meta_data`.
- Usernames must be 3–30 characters, using only letters, numbers, `_` and `-`, or the seed fails with `Invalid username`.
- Keep the empty-string (`''`) token columns in the `auth.users` insert. Without them, seeded users can't log in.

## Troubleshooting

- **`supabase start` says Docker isn't running:** open Docker Desktop and wait for it to finish starting.
- **Port already in use:** another Supabase project may be running. Stop it with `supabase stop --project-id <id>`, or stop all of them with `supabase stop --all`.
- **The app can't connect or shows no data:** check that `.env.local` points to `http://127.0.0.1:54321` and has the local anon key. Restart the dev server after changing `.env.local`.
- **Seeded users can't log in ("Database error querying schema"):** an empty-string token column is missing from the `auth.users` insert in `seed.sql`.
- **Errors after pulling new changes:** run `supabase db reset` to apply new migrations.

## Safety Rules

- Never put production Supabase keys in `.env.local`. Local development only uses the local database.
- Never change the production schema from the dashboard. Every change goes through a migration.
- Before running any Supabase command with `--linked`, check which project you're linked to.

## Project Structure

```
apps/platform/
├── app/                      # Next.js routes and pages
├── components/               # React components
├── lib/                      # Shared helpers (Supabase clients, etc.)
├── public/                   # Static files
├── supabase/
│   ├── config.toml           # Local Supabase settings (auth, ports, email templates)
│   ├── migrations/           # Database schema, applied in filename order
│   ├── seed.sql              # Local test data
│   └── templates/            # Auth email templates (password recovery)
└── .env.example              # Template for .env.local
```
