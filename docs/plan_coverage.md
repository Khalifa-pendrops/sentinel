# Plan coverage

A comparison of what is built against `Sentinel_Full_Product_Development_Plan.docx`, section by section. Written after the first Phase 4 baseline was verified live. Update it whenever a phase closes.

**Status words.** *Built*: exists and has been verified (unit tests, or run live). *Partial*: exists but misses stated requirements, which are listed in the notes. *Stub*: code exists but does nothing real yet. *Not started*.

## 1. Where we are, by phase (plan section 34)

| Phase | Status | Notes |
|---|---|---|
| 0 Foundation | Partial | Built: monorepo, event schema, Docker images, CI definition (blocked by the GitHub billing lock), Terraform (defined, never applied). **Not written: PRD, architecture document, threat model, API specification.** The README status line used to call this phase complete; that was wrong. |
| 1 Event Pipeline | Built, with weak spots | Ingestion, API-key auth, queue, database and a minimal Event Explorer all work end to end. Weak: input validation is thin; the queue is only the local emulator. |
| 2 SDK | Built for Express and Fastify | HTTP instrumentation, manual authentication, authorization and security events, redaction, batching, retries. Gaps against sections 8 and 10 are listed below. |
| 3 GCP | **Not started in code** | Access is ready (throwaway project, read-only service account, three roles verified). The connector is still stubs. This phase blocks the flagship scenario. |
| 4 Detection | Partial | 3 single-event rules, 2 history rules, 1 baseline (previously unseen endpoint). Missing: IAM-change, unused-service and sensitive-endpoint rules, the other baselines, anomaly signals, a data-driven rule format. |
| 5 Correlation | Early | The engine exists with four link types, but the live pipeline hands it one event at a time, so it can only link detections from the same event. Cross-event correlation is not actually happening yet. No sequence or cross-domain detection. |
| 6 Attack Graph | Partial | Nodes and edges are built in memory. Not persisted, no visualization, no relationship queries. |
| 7 Impact | Not started | |
| 8 Attack Stories | Not started | |
| 9 AI Investigator | Not started | |
| 10 Remediation Verification | Not started | |

## 2. Section by section

### Architecture and model (sections 4 to 7)

| Section | Requirement | Status | Notes |
|---|---|---|---|
| 4 | Application and cloud are separate observation domains | Built | Separate packages (`sdk-node`, `connectors/gcp`); only the application side produces data so far. |
| 5.1 | Application sensor: Node and TypeScript, Express, Fastify, Koa | Partial | Express and Fastify done, Koa not. No OpenTelemetry. |
| 5.2 | Cloud sensor, read-only | Stub | Listeners return empty arrays. |
| 5.3 | Evidence-driven correlation | Partial | See Phase 5. |
| 6 | Canonical event model | Built | Matches the interface. `securitySignals`, `traceId` and `spanId` exist but nothing fills them. |
| 7 | Evidence, derived fact, inference kept distinct | Partial | Detections carry an evidence level. There is no derived-fact or inference layer in the data or the UI. |

### Sensors (sections 8 to 11)

