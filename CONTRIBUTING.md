# Contributing to PSC-AI

Thanks for your interest in contributing!

## Getting started

Everything you need to set up and develop locally is in the **[Contributing docs](https://docs.reviewmyagent.today/contributing/quickstart)**:

1. [Quickstart](https://docs.reviewmyagent.today/contributing/quickstart) — clone and install
2. [Local Setup](https://docs.reviewmyagent.today/contributing/local-setup) — run the platform against a local database
3. [Safety Rules](https://docs.reviewmyagent.today/contributing/safety-rules) — read these before touching anything database-related

## Pull requests

- Branch off `develop` and open your PR into `develop`.
- If you change the database schema, commit the migration with the code that uses it. See [Database Changes](https://docs.reviewmyagent.today/contributing/database-changes).

## Updating the docs

The docs site is built with [Mintlify](https://mintlify.com) from the [`docs/`](docs/) folder, and deploys from `main`. To preview your changes:

```bash
cd docs
npx mint dev --port 3333
```

Add new pages to the navigation in `docs/docs.json`.
