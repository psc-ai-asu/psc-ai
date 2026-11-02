# Personal trace tokens: local setup and handoff

Implemented scope: the isolated LangGraph capture spike and reviewer-owned personal trace tokens. A token identifies the signed-in reviewer who will send telemetry; it is not a developer-scoped key and has no agent ownership requirement. Existing review submission and agent authentication paths are unchanged.

## Ownership contract

The personal metric/trace token has one purpose: identify which user owns an agent run. This is analogous to a review's `reviewed_by` UUID. Send the token with trace exports in the **`X-RMA-Trace-Token`** header. It is optional attribution, not ingestion authentication, an agent credential, an access grant, or proof that a run is genuine.

| Header | Run ownership |
| --- | --- |
| Active personal token | UUID from `trace_tokens.user_id` |
| Missing, malformed, unknown, or revoked token | `null` (unknown owner); continue normal trace ingestion |

For an OTLP exporter, configure `OTEL_EXPORTER_OTLP_TRACES_HEADERS="X-RMA-Trace-Token=<your-personal-token>"`. Omit the header to send traces without identifying a user. Never put the secret or a claimed user UUID in span attributes. The server must derive ownership from the token hash. Sending traces does not create a review or set a review's `reviewed_by`; review linking is separate.

`apps/platform/lib/trace-tokens/attribution.mjs` implements this resolution contract for a future ingestion handler using a server-only privileged database client. It returns the owner UUID or `null`, never the token, hash, or token metadata. It ignores cookies and Authorization. Lookup outages produce a safe operational error rather than falsely identifying a valid user's traces as anonymous. No platform ingestion route or run persistence exists yet; when added, it must accept otherwise valid traces with a nullable owner, without a token-based 401/403. Attribution must not grant access to other users' traces. Revocation affects future attribution, not existing run ownership. Do not let anonymous batches overwrite an existing run's owner; deduplication/conflicting ownership policy belongs to ingestion.

## Migration and app setup

The migration is `apps/platform/supabase/migrations/20261023000000_personal_trace_tokens.sql`, following the repository's ordered SQL migration convention. It creates only `trace_tokens`, its policies/index, and a revocation trigger. It does not create session/trace/span tables or alter reviews.

Use a **local** Supabase stack as described in `docs/contributing/local-setup.mdx`. No production migration has been applied. With Docker and Supabase CLI installed, from `apps/platform`:

```bash
supabase start
# Existing local stack: apply pending migrations while retaining local data.
supabase migration up --local
cp .env.example .env.local
# Set local URL/anon key from supabase status; never use production credentials.
```

On a disposable local stack, `supabase db reset` runs every migration and seed; it erases that local database, so preserve any local data first. Do not run a linked/production reset or push. Initial checks used embedded PostgreSQL. The local stack has since been installed and started with Docker Desktop 4.96.3 and the checksum-verified official Supabase CLI 2.121.0 binary. A fresh `supabase start` successfully applied all three migrations and the repository seed data. No reset of existing data or production migration was performed.

From the repository root:

```bash
npm ci
npm run dev --workspace=@psc-ai/platform
```

Sign in with a local reviewer account and open **Personal traces & tokens** from the agent directory or the review dashboard’s sidebar. Token management now lives at `/review/trace-tokens`, independently of any agent. The old `/developer/trace-tokens?agent=<id>` route redirects there. The agent-detail Edit/Delete controls no longer contain a token-management button. Tokens remain reviewer-owned and reusable across agents.

The page includes a saved-runs empty state and the existing create/list/revoke token controls. Leaving the token page clears any displayed one-time secret. Create a named token, copy it in the one-time dialog, close it, refresh, and revoke it. A second reviewer must see only their own tokens. Trace uploads and `last_used_at` updates remain pending.

Review forms now show an optional **Attach run metrics** section with a labeled saved-run selector. It is disabled with “No saved runs available yet” because no platform run storage or attachment persistence exists. It does not count toward required answers or prevent review submission. Token management opens in a new tab to preserve the unfinished review. No mock runs, fake metrics, or unverifiable attachments are offered.

### Future saved-run integration

