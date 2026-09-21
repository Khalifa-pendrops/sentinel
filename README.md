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
                     (GraphQL / REST API)           (Incident Timeline UI)
   ```

---

## Status: Phase 0 (scaffolding)

### Built and compiling clean (strict TypeScript, yarn workspaces)

- **`packages/event-schema`** — canonical `SentinelEvent` type, evidence-tier enum (`confirmed` / `suspected` / `not_detected` / `unknown`)
- **`packages/shared`** — ID generation, structured JSON logger
- **`packages/auth`** — API-key hashing + timing-safe verification
- **`packages/sdk-node`** — application-side sensor stub (`Sentinel.init()`, `.securityEvent()`, `.authorization()`); queues events, no delivery wired yet
- **`connectors/gcp`** — cloud-side sensor stub (audit log / IAM / API-key listeners); no real GCP API calls wired yet
- **`packages/db`** — Prisma/Postgres (Supabase) persistence: organizations, hashed API keys, events, detections (via `DetectionEvent` join table for multi-event support), incidents
- **`apps/ingestion`** — Fastify service: validate → authenticate → cross-check organization → persist → publish (`POST /v1/events`); auth is real, DB-backed API-key lookup, cross-checked against the authenticated key's actual organization (never trusts client-supplied org ID)
- **`packages/detection-engine`** — deterministic rule matching only (one example rule: unexpected API key creation); baseline and sequence detection not implemented, need historical data first
- **`packages/correlation-engine`** — links detections via `shared_trace`, `shared_actor`, `shared_resource`, and `time_window` (5-minute placeholder window); evidence-driven only, never assumed
- **`apps/workers`** — real Pub/Sub subscriber (Google's local emulator for dev); runs redact → detect → correlate → attack-graph pipeline per message, acks only after successful persistence, nacks (triggering redelivery) on failure; guards against mixed-organization batches
- **Queue** — real Google Cloud Pub/Sub client, running against the local emulator for dev; verified end-to-end (publish → subscribe → ack) against live Supabase data, including the multi-event join table

### Scaffolded, empty

- `apps/api`, `apps/dashboard`, `apps/workers` (`src/` created, no source yet)
- `infra/terraform`, `infra/docker`
- `docs/architecture`, `docs/security`, `docs/api`, `docs/runbooks`
- `tests/unit`, `tests/integration`, `tests/e2e`, `tests/security`, `tests/fixtures`

## Known gaps / next up

- **`apps/workers`** — consume Pub/Sub, run detection → correlation → attack graph pipeline in sequence
- **`packages/attack-graph`** — not started
- **`packages/redaction`** — not started
- **Postgres + Prisma** — no schema yet, so no real API-key storage (ingestion auth is unusable end-to-end until this exists), no baseline detection possible either
- **`apps/ingestion`** — wire actual Pub/Sub publish instead of just accepting and logging
- **`infra/terraform`** — no resources defined yet (Cloud Run, Pub/Sub, Cloud SQL, Secret Manager per doc section 27)
- **CI workflow** (`.github/workflows/ci.yml`) — not created
- **Correlation time window** — 5-minute constant in `correlation-engine` is a placeholder, needs tuning against real incident data

## Dev setup

```powershell
corepack enable
yarn install
yarn workspace @sentinel/<package-name> run build
```

Node >= 20, Yarn 4.5.0 (pinned via `packageManager`). Uses the `node-modules` linker (see `.yarnrc.yml`), not PnP — PnP broke TypeScript's `types` resolution for `@types/node`.


### Pub/Sub emulator (required for apps/ingestion and apps/workers)

```powershell
docker run -d --name sentinel-pubsub -p 8085:8085 google/cloud-sdk:latest gcloud beta emulators pubsub start --host-port=0.0.0.0:8085 --project=sentinel-dev

