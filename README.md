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

## Personal trace tokens and local telemetry spike

The review dashboard and agent directory include **Personal traces & tokens** at
`/review/trace-tokens`. Review forms include an optional saved-run selector, shown
in an empty state until run capture and metric attachments are implemented. See
[local migration/setup and checks](docs/personal-trace-tokens.md) and the isolated
[LangGraph OTLP capture spike](spikes/langgraph-otel/README.md), including five
sanitized SDK captures and their observed attribute mapping. Production trace
ingestion is a later workstream and is not implemented here.

Personal metric tokens provide optional run ownership via `X-RMA-Trace-Token`: a valid token maps traces to the user UUID; missing or invalid tokens leave ownership unknown without blocking ingestion. The platform ingestion endpoint is still pending.