Replace the empty state only when run ingestion and review linking are ready. List only runs owned by the authenticated reviewer for the reviewed agent, including historical runs whose token has since been revoked. Return safe run IDs, labels, timestamps, and metric summaries; never token secrets or hashes. Wire `RunMetricsAttachment.js` to that owner-scoped list, a controlled selection, and a metric preview with missing values shown as unavailable. Submit the selected ID through a server action or database function that checks reviewer and agent ownership and persists the review and attachment atomically. Keep unlinked reviews working and derive verification status separately on the server. Do not enable selectable options before persistence is wired.

## Security and disclosure behavior

- Node `crypto.randomBytes(32)` supplies 256 random bits; URL-safe tokens start `rma_trace_`. Only SHA-256 and an 18-character display prefix are stored.
- The create action returns plaintext once after a successful insert. No retrieve action exists. Plaintext lives only in the modal's React state, is removed on close/Escape, and is never placed in a URL, local/session storage, logs or database. A lost create response cannot be recovered; revoke that prefix and create another token.
- Every create/list/revoke action revalidates the cookie session with `auth.getUser()`. Owner IDs come from authentication, never caller input. List/revoke include explicit user filters and the database enforces RLS independently.
- Safe metadata projections and response shaping exclude hashes. Column grants also deny browser roles SELECT on `token_hash` (including `select *`). The migration explicitly revokes the baseline's broad default grants.
- Authenticated users may insert only credential fields for their own account; they may update only `revoked_at`. A trigger stamps server time and preserves prior revocation, preventing future-dated revocation or reactivation. Anonymous reads/writes, deletion, owner/name/hash/last-use mutation are denied. The service role keeps privileged access for future ingestion; no service key is used by this implementation.
- These credentials do not establish trust that a model run was genuine; production ingestion and run persistence are later workstreams; personal tokens only supply optional ownership attribution.

## Checks

From the repository root:

```bash
node --test apps/platform/tests/trace-tokens.test.mjs apps/platform/tests/trace-attribution.test.mjs
# Install this test-only dependency outside the application dependency tree:
npm install --prefix /tmp/rma-token-db-tests --package-lock=false --ignore-scripts @electric-sql/pglite@0.3.14
PGLITE_MODULE_PATH=/tmp/rma-token-db-tests/node_modules/@electric-sql/pglite/dist/index.js \
  node --test apps/platform/tests/trace-tokens-db.test.mjs
# Follow spikes/langgraph-otel/README.md to create the pinned Python environment.
spikes/langgraph-otel/.venv/bin/python -m unittest discover -s spikes/langgraph-otel -p 'test_*.py' -v
npm run lint
npm run build --workspace=@psc-ai/platform
```

The dependency-free Node suite covers create/list/revoke, auth and input failures, cross-user filters, random secrets and SHA-256 storage, one-time disclosure through safe return shapes, and sanitized database errors. The embedded PostgreSQL suite executes the actual migration and checks RLS, owner insert/revoke, cross-user access, column privileges, anonymous denial and monotonic server-stamped revocation. It uses no external DB or credentials. The fixture suite decodes all five real sanitized HTTP exports. See `spikes/langgraph-otel/README.md` for the observed attribute map and evidence limitations.

Local integration now verified: password sign-in for seeded `dev2@example.com` and `dev3@example.com`; browser sign-in works; the agent-detail button opens a dedicated token page that loads the signed-in reviewer’s tokens; the Next server action refreshes the token list; actual PostgREST create/list/revoke enforces ownership, denies hash reads, and returns the secret only on creation. The test token was revoked and its status/timestamps were confirmed in the browser. Still unverified: browser create-dialog clipboard/close/Escape/focus behavior, session expiry/refresh, and two simultaneous browser accounts. No real provider-backed LLM or production ingestion was verified.

## Changed files

