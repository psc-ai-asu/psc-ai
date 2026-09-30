# /cso security audit — psc-ai (platform + landing)

**Status: PARTIAL.** Scope: default (`/cso`, phases 0–14) run manually against commit `44b3790` on branch `claude/kind-einstein-i66txd`, plus live reproduction against the platform app running locally on port 3001.

**Material gaps**
- The gstack `cso` helper (`~/.claude/skills/gstack/bin/gstack-cso-launcher`) is not installed in this environment, so no helper-persisted run ID, sanitized snapshot, `RunReportV3` record, or repair bundles exist. Everything below is static assessment plus locally reproduced behaviour; no `runtime_tested` bundles were produced. **PERSISTENCE: none (helper absent).**
- The Supabase database schema, Row Level Security policies, column grants, constraints, and Auth settings live in the hosted project and are not in the repository. Findings that depend on them are labelled **DB-dependent**.
- Live reproduction used a local stand-in for the Supabase HTTP API (`supabase-stub.mjs`) that logs every request the app makes. It proves what the app sends and renders; it does not prove what the production database accepts.
- No scanners (Gitleaks, OSV-Scanner, Semgrep, zizmor, Trivy, Schemathesis) were run through the helper. `npm audit` (npm 11, advisory DB as of 2026-09-18) was used for dependency evidence. No CI workflows exist in the repo (`.github/` absent), so Phase 4 has nothing to assess.
- The landing app was reviewed statically only (its server action needs real reCAPTCHA and Supabase secrets to run).

## Application model (Phase 0/1)

| Item | Detail |
|---|---|
| Stack | Turborepo; two Next.js 16.2.0 App Router apps (`apps/landing`, `apps/platform`), React 19, Supabase JS 2.99.3, Tailwind 4. Deployed on Railway. |
| Actors | anonymous visitor; authenticated reviewer; agent builder (profile with registered agents); operator (Supabase dashboard). |
| Assets | `profiles` (id, username, email), `agents`, `reviews`, `metrics`; landing `emails` list; Supabase anon key (public by design), landing service-role key (server only). |
| Entry points (platform) | `/` (sign-up / sign-in modals, browser → Supabase Auth), `/builders` (browser → `profiles`), `/builders/[username]` (server component → `profiles` with nested agents/reviews, anon key), `/review?agent=` (browser → `reviews` insert), `/developer` (static placeholder data). No API routes, middleware, or server actions in the platform app. |
| Entry points (landing) | `submitEmailAction` server action → Google siteverify → `landing.emails` insert (service-role key if set). |
| Trust boundary | The only enforcement point between the browser and the data is the Supabase project (RLS, grants, Auth config). The Next.js layer performs no authorization anywhere. |

## SECURITY FINDINGS

| ID | Severity | Confidence | Evidence | Location | Impact |
|---|---|---|---|---|---|
| CSO-1 | High | High — reproduced locally; independent reviewer concurred | reproduced (local stand-in) | `apps/platform/app/page.js:174-178`, `app/builders/page.js:14-16`, `app/builders/[username]/page.js:8-18` | Any visitor can obtain every builder's email address; username→email oracle for arbitrary usernames. |
| CSO-2 | High | High — reproduced locally; independent reviewer concurred | reproduced (local stand-in) | `apps/platform/app/page.js:34,54,132-138,420` | CAPTCHA on sign-up is decorative; unlimited automated account creation and confirmation-mail sending. |
| CSO-3 | Medium | Medium — client path reproduced; DB enforcement unknown | supported at client boundary; **DB-dependent** | `apps/platform/app/review/page.js:20,43-59` | Reviews with attacker-chosen `agent_id`, `review_by`, and scores if the DB does not enforce them. |
| CSO-4 | Medium | High for the app-side gap (reproduced; reviewer concurred), medium end-to-end | **DB-dependent** | `apps/platform/app/page.js:145-150,174-178`, `app/builders/[username]/page.js:8-16` | Registering an existing username breaks that user's username sign-in and 404s their public profile page. |
| CSO-5 | High | High for affected-version evidence; reachability partly confirmed | supported (advisory + version) | `package-lock.json` (`next@16.2.0`) | 25 published Next.js advisories, including RSC denial-of-service that applies to the app's server component route. Fix: `next@16.3.5`. |
| CSO-6 | Low | High | supported | `apps/landing/app/actions.js:11-24,32-37` | Server action stores unvalidated `email`/`role` strings with the service-role key; captcha token is string-interpolated into the form body. |

**No supported findings** for: injection (all user text goes through JSX escaping; PostgREST filters are parameter-encoded and odd usernames were rejected with 404), SSRF via the image optimizer (remote and local SVG requests both returned 400 in the default configuration), committed secrets (none in any commit; `.env*` ignored), CI/CD (no workflows), repository-local skills (none).

---

### CSO-1 — Builder email addresses are disclosed to anonymous visitors

**Attacker:** any unauthenticated visitor. **Boundary:** confidentiality of `profiles.email` versus other users.

