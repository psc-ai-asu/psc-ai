# Project Overview

This is the monorepo for the PSC-AI platform - [https://www.reviewmyagent.today](https://www.reviewmyagent.today)

It contains two apps:
- **platform** — the main PSC-AI platform
- **landing** — pre-launch sign-up page (no longer in active development)

## Documentation

Full documentation lives at **[docs.reviewmyagent.today](https://docs.reviewmyagent.today)**:

- **[Guides](https://docs.reviewmyagent.today)** — how to use the platform
- **[Contributing](https://docs.reviewmyagent.today/contributing/quickstart)** — setting up and developing locally

The docs source is in [`docs/`](docs/). See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Quickstart

You'll need [Node.js](https://nodejs.org) (v18 or higher), [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
git clone https://github.com/psc-ai-asu/psc-ai.git
cd psc-ai
npm install
```

Then follow [Local Setup](https://docs.reviewmyagent.today/contributing/local-setup) to start the local database and run the platform at [http://localhost:3001](http://localhost:3001).

## Personal trace tokens

The review dashboard and agent directory link to **Personal traces & tokens** at
`/review/trace-tokens`. Signed-in users can create, list, and revoke their own
tokens. Review forms include an optional saved-run selector with an empty state
until run capture and metric attachments are implemented. See
[setup and integration](docs/personal-trace-tokens.md).
