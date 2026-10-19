# Sentinel

Attack reconstruction platform: correlates independent application-layer and cloud-layer telemetry into evidence-graded incident narratives. Full spec: `Sentinel_Full_Product_Development_Plan.docx`.

---

## The Story Behind Sentinel

### The Problem: The Visibility & Correlation Chasm
Modern security incidents rarely stay confined to a single layer. An attacker might exploit an application vulnerability, escalate privileges via an authentication token, pivot to a cloud environment (e.g., generating rogue GCP service account keys), and exfiltrate data from cloud storage.

Today, defending against these multi-stage attacks is painful and fragmented:
- **Siloed Telemetry**: Application logs (APMs, web servers), identity providers, and cloud audit logs (GCP Cloud Audit Logs, AWS CloudTrail) live in separate systems with incompatible schemas.
- **Manual, Slow Triage**: Incident responders must manually cross-reference timestamps, IP addresses, trace IDs, and user identities across disparate consoles to piece together what happened.
- **Assumptions vs. Evidence**: Heuristics and automated tools often hallucinate or guess attack paths without providing audit-grade proof, leaving security teams uncertain about the true blast radius.

### The Solution: Evidence-Graded Attack Reconstruction
**Sentinel** solves this by establishing a unified, automated attack reconstruction pipeline. It ingests independent, heterogeneous telemetry from both the application tier (via native SDKs) and cloud providers (via cloud connectors), standardizes them into canonical event envelopes, and automatically pieces together the full incident lifecycle.

---

## Core Pillars & Philosophy

1. **Evidence-Graded Narratives (No Guesswork)**
   Every reconstructed step and event in Sentinel is tagged with an explicit certainty tier:
   - `confirmed`: Supported by hard cryptographic, audit-log, or deterministic trace evidence.
   - `suspected`: High contextual correlation without direct causal proof.
   - `not_detected`: Actively probed or queried, with no corresponding telemetry found.
   - `unknown`: Visibility gaps where telemetry was unavailable or unmonitored.

2. **Deterministic & Pivot-Based Correlation**
   Relationships between events are formed strictly through verifiable links:
   - `shared_trace`: Direct distributed tracing propagation.
   - `shared_actor`: Identity, service account, or token continuity.
   - `shared_resource`: Target infrastructure, database, or API endpoint overlap.
   - `time_window`: Constrained temporal proximity across coordinated actions.

3. **End-to-End Reconstruction Pipeline**
   Telemetry flows through a modular, decoupled event processing architecture:
   ```
   [ Application Sensor (@sentinel/sdk-node) ]    [ Cloud Connector (connectors/gcp) ]
                           │                                      │
                           └──────────────────┬───────────────────┘
                                              ▼
                                   [ apps/ingestion ]
                              (Fastify / Validation / Auth)
                                              │
                                              ▼
                                      [ Pub/Sub Queue ]
                                              │
                                              ▼
                                    [ apps/workers ]
                                              │
                               ┌──────────────┼──────────────┐
                               ▼              ▼              ▼
                          [ Detection ] [ Correlation ] [ Attack Graph ]
                            Engine         Engine          Engine
                               └──────────────┬──────────────┘
                                              ▼
                                       [ packages/db ]
                                    (PostgreSQL + Prisma)
                                              │
                               ┌──────────────┴──────────────┐
                               ▼                             ▼
                        [ apps/api ]                 [ apps/dashboard ]
                        (REST API)                  (Event Explorer UI)
   ```

---

## Status: Phase 0 (Foundation), Phase 1 (Event Pipeline), and Phase 2 (SDK) complete

### Built and compiling clean (strict TypeScript, yarn workspaces)