**Paths (three, all reproduced on the local app):**
1. Username sign-in resolves a username to an email *in the browser, before authentication*. Typing `alice` in the sign-in modal produced `GET /rest/v1/profiles?select=email&username=eq.alice` with the anon key, and the response carried `alice@example.com`. An unknown username gives a distinct UI message ("Username not found"), so the same call is also an enumeration oracle.
2. `/builders` fetches `profiles` with `select=*` from the browser. The email column is delivered to every visitor's JavaScript (it is simply not rendered).
3. `/builders/alice` is a server component that selects `*` and passes the whole row as a prop to a client component. `curl http://localhost:3001/builders/alice` returned the HTML with `alice@example.com` embedded in the React flight payload. No devtools needed; it is in view-source.

**Controls challenged.** RLS is row-level and cannot hide a column. Column-level grants could block paths 2 and 3, but path 1 *requires* anonymous `SELECT(email)` on `profiles` for the shipped username sign-in to work at all, so the app's own working feature is evidence the grant exists. The server-side query uses the same anon key (no cookie session, no service role), so it has no privilege the attacker lacks.

**Counterevidence / assumptions.** The production database was not read. If a masking view or an RPC-based sign-in existed, the code would not query `profiles.email` directly.

**Repair.**
- Enumerate columns in both builders queries (`id, username, created_at, ...`) instead of `*`.
- Move username→email resolution server-side: a `SECURITY DEFINER` Postgres function that performs the lookup, or drop username login and accept email only.
- Then `REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;`.
- Do not pass full rows into client components; pass only the fields rendered.

### CSO-2 — Sign-up CAPTCHA is client-side only and uses Google's public test key

**Attacker:** any bot. **Boundary:** bot protection on account creation.

**Evidence (reproduced).** The submit button is disabled until the browser callback `window.onRecaptchaSuccess` fires. Calling that function from the console enabled the button, and the resulting `POST /auth/v1/signup` body contained only `email`, `password`, and `data`; no `captchaToken` was sent. There is no server-side verification anywhere in the platform app (no route handlers, middleware, or server actions). The site key at `page.js:34` is Google's documented test key, which always passes, so even wiring up server verification with that key would be a no-op. A bot can skip the page entirely and call the Supabase Auth endpoint with the public anon key.

**Impact.** Unlimited account creation; mail-bombing arbitrary addresses via confirmation emails; spam profiles that can then post reviews (CSO-3). Supabase's built-in Auth rate limits throttle but do not prevent this.

**Repair.** Enable CAPTCHA in Supabase Auth (hCaptcha or Turnstile), render that widget, and pass `options: { captchaToken }` to `supabase.auth.signUp` (and to `signInWithPassword`). Remove the test site key.

### CSO-3 — Review inserts are fully client-controlled (DB-dependent)

**Evidence (reproduced).** Signed in as `alice`, visiting `/review?agent=agt-DOES-NOT-EXIST` and completing the form produced:

```
POST /rest/v1/reviews
{"agent_id":"agt-DOES-NOT-EXIST","task":"task text","overall_score":5,"goal_completion":5,
 "helpfulness":5,"coherence":5,"factuality":5,"safety":5,"review_note":"note text","review_by":"u-1"}
```

`agent_id` comes from the URL, `review_by` and every score from the client, and `overall_score` is computed in the browser. Any authenticated user can issue this insert from the console with arbitrary values.

**For the invariant to hold the database must enforce all of:** an INSERT policy `WITH CHECK (review_by = auth.uid())`; a foreign key `agent_id → agents(id)`; `CHECK` constraints keeping the five sub-scores in 1..5; `overall_score` as a generated column or trigger; and whatever one-review-per-user-per-agent rule is intended. None of that is visible in the repo. If absent, the impact is forged reviews under another user's id, reviews on non-existent agents, and out-of-range scores poisoning any ranking.

**Repair.** Add the policy, FK, CHECKs and generated column above; verify by dumping `reviews` policies and constraints from the project. Also surface insert errors in the UI instead of `console.log`.

### CSO-4 — Duplicate usernames lock the original user out of username sign-in and their profile page (DB-dependent)

**Evidence (reproduced against the stand-in).** Sign-up performs no username uniqueness check and upserts `{id, username, email}` on conflict `id`. After registering a second account with username `alice`, the real Alice's username sign-in returned "Username not found" (the `.single()` lookup fails on two rows) and `GET /builders/alice` returned 404 (the server page calls `notFound()` on the same error). The directory page still links to `/builders/alice`, so the link is dead.

**Depends on:** absence of a UNIQUE constraint (or case-insensitive unique index) on `profiles.username`. If the constraint exists, the second upsert fails and sign-up silently continues, leaving an auth user with no profile row, so username sign-in never works for that user. That silence is a code defect, not a DB one: the Supabase client returns errors rather than throwing, so the `try/catch` around the upsert never catches anything and the returned `error` is never read.

**Variant (hypothesis, DB-dependent):** the upsert runs immediately after `signUp`. When email confirmation is enabled there is no session yet, so the write goes out under the anon key and can only succeed if `profiles` accepts anonymous writes. If it does, the same anon key can be pointed at PostgREST directly with an arbitrary `id` to overwrite any profile's `username` and `email`, which redirects that user's username sign-in to an attacker mailbox. Independent reviewer concurred on the lockout path (high confidence for the app-side gap, medium for end-to-end impact) and raised this variant.

