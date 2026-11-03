# Personal trace tokens

Signed-in users can create, list, and revoke their own tokens at
`/review/trace-tokens`, linked from the agent directory and review dashboard.
Tokens work across agents. The former `/developer/trace-tokens` URL redirects here.

## Local setup

Start Docker Desktop. From `apps/platform`, start the local Supabase stack and
apply pending migrations without resetting existing data:

```bash
supabase start
supabase migration up --local
```

Configure `.env.local` using `.env.example` and your local Supabase URL and anon
key. From the repository root:

```bash
npm ci
npm run dev --workspace=@psc-ai/platform
```

The migration `20261023000000_personal_trace_tokens.sql` creates `trace_tokens`,
its owner policies, column grants, index, and revocation trigger. It does not
create run/span tables or change reviews. No production migration is applied by
this feature.

## Token behavior

- Each token belongs to the authenticated user's UUID; a user may create several.
- Tokens contain 256 random bits. The full secret is returned once after creation
  and cleared from the dialog on close. Only its SHA-256 hash and display prefix
  are stored. Copy and save the secret before closing the dialog.
- List responses contain only safe metadata. Database permissions prevent browser
  roles from reading hashes or another user's tokens.
- Create/list/revoke actions revalidate the session. Revocation is server-stamped
  and cannot be undone by browser roles.

## Ownership integration

Send the personal token in the `X-RMA-Trace-Token` HTTP header with trace exports.
For an OTLP exporter:

```bash
export OTEL_EXPORTER_OTLP_TRACES_HEADERS="X-RMA-Trace-Token=<personal-token>"
```

A future ingestion handler should call `resolveTraceUser(client, headers)` from
`apps/platform/lib/trace-tokens/attribution.mjs` with a server-only privileged
client. It returns the active token owner's UUID. Missing, malformed, unknown,
and revoked tokens return `null`; otherwise valid ingestion should continue with
unknown ownership. Lookup outages throw a safe operational error.

The token supplies optional ownership attribution, not ingestion authorization,
agent identity, access to traces, or proof that a run is genuine. Never put token
secrets in span attributes, URLs, or logs. Shared hosted execution must scope the
exported token to the correct user rather than use one global token for everyone.

## Pending run and review integration

Run ingestion, storage, metric aggregation, and review attachment persistence are
not implemented. The personal page shows a saved-runs empty state. The review form
shows an optional disabled saved-run selector, which does not affect required
answers or review submission. Token management opens in another tab to preserve
an unfinished review.

When implementing runs, persist ownership on each run as the resolved user UUID.
Revoking a token should not remove earlier run ownership. List only the signed-in
user's runs, filtering by the reviewed agent in the review form. Return safe run
IDs, labels, timestamps, and metric summaries. Validate reviewer/agent ownership
and save the review and selected run relationship atomically on the server before
enabling the selector. Derive verification status separately on the server.

## Checks

```bash
node --test apps/platform/tests/trace-tokens.test.mjs apps/platform/tests/trace-attribution.test.mjs
npm run lint --workspace=@psc-ai/platform
npm run build --workspace=@psc-ai/platform -- --webpack
```

The optional database test executes the migration in embedded PostgreSQL:

```bash
npm install --prefix /tmp/rma-token-db-tests --package-lock=false --ignore-scripts @electric-sql/pglite@0.3.14
PGLITE_MODULE_PATH=/tmp/rma-token-db-tests/node_modules/@electric-sql/pglite/dist/index.js \
  node --test apps/platform/tests/trace-tokens-db.test.mjs
```