- **`packages/event-schema`** — canonical `SentinelEvent` type, evidence-tier enum (`confirmed` / `suspected` / `not_detected` / `unknown`)
- **`packages/shared`** — ID generation, structured JSON logger
- **`packages/auth`** — API-key hashing + timing-safe verification
- **`packages/sdk-node`** — full application-side sensor: `expressMiddleware()` and `fastifyPlugin()` for HTTP instrumentation, `.authenticationEvent()`, `.authorization()`, `.securityEvent()` for manual capture, timer + size-triggered batching, retry delivery with exponential backoff (network/5xx retryable, 4xx fails fast), client-side redaction at enqueue time (defense-in-depth alongside server-side redaction)
- **`connectors/gcp`** — cloud-side sensor stub (audit log / IAM / API-key listeners); no real GCP API calls wired yet
- **`packages/db`** — Prisma/Postgres (Supabase) persistence: organizations, hashed API keys, events (idempotent on duplicate id), detections (via `DetectionEvent` join table for multi-event support), incidents, paginated `listEvents` query
- **`apps/ingestion`** — Fastify service: validate → authenticate → cross-check organization → persist (idempotently) → publish to queue (`POST /v1/events`); auth is real, DB-backed API-key lookup, cross-checked against the authenticated key's actual organization (never trusts client-supplied org ID)
- **`packages/detection-engine`** — deterministic rule matching only (one example rule: unexpected API key creation); baseline and sequence detection not implemented, need historical data first
- **`packages/correlation-engine`** — links detections via `shared_trace`, `shared_actor`, `shared_resource`, and `time_window` (5-minute placeholder window); evidence-driven only, never assumed
- **`packages/attack-graph`** — builds detection/actor/resource nodes with evidence-labeled edges from correlated incidents
- **`packages/redaction`** — recursive key-pattern redaction applied to event payloads before persistence
- **`apps/workers`** — real Pub/Sub subscriber (Google's local emulator for dev); runs redact → detect → correlate → attack-graph pipeline per message, acks only after successful persistence, nacks (triggering redelivery) on failure; guards against mixed-organization batches
- **`apps/api`** — Fastify service: `GET /v1/events`, paginated and scoped to the authenticated key's organization; CORS is permissive in dev, strict (requires `ALLOWED_ORIGINS`) in production, refuses to start without it
- **`apps/dashboard`** — Next.js Event Explorer page; fetches server-side (React Server Component) so the API key never reaches the browser, sidestepping CORS entirely for this page; visually minimal by design — the doc's real "Dashboard UX" spec (section 32: severity, incidents, risky identities) is a later phase, this is just the Phase 1 raw-event browser
- **Queue** — real Google Cloud Pub/Sub client, running against the local emulator for dev; verified end-to-end (publish → subscribe → ack) against live Supabase data, including the multi-event join table
- **Docker** — `infra/docker` Dockerfiles for `ingestion` and `workers`, built and verified working against live Supabase
- **CI** — `.github/workflows/ci.yml` written and verified passing every check locally (lint, typecheck, test); blocked from actually running by a GitHub account billing lock, unrelated to the project (see gaps below)
- **`examples/express-demo`, `examples/fastify-demo`** — real consuming apps used to verify the SDK against actual HTTP traffic end-to-end (not just synthetic test payloads), confirmed working through to the dashboard

### Scaffolded, empty

- `infra/terraform` — Cloud Run, Pub/Sub, Secret Manager resources defined, deliberately **unapplied** (no personal GCP project — the available GCP project belongs to an employer and won't be used for this)
- `tests/unit`, `tests/integration`, `tests/e2e`, `tests/security`, `tests/fixtures` — no tests written yet; `yarn test` passes via `--passWithNoTests`, which is honest but not the same as coverage

## Known gaps / next up

- **CI workflow** — written and correct, verified passing locally, but blocked from running by a GitHub account-level "payment authorization failed" lock (known, widely-reported GitHub Free-tier issue, unrelated to this project). Support ticket filed, pending resolution.
- **Phase 3 (GCP connector)** — unblocked via a workaround, not a fix. The personal-billing route failed with error `OR_BACR2_59` ("Billing setup can't be completed"), a known, unresolved Google-side bug affecting multiple unrelated developers (different countries, different payment methods). Decision: use a **brand-new, empty throwaway GCP project (`testbox-3cc16`, Blaze plan) created by the CTO at MyCyberClinics** on their billing account, with this account added as a member, instead of waiting on Google or switching clouds. The first project offered (`rootedwebsite`) was a live production Firebase backend with real traffic and was declined: testing detection there would mix deliberate test events into real production noise and put a live system at risk. Billing stays the CTO's responsibility, so a budget alert on that project is a standing requirement. `connectors/gcp` is still stubbed until the connector work in Phase 3 begins. Deliberately **not** switching cloud providers to route around the billing bug: the doc's MVP scope (section 35: "Do not support AWS, Azure, and GCP simultaneously") and the project's origin story (the real MyCyberClinics incident was GCP-specific) both argue for staying on GCP.
- **Real GCP infra** — Terraform defined but unapplied; Pub/Sub is currently only the local emulator, not real Cloud Pub/Sub; `connectors/gcp` listeners are stubs with no real API calls
- **No automated tests** — zero test files exist; everything verified so far has been manual, step-by-step end-to-end testing
- **`packages/detection-engine`** — only one deterministic rule exists; baseline anomaly detection and sequence detection are unimplemented, need real historical data first
- **Correlation time window** — 5-minute constant in `correlation-engine` is a placeholder, needs tuning against real incident data
- **Dashboard styling** — intentionally plain; real visual design work belongs to the later "Dashboard UX" phase (doc section 32) when the full incident dashboard (not just raw events) gets built
- **Pub/Sub emulator state is ephemeral** — restarting Docker wipes topics/subscriptions; must be recreated after every restart (see Dev setup below)

## Dev setup

```powershell
corepack enable
yarn install
yarn workspace @sentinel/<package-name> run build
```

Node >= 20, Yarn 4.5.0 (pinned via `packageManager`). Uses the `node-modules` linker (see `.yarnrc.yml`), not PnP — PnP broke TypeScript's `types` resolution for `@types/node`.

### Environment files

Root `.env` (copy from `.env.example`) needs: `DATABASE_URL` (Supabase transaction pooler, port 6543, `?pgbouncer=true`), `DIRECT_URL` (Supabase **session** pooler, port 5432 — not the direct `db.*.supabase.co` host, which is IPv6-only and usually unreachable), `SENTINEL_INGESTION_API_KEY_SALT` (a real random value), `PUBSUB_EMULATOR_HOST=localhost:8085`, `GCP_PROJECT_ID=sentinel-dev`.

This `.env` must be **copied into each workspace that reads it at runtime or build time** — `packages/db`, `apps/ingestion`, `apps/workers`, `apps/api` — since Yarn workspace commands change the working directory and neither Prisma nor plain `process.env` picks up a root-level `.env` automatically. `apps/dashboard` uses its own `.env.local` (Next.js convention) with `SENTINEL_API_URL` and `SENTINEL_API_KEY`.

### Pub/Sub emulator (required for apps/ingestion and apps/workers)

```powershell
docker run -d --name sentinel-pubsub -p 8085:8085 google/cloud-sdk:latest gcloud beta emulators pubsub start --host-port=0.0.0.0:8085 --project=sentinel-dev

curl.exe -X PUT "http://localhost:8085/v1/projects/sentinel-dev/topics/sentinel-events-dev"
curl.exe -v -X PUT -H "Content-Type: application/json" --data-raw '{\"topic\": \"projects/sentinel-dev/topics/sentinel-events-dev\"}' "http://localhost:8085/v1/projects/sentinel-dev/subscriptions/sentinel-workers-dev"
```

### Generating a dev API key

```powershell
yarn workspace @sentinel/db run seed
```

Prints a new Organization id and a raw API key — **the raw key is shown once and never stored**; if lost, just run `seed` again for a fresh pair.

## Observations / gotchas encountered

- **BOM breaks JSON**: `Set-Content -Encoding utf8` in PowerShell prepends a byte-order-mark, which Node's JSON parser can't handle. Use `[System.IO.File]::WriteAllText(...)` instead (no BOM by default).
- **Yarn PnP breaks `@types/node` resolution**: TypeScript's `"types": [...]` compiler option can't resolve packages through Yarn's virtual PnP filesystem. Fixed by setting `nodeLinker: node-modules` in `.yarnrc.yml`.
- **Yarn PnP is per-package strict**: a workspace package can only resolve dependencies declared in *its own* `package.json`, not anything hoisted from the root.
- **New workspace packages need `yarn install` before `yarn workspace <name> run <script>` works** — otherwise Yarn throws `Package for ... not found in the project`.
- **`noPropertyAccessFromIndexSignature` (strict mode) requires bracket notation** on `process.env.X` and any `Record<string, unknown>` field access.
- **New `apps/*` and `packages/*` directories need an explicit `src/` subfolder** created manually — several were missed during initial scaffolding and caused `DirectoryNotFoundException` on first file write.
- **PowerShell backtick-escaping doesn't nest**: writing a literal `` `${...}` `` template-literal syntax into a `.ts` file via a double-quoted PowerShell string collapses instead of producing real backticks — use string concatenation (`+`) instead when generating files this way.
- **PowerShell double-quoted strings interpolate `$` as variables**: writing literal code containing `$` (e.g. `prisma.$disconnect()`) via a double-quoted `WriteAllText` string silently corrupts it. Escape with a backtick (`` `$ ``).
- **Supabase direct connection is IPv6-only**: `db.<ref>.supabase.co` (port 5432) isn't reachable from most IPv4-only networks. Use the **Session pooler** connection string as `DIRECT_URL` instead.
- **Prisma env files are workspace-scoped, not root-scoped**: `yarn workspace <name> run <script>` changes CWD, so a root `.env` isn't picked up automatically.
- **`yarn workspace <name> run <script>` (and even plain `yarn run` inside a workspace dir) can fail to inject `node_modules/.bin` into PATH under Docker** with Corepack-fetched Yarn 4.5.0 + `node-modules` linker on `node:20-slim` — gives `command not found: tsc` even though the binary and workspace registration are correct. Workaround: bypass Yarn's script runner in Docker builds and invoke `tsc -b` directly via its root-relative path against one leaf project (TypeScript's project-reference build mode walks the full dependency graph automatically).
- **Prisma can't auto-detect OpenSSL on `node:20-slim`**, silently defaulting to a guessed version — a real TLS risk, not cosmetic. Fixed with explicit `apt-get install -y openssl` before `yarn install` in the Dockerfile.
- **`docker build ... | Out-String` in PowerShell can throw a spurious top-level error** even when the build succeeds — check the actual BuildKit step output, not PowerShell's error framing.
- **On Windows, Prisma's `generate` fails with `EPERM: ... rename ... query_engine-windows.dll.node.tmp...`** whenever any running Node process (an app using `@prisma/client`, or Prisma Studio) still has the engine DLL loaded. Stop every running `apps/*` service before rebuilding `packages/db`.
- **Vitest exits with code 1 on "no test files found" by default** — use `--passWithNoTests` until real tests exist, or CI fails for a reason unrelated to actual code health.
- **`yarn workspaces foreach -Apt run test` fails if even one workspace lacks a `test` script** — safer to define root-level scripts directly (e.g. a single `vitest run`) until every package has its own.
- **Pub/Sub emulator state is entirely in-memory** — restarting Docker Desktop (or the container) wipes all topics/subscriptions; recreate them after every restart.
- **`saveEvent` must be idempotent**: a client retry after a partial failure (e.g. the DB write succeeds but the subsequent Pub/Sub publish times out and the request returns a 500) will resubmit the same event id. Without idempotency handling, this throws a Prisma unique-constraint error (`P2002`) instead of succeeding safely on retry.
- **CORS must be environment-aware, not just permissive**: `apps/api` allows any origin in dev but requires an explicit `ALLOWED_ORIGINS` allowlist in production, refusing to start without it rather than silently falling back to an open policy.
- **`apps/ingestion` was persisting raw, unredacted event payloads to Postgres** — `packages/redaction` only ever ran in `apps/workers`, after the data was already durably stored. Fixed by redacting immediately after validation/org-check, before both `saveEvent` and `publishEvent`, so neither the database nor the queue message ever carries raw payload data. This is why redaction should happen as early as possible in a pipeline, not just before the stage that "needs" it — the SDK now also redacts at `enqueue()` time, before anything leaves the client process, for a second independent layer.
- **`yarn lint` runs with `--max-warnings=0`, so a warning fails the run, not just an error.** Separately, running `next dev` or `next build` creates `apps/dashboard/.next/` containing generated TypeScript that violates our own lint rules. It is git-ignored, but ESLint has to ignore it too or lint fails locally; it never fails in CI, where `.next` doesn't exist.


## Decision log

Decisions made while building, with the reasoning, so they aren't re-litigated or forgotten. Items marked **open** are not yet decided; items marked **planned** are decided but not yet built.

- **Phase 4 scope (corrected):** an earlier version of this entry deferred threshold rules such as repeated authentication failures to Phase 5, on the reasoning that they need event history. That was wrong. The plan lists "Repeated authorization failures" under deterministic rules (section 12.1), and Phase 5's sequence detection (section 12.3) is the multi-stage chain of enumeration, credential abuse, privilege escalation and sensitive access, which is a different thing. History-dependent rules therefore belong in Phase 4, and so do behavioral baselines.
- **GCP-specific detection rules deferred (decided):** real Cloud Audit Log event shapes can't be observed until the Phase 3 connector is live, and writing rules against guessed shapes would be unverifiable. The first new rule batch therefore targets SDK-sourced authentication and authorization events, which can be tested against real traffic.
- **Evidence tiers for new rules (decided, built):** a single failed login or authorization denial is `suspected`, since one event is not proof of an attack. API key creation stays `confirmed`. Later correlation can raise confidence when events repeat.
- **GCP project (decided):** a throwaway project, `testbox-3cc16`, created by the CTO on his billing account. See the Phase 3 entry under Known gaps for why the personal billing route and the live `rootedwebsite` project were both rejected.
- **Enabled GCP APIs (decided):** only `cloudresourcemanager`, `iam`, `logging` and `apikeys`. `run.googleapis.com` is deferred until the Cloud Run monitoring item, to keep the enabled surface as small as the phase allows. Other APIs visible on the project came with Firebase defaults and are left untouched.
- **Connector service account roles (decided, verified):** read-only and nothing broader: `roles/logging.viewer`, `roles/iam.securityReviewer`, `roles/serviceusage.apiKeysViewer`, bound to `sentinel-connector@testbox-3cc16.iam.gserviceaccount.com`. Verified by listing the project's IAM policy filtered to that account: exactly those three roles and no others.
- **GCP access level (decided):** Owner on `testbox-3cc16` only, granted by the CTO. This corrects earlier advice that Editor would be enough: Editor can create a service account but cannot bind roles or change IAM policy, and this phase needs both, to grant the connector its roles and to generate real IAM-change events to test detection. Owner is acceptable because the project is empty and disposable.
- **No detection rule on HTTP 4xx responses (decided):** the SDK middleware tags every 4xx as `blocked`, which puts a harmless 404 in the same bucket as a real 403, so a rule on it would be noise. Revisit if the middleware starts distinguishing 401 and 403 from other 4xx.
- **Connector credentials (open):** prefer service account impersonation over a downloaded key file, so no long-lived secret sits on disk. If a key turns out to be unavoidable, store it outside the repository and add its path pattern to `.gitignore`. Decide after the role binding is sorted.
- **Unit tests import source, not `dist` (decided, built):** tests under `tests/unit` import the code under test directly from `packages/*/src`, so a test always exercises the code just edited rather than a possibly stale build. `tests/tsconfig.json` exists so ESLint's type-aware parsing can see test files; without it `yarn lint` fails on them. The first suite has 10 tests covering the three detection rules and `runDetection`, and all pass.
- **Lint scope (decided):** ESLint ignores generated Next.js output (`**/.next/**`), and `no-console` is switched off for `examples/*/src` alongside the existing `logger.ts` and `seed.ts` exceptions, since all of them print on purpose. Both fixes came from `yarn lint` failing locally after the dashboard and demos had been run.
- **Persist the full queryable event context (decided, built, verified):** the `Event` table stored `actionType` but not `actionCategory`, `actionTarget`, the integration id, or request context (request id, source IP, user agent). Rules key off category, and history queries and baselines must filter and group by these fields, so none of that could run against stored data. They are being added as explicit indexed columns rather than a JSON blob, because baseline queries (distinct endpoints, per-IP counts, activity by hour) need to filter and group on them. Rows saved before the change get `actionCategory` and `integrationId` set to `unknown` rather than guessed values. Source IP and user agent are now stored, so revisit retention before any real deployment. Verified end to end by sending a failed-login event with category, target and request context: all six new columns were populated, and the authentication-failure rule fired on the live event.
- **Baseline design constraint (decided, not built):** section 23 says an attacker must not be able to immediately redefine a baseline. Baselines will therefore be computed from a trailing window that excludes the most recent period, and will need a minimum sample size before they can flag anything, so a burst of new behavior cannot become normal the moment it starts. Exact window and thresholds get fixed when the first baseline is built.
- **Threshold windows use server-assigned `ingestedAt` (decided):** SDK event timestamps are set by the client, so a skewed clock or a forged timestamp could keep events out of a counting window and evade a threshold rule. Windows for threshold rules therefore count on `ingestedAt`, and the indexes were changed to end in `ingestedAt` to match (the first versions ended in `timestamp`, which was a mistake caught before any history query was written). Which clock baselines should use is **open**: hour-of-day behavior needs the real event time, but that value is client-controlled.
- **History-aware rules are a separate async rule type (decided, not built):** rules that need event history will implement their own interface and run through their own engine function, with history access passed in as an injected dependency, so `detection-engine` never imports the database. The existing single-event rules stay synchronous and unchanged, and `apps/workers` will run both kinds and combine the results.
- **Repeated-failure rule behavior (decided, not built):** a rule fires when the count of matching events inside the window, including the current one, reaches the threshold. Ingestion saves an event before publishing it, so the current event is always already counted. Grouping is by actor, falling back to source IP when no actor is known, because a failed login often has no identified user. Defaults of 5 failures in 10 minutes are placeholders to tune against real data, like the 5-minute correlation window. Known limitation: every event at or past the threshold produces its own detection rather than one per burst; deduplication is left to correlation, which already links detections that share an actor.