| Section | Requirement | Status | Notes |
|---|---|---|---|
| 8 | HTTP method, route, status, latency, request id | Built | Route is the matched pattern where the framework gives one. Verified live on both demos. |
| 8 | Trace id, actor | Not started | Middleware does not extract either. |
| 8 | Login, logout, failed login, authorization events | Partial | Available as manual calls. Nothing is captured automatically. |
| 8 | Suspicious-request signals (injection, traversal, SSRF, enumeration) | Not started | |
| 9 | No secrets collected by default | Built | Key-pattern redaction in the SDK and again in ingestion; query strings stripped from the target. |
| 9 | Configurable redaction, hashing, pseudonymization, allowlists, sampling | Partial | Only a fixed deny-list of key patterns. The SDK config does not expose it. |
| 10 | Async delivery, batching, bounded-backoff retries | Built | |
| 10 | Timeouts, circuit breaker, bounded memory, local buffering, priority dropping | Not started | No explicit request timeout (Node's default is minutes). During a sustained outage each overflowing enqueue starts another delivery attempt. Failed batches are dropped, not buffered. |
| 10 | SDK must never take down the app | Partial | Delivery errors are caught. The middleware's `finish` handler has no try/catch of its own. |
| 11 | GCP connector, least privilege | Stub | The service account and roles exist and are verified; no API calls are wired. Connector health and permission validity are not started. |

### Detection and analysis (sections 12 to 23)

| Section | Requirement | Status | Notes |
|---|---|---|---|
| 12.1 | Unexpected API key creation | Partial | Fires on any `api_key.create`. The "unexpected" signals from the rule format (first seen, unusual actor, off hours) are not built. |
| 12.1 | Repeated authorization failures | Built | Verified live. Repeated authentication failures added as well. |
| 12.1 | Unexpected IAM change; previously unused service activation; sensitive endpoint access | Not started | The first two need the Phase 3 connector. The third needs a definition of "sensitive". |
| 12.2 | Behavioral baselines | Partial | One of five: normal endpoints. Working hours, identities and projects, resource creation, API usage and billing are not started. |
| 12.3 | Sequence detection | Not started | |
| 12.4 | Cross-domain detection | Not started | Needs Phase 3. |
| 13 | AI and agentic classification | Not started | The plan says "eventually". |
| 14 | Incident engine | Partial | Incidents are created and stored with their detections. Missing: title, severity, confidence, status, start and last-seen times, affected sets, evidence ids, graph id, timeline. |
| 15 | Attack graph | Partial | Detection, actor and resource nodes with evidence-labelled edges, built in memory only. |
| 16 | Impact analysis | Not started | |
| 17 | AI investigator | Not started | |
| 18 | Remediation recommendations and verification | Not started | |
| 19 | Adaptive telemetry | Not started | |
| 20 | Telemetry gaps | Not started | Nothing reports that an SDK has gone quiet. |
| 21 | Self-monitoring | Not started | Structured logs only. |
| 22 | Rule format: versioned, explainable, testable, data-driven | Not started | Rules are TypeScript. They are testable and carry a description; they are not versioned or data-driven. |
| 23 | Baselines and false positives | Partial | Learning lag, minimum sample, and exclusion of already-detected events are built and verified. Missing: marking findings Legitimate, Malicious or Unknown, and expiring exceptions. |

### Platform (sections 24 to 31)

| Section | Requirement | Status | Notes |
|---|---|---|---|
| 24 | Data architecture | Partial | Have: organizations, API keys, events (JSONB payload), detections, incidents. Missing: users, applications, integrations, evidence, identities, detection rules, attack graphs, recommendations, admin audit log, object storage. |
| 25 | Ingestion: authentication, idempotency, queue, async workers | Built | Verified live, including recovery after a queue outage. |
| 25 | Rate limiting, strict schema validation, normalize and enrich stages | Not started | Validation checks only a few top-level fields. Missing `payload` crashes redaction and returns a 500. Field values are not checked against the allowed sets. |
| 26 | Organization id on every tenant-owned record | Partial | Events, incidents and API keys carry it. Detections do not; it is only reachable through their event. |
| 26 | Derive tenant from authenticated context | Partial | The server rejects a mismatched client-supplied id, but the SDK still has to send one (see deviations). |
| 26 | Isolation at API, database, queue, worker | Partial | API scoping and a worker guard exist. No row-level security. One shared topic. |
| 26 | Roles; separate SDK and dashboard credentials; audit of admin actions | Not started | The dashboard calls the API with an ingestion key. There is no user authentication. |
| 27 | Cloud Run, Pub/Sub, managed Postgres, Terraform | Partial | Docker images built. Terraform defined and never applied. Postgres is Supabase. Pub/Sub is the local emulator. Cloud Storage and Secret Manager unused. |
| 28 | Technology stack | Built | Fastify, Next.js, Postgres with Prisma, Pub/Sub, Docker. No OpenTelemetry. |
| 29 | Repository structure | Built | Matches, plus `examples/`. The `docs/` folders hold nothing as far as I know. |
| 30 | Security of Sentinel itself | Partial | Have: hashed keys with timing-safe comparison, redaction before storage, TLS to the database, read-only connector account. Missing: admin audit logs, dependency, SAST, container and secret scanning, SBOM, signed builds, managed secrets (env files today), penetration testing. |
| 31 | Evidence integrity (hash chain) | Not started | |

### Product (sections 32 to 37)

| Section | Requirement | Status | Notes |
|---|---|---|---|
| 32 | Dashboard: overview, incidents, incident page | Minimal | A raw event table only. |
| 33 | Flagship scenario | Not started | Needs the GCP connector, cross-domain correlation and a billing signal. |
| 35 | MVP non-goals | Respected | No second cloud, no ML, no extra SDK languages. |
| 37 | Mean Time to Understand | Not started | Nothing measures it. |

### Non-negotiable principles (section 38)

| Principle | Status |
|---|---|
| Application and cloud are separate domains | Holding |
| Correlation is evidence-driven | Holding in the code; thin in practice (see Phase 5) |
| Evidence, derived facts and inference distinguishable | Not yet |
| Never claim an attack without evidence; never claim AI behavior | Holding (conservative evidence tiers) |
| Unknown is a valid conclusion | In the data model only; not visible anywhere |
| Telemetry gaps visible | Not yet |
| SDK never takes down the application | Mostly; see section 10 gaps |
| Secrets not collected by default | Holding |
| Every tenant strongly isolated | Partial |
| AI grounded in structured evidence | Not applicable yet |
| Simplicity over microservices | Holding |
| Destructive remediation needs authorization | Not applicable yet |
| Major decisions documented | Holding (README decision log); `docs/` is empty |

### Instructions for the coding agent (section 39)

| Instruction | Status |
|---|---|
| Every major component has tests | Partial. Tests cover detection rules, history rules, baseline rule, redaction and endpoint naming. Ingestion, workers, auth, db, the SDK client, correlation and the attack graph have none. |
| Every external input validated | Partial (see section 25) |
| Document significant deviations and obtain approval | Partial. See the next section. |

## 3. Deviations from the plan

Section 39 asks for deviations to be documented and approved. These are the ones I found. None is decided until you say so.

| # | Deviation | Plan says | Proposed resolution |
|---|---|---|---|
| 1 | The SDK config and every event carry a client-supplied `organizationId`; the server rejects a mismatch | Section 8's `init` takes no organization; section 26 says derive tenant from authenticated context | Ingestion stamps the organization from the API key, and the SDK drops the config field. Safer and matches the plan. |
| 2 | The dashboard calls the API with an ingestion key | Section 26: separate SDK and dashboard credentials | Introduce dashboard authentication when the incident pages are built; record as a known gap until then. |
| 3 | SDK package and API are `@sentinel/sdk-node` with `expressMiddleware()` and `fastifyPlugin()` | Section 8 shows `@sentinel/node` and one `middleware()` | Accept: the package name matches section 29's `sdk-node`, and the two frameworks need different hooks. Record the decision. |
| 4 | CircleCI and Docker Hub added; GitHub Actions workflow blocked | Section 27: GitHub Actions with Workload Identity Federation | Record both; revisit once the GitHub billing lock clears. |
| 5 | Postgres is hosted on Supabase | Section 27: managed PostgreSQL on Google Cloud | The wording allows it; record the hosting choice and its consequence (no Cloud SQL in Terraform). |
| 6 | Correlation and graph engines were built before Phase 3 | Phases are meant to be sequential | Deliberate, since they only need SDK data. The cost: correlation is wired to single events, so cross-event correlation is still to do. |
| 7 | README said Phase 0 was complete | Phase 0 includes PRD, architecture, threat model, API specification | Corrected. The four documents still need writing. |

## 4. Recommended order from here

The plan's MVP is: application telemetry, Google Cloud telemetry, normalization, deterministic detection, cross-domain correlation, incident timeline, attack graph and an evidence-backed explanation. Today only the application half exists, which is why Phase 3 is the critical path.

1. **Small security fixes first** (each is a few hours at most): strict event validation in `event-schema`, organization derived from the key (deviation 1), an explicit SDK request timeout and a try/catch around the middleware handler, and a bound on in-flight deliveries.
2. **Phase 0 documents:** a threat model and an API specification are the useful two; a short architecture document can reuse the README diagram.
3. **Phase 3 for real:** connector against `testbox-3cc16`: audit logs normalized into `SentinelEvent` with source `gcp`, API-key creation, IAM changes and service enablement, then the credentials decision (impersonation over a key file), then connector health.
4. **Rules that need that data:** unexpected IAM change, previously unused service activation, and the "unexpected" signals on API key creation.
5. **Phase 5 for real:** correlation that reads earlier events and detections from the database, so identity, time and resource links work across events and across the two domains; then full incident fields, a stored attack graph and an incident timeline.
6. **Flagship scenario** (section 33) as the acceptance test, then the incident page, impact analysis, stories, the AI investigator and remediation verification.