curl.exe -X PUT "http://localhost:8085/v1/projects/sentinel-dev/topics/sentinel-events-dev"
curl.exe -v -X PUT -H "Content-Type: application/json" --data-raw '{\"topic\": \"projects/sentinel-dev/topics/sentinel-events-dev\"}' "http://localhost:8085/v1/projects/sentinel-dev/subscriptions/sentinel-workers-dev"
```

Requires `.env` (and copies in `apps/ingestion/.env`, `apps/workers/.env`, `packages/db/.env`) to include `PUBSUB_EMULATOR_HOST=localhost:8085` and `GCP_PROJECT_ID=sentinel-dev` — without these, the Pub/Sub client tries to reach real GCP instead of the local emulator.


## Observations / gotchas encountered

- **BOM breaks JSON**: `Set-Content -Encoding utf8` in PowerShell prepends a byte-order-mark, which Node's JSON parser can't handle. Use `[System.IO.File]::WriteAllText(...)` instead (no BOM by default).
- **Yarn PnP breaks `@types/node` resolution**: TypeScript's `"types": [...]` compiler option can't resolve packages through Yarn's virtual PnP filesystem. Fixed by setting `nodeLinker: node-modules` in `.yarnrc.yml` — trades a heavier repo on disk for tooling that actually works.
- **Yarn PnP is per-package strict**: a workspace package can only resolve dependencies declared in *its own* `package.json`, not anything hoisted from the root. Every package needing `@types/node`, `fastify`, etc. must declare it directly.
- **New workspace packages need `yarn install` before `yarn workspace <name> run <script>` works** — otherwise Yarn throws `Package for ... not found in the project`, even if the folder and `package.json` both exist.
- **`noPropertyAccessFromIndexSignature` (strict mode) requires bracket notation** on `process.env.X` and any `Record<string, unknown>` field access — `.env.PORT` fails, `.env['PORT']` is required.
- **New `apps/*` and `packages/*` directories need an explicit `src/` subfolder** — the initial folder-scaffolding step didn't create `src/` under `apps/*`, only under `packages/*`, which caused `WriteAllText` to fail with `DirectoryNotFoundException` until `New-Item -ItemType Directory` was run first.
- **PowerShell backtick-escaping doesn't nest**: writing a literal `` `${...}` `` template-literal syntax into a `.ts` file via a double-quoted PowerShell string collapses instead of producing real backticks — safer to rewrite the source using string concatenation (`+`) instead of template literals when generating files this way.
- **Watch for stray parentheses when hand-writing array literals as file content** — `patterns.ts` was initially written with a trailing `]);` instead of `];` (a copy-paste artifact from writing it like a function call), which is a genuine syntax bug, not a PowerShell escaping issue.
- **Supabase direct connection is IPv6-only**: `db.<ref>.supabase.co` (port 5432) isn't reachable from most IPv4-only networks, causing Prisma migrations to fail with `P1001`. Use the **Session pooler** connection string (same port 5432, different host `<region>.pooler.supabase.com`, username suffixed with the project ref) as `DIRECT_URL` instead. `DATABASE_URL` should still use the **Transaction pooler** (port 6543) for app runtime queries.
- **Prisma env files are workspace-scoped, not root-scoped**: running `yarn workspace @sentinel/db run <script>` changes CWD to `packages/db`, so Prisma looks for `.env` there — a root-level `.env` isn't picked up automatically and needs to be copied into the package folder too.
- **PowerShell double-quoted strings interpolate `$` as variables**: writing literal JS/TS code containing `$` (e.g. `prisma.$disconnect()`) into a file via `WriteAllText` with a double-quoted outer string silently expands `$disconnect` as an (undefined, empty) PowerShell variable, corrupting the output to `prisma.()`. Escape any literal `$` in generated code with a backtick (`` `$ ``).

- **`yarn workspace <name> run <script>` (and even plain `yarn run` from inside a workspace dir) fails to inject the root `node_modules/.bin` into PATH under Docker**, specifically with Corepack-fetched Yarn 4.5.0 + the `node-modules` linker on `node:20-slim` — reproducibly gives `command not found: tsc` even though the binary and workspace registration are both correct (confirmed via `yarn workspaces list` and direct invocation of `../../node_modules/.bin/tsc`). Root cause not fully isolated; workaround is to bypass Yarn's script runner entirely in Docker builds and invoke `tsc -b` directly via its root-relative path against one leaf project — TypeScript's project-reference build mode (`tsc -b`) automatically walks the full dependency graph from there, so one line replaces what would otherwise be one `RUN` per package.
- **Prisma can't auto-detect OpenSSL on `node:20-slim`**, silently defaulting to a guessed version (`openssl-1.1.x`) that may not match what's actually installed — a real risk for TLS connections to Supabase, not just a cosmetic warning. Fixed by explicitly `apt-get install -y openssl` before `yarn install` in the Dockerfile.
- **`docker build ... 2>&1 | Out-String` in PowerShell can throw a spurious top-level `NativeCommandError`** even when the build itself succeeds — check the actual BuildKit step output (`#N DONE`) rather than trusting PowerShell's own error framing.
- **CI workflow** (`.github/workflows/ci.yml`) — written and correct (verified all steps pass locally: install, prisma generate, typecheck, lint, test), but **blocked from actually running** by a GitHub account-level billing lock ("payment authorization failed") unrelated to this project — a known, widely-reported GitHub Free-tier issue, ticket filed with GitHub Support, pending resolution.

- **CORS defaults to permissive in dev, strict in production**: `apps/api`'s CORS origin is `true` (reflects any origin) unless `NODE_ENV=production`, in which case it requires `ALLOWED_ORIGINS` (comma-separated) to be set and will refuse to start without it — never falls back to open CORS in production. Set `ALLOWED_ORIGINS` before deploying `apps/api` anywhere real.

- **On Windows, Prisma's `generate` step fails with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp...`** whenever any running Node process (an app using `@prisma/client`, or `prisma studio`) still has the current engine DLL loaded — Windows won't let it be overwritten while in use. Stop every running `apps/*` service (and Prisma Studio, if open) before rebuilding `packages/db`.