**Also noted:** sign-up does not trim or restrict the username while sign-in does, and the directory link does not URL-encode the segment, so usernames containing `/`, `?`, `#`, or `%` produce broken or misdirected links (self-affecting only).

**Repair.** `CREATE UNIQUE INDEX ON profiles (lower(btrim(username)));` RLS `WITH CHECK (id = auth.uid())` on insert and update; create the profile row from a `SECURITY DEFINER` trigger on `auth.users` instead of from the browser; validate usernames against something like `^[A-Za-z0-9_-]{3,30}$` and normalize before insert and lookup; read the upsert's returned `error`; use `.maybeSingle()` or `.limit(1)` where `.single()` is used so duplicates degrade instead of failing; `encodeURIComponent` the path segment in the directory link.

### CSO-5 — Next.js 16.2.0 carries 25 published advisories; fix available (16.3.5)

`npm audit` lists two critical (unauthenticated RCE on Windows hosts, GHSA-p293-qw3h-jr36; AVIF image-optimizer RCE, GHSA-2xp9-vwfh-vxw4), and many high advisories. Reachability in this app:
- **Reachable:** RSC denial-of-service advisories (GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj) — `/builders/[username]` is a server component; RSC cache-poisoning variants (GHSA-wfc6-r584-vfw7). Server-action DoS (GHSA-m99w-x7hq-7vfj) applies to the landing app's `submitEmailAction`.
- **Not reachable as configured:** middleware/proxy bypasses (no middleware); image-optimizer issues (the live app returned 400 for remote URLs and for local SVGs; no `next/image` usage, no uploads, no AVIF files) — reachability would change the moment `images.remotePatterns` is configured; Windows RCE (Linux hosting on Railway).
- Also outdated with fixes: `postcss`, `sharp`, `ws`, `js-yaml`, `brace-expansion`, `picomatch`, `browserslist`, `nanoid`, `turbo` (build-time exposure only for most).

**Repair.** `npm install next@16.3.5` in both apps (same major, `fixAvailable` reports no breaking change), then `npm audit fix` for the rest and re-run the build.

### CSO-6 — Landing server action trusts client strings and interpolates the captcha token

`submitEmailAction` inserts `email` and `role` with the service-role key after checking only that `email` and the token are non-empty; the format check lives in the browser. The reCAPTCHA request body is built as `secret=...&response=${captchaToken}` without URL-encoding, so a client can append extra form fields (for example `remoteip`). No exploit beyond junk rows and a bypassed client-side validation was identified; Google verifies the token itself. **Repair:** validate email format and restrict `role` to the known enum on the server; build the body with `URLSearchParams`.

## Coverage record

| Phase | Scope | Result |
|---|---|---|
| 2 Secrets | full history, all branches | No credentials found; `.env*` never committed; only package-lock integrity hashes matched broad patterns. |
| 3 Supply chain | `npm audit` on root lockfile | CSO-5. `@supabase/supabase-js` is used by the platform app but not declared in its `package.json` (hoisting dependency; hygiene). |
| 4 CI/CD | — | No workflows present. |
| 5 Infra | Railway config not in repo | Not assessed. |
| 6 APIs/integrations | Supabase REST/Auth, reCAPTCHA | CSO-1, 2, 3, 6. |
| 7 LLM/agentic | — | No LLM, tool, or MCP code in the repo. |
| 8 Skills | — | No repo-local skills or hooks. |
| 9 OWASP 2025 | A01 (CSO-1, 3), A02 (test captcha key), A03 (CSO-5), A06 (CSO-2, 4), A07 (CSO-2), A09 (errors only to console) | Injection (A05): no sink found; ASVS 1.2.1 and 1.2.4 held on inspection and probing. |
| 10 STRIDE | information disclosure (CSO-1), spoofing (CSO-3), DoS (CSO-4, 5) | as above |
| 11 Data | emails are the only personal data; reach anonymous clients (CSO-1) | as above |
| 12 Challenge | Three independent read-only reviewers, no producer conclusions shared | CSO-1 and CSO-2 confirmed; CSO-3 rated conditional on DB; CSO-4 confirmed for the app-side gap, end-to-end impact DB-dependent. |

## Evidence files

Reproduction tooling is in `evidence/` next to this report:

- `evidence/supabase-stub.mjs` — local stand-in for the Supabase Auth and REST API that logs every request to a JSONL file (`STUB_LOG`). Seeds one user `alice@example.com` / `Alice1234!` with one agent.
- `evidence/repro.mjs` — Playwright script that drives flows 1–5 above against the app on port 3001 and prints the requests the browser made.

To re-run: start the stub (`STUB_LOG=/tmp/stub.jsonl node evidence/supabase-stub.mjs`), create `apps/platform/.env.local` with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` and any value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, run `npx turbo dev --filter=@psc-ai/platform`, then `STUB_LOG=/tmp/stub.jsonl node evidence/repro.mjs` with `playwright-core` installed and the Chromium `executablePath` adjusted for your machine.

This audit changed no application code.