- `apps/platform/supabase/migrations/20261023000000_personal_trace_tokens.sql`: table, policies, column grants, revocation trigger.
- `apps/platform/lib/trace-tokens/service.mjs`: secure credential operations.
- `apps/platform/app/review/trace-tokens/{page.js,actions.js,TraceTokens.js,tokens.module.css}`: authenticated token page, server actions, token management and copy-once modal.
- `apps/platform/components/AgentDetail.js`: agent edit/delete controls; token management moved to the review area.
- `apps/platform/tests/trace-tokens*.test.mjs`: behavior and PostgreSQL checks.
- `spikes/langgraph-otel/{agent.py,capture.py,test_fixtures.py,requirements.txt,README.md,.gitignore,fixtures/*.json}`: isolated spike and five sanitized real exports.
- Root/platform READMEs and this guide: setup and handoff.
- `AGENTS.md`: automatically generated by the installed Turborepo during the lint command; its repository guidance was read and retained.

Preserved: the two pre-existing untracked `docs/agent-metrics-implementation-guide.md` and `docs/agent-trace-capture-research.md` files. No commits, pushes, merge, deployment, production migration, ingestion endpoint, review badges/attachments, metric dashboards, translation layer, session database or email delivery are part of this change.

## Recorded validation results

- Dependency-free token behavior suite: **5/5 passed**.
- Embedded PostgreSQL migration/security suite: **1/1 passed**; actual migration applied only to an in-memory test database.
- Python fixture suite: **passed across all five fixture files** (7 captured HTTP requests, 51 spans total).
- Pinned Python dependency consistency: `pip check` passed.
- Repository lint: passed for both apps; one existing warning in `apps/platform/app/review/AgentReviewForm.js:104` about internal navigation via `window.location.href`.
- Platform production build: the dedicated token-page version passed with `npm run build --workspace=@psc-ai/platform -- --webpack` using the lockfile’s Next.js 16.3.8. Turbopack stalled and was stopped before the alternate build; no build configuration was changed. Token management is now at `/review/trace-tokens` (the former developer URL redirects); no `/account` route is added. Network permission was needed for the existing Google Font imports.
- `git diff --check`: passed.

Branch: `metrics-integ`, based on fast-forward-updated local `develop` at `5390639aedb1026d600e37aad6882c9c259dd769`. Origin's configured fetch refspec covered only main; develop was fetched explicitly and pulled with `--ff-only origin develop`. Existing untracked research documents were retained throughout. The plain `develop` tracking setup could not be inferred under that narrow refspec, so the pull used an explicit remote and branch.

## Running local services

Docker Desktop and the local Supabase containers are running. The platform dev server is at `http://localhost:3001`; its ignored `apps/platform/.env.local` contains only local Supabase configuration and public anon/test captcha values. The seeded reviewer login is `dev2@example.com` / `password123`. Studio is at `http://127.0.0.1:54323`, and local mail is at `http://127.0.0.1:54324`.

To resume after a reboot, start Docker Desktop, run `supabase start` from `apps/platform`, then run `npm run dev --workspace=@psc-ai/platform` from the root. Homebrew's Supabase formula required a newer Xcode; the official prebuilt ARM64 CLI was installed instead after checking its published SHA-256. No Xcode change was made.

## Ownership update validation

The attribution suite checks optional headers, hashed lookup, UUID resolution, unknown/revoked tokens, and safe lookup errors. The live Python capture test emits a real local graph run twice: once with the dedicated dummy attribution header and once without it. Both exports reach the receiver and contain the expected nine spans; no secret header value is persisted. The original five fixtures remain historical captures using the old dummy Authorization header. These local tests do not establish production ingestion support.

Validated for the ownership update: Node **9/9 passed**; Python **2/2 passed** (historical fixture checks plus live exports with/without attribution, nine spans each); targeted ESLint passed. Tests used a temporary pinned Python environment under `/tmp/psc-attribution-tests`. No database migration or production endpoint was applied.


## Review-area UI update

Moved token management and its server actions into `app/review/trace-tokens`. Added entry points to the directory and review dashboard sidebar, and an optional saved-run attachment placeholder to the review form. Run capture, metric aggregation, run listing, and attachment persistence remain future work. Historical validation results above describe the earlier token implementation; this UI update is validated separately.

Validation for the review-area update: platform webpack production build passed, targeted ESLint passed with the existing review-navigation warning, token/attribution tests passed **9/9**, and `git diff --check` passed. Browser/database smoke testing was not performed: the local platform and Supabase services were not listening during this update. No migration was applied.
