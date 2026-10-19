# Madar — current technical blueprint

## Runtime

Node.js 22.13+ runs `start.mjs`, serving an allowlisted static interface from `dist/` and routing `/api/*` to `anomaly-detection/server.mjs`. No npm dependencies are required for inference. Model training is an offline task with separate pinned Python dependencies.

The launcher reads an optional root `.env` before importing the API. Host environment variables take precedence. `.env` files are ignored by Git and Docker. Secrets must remain on the server.

## Components

| Component | Responsibility |
|---|---|
| `dist/operations.js` | Fraud Operations landing page, case ownership form and optional LLM explanation panel |
| `dist/app.js` | Intake, queue, decisions, outcomes, reports, governance views and separately scoped legacy simulation |
| `dist/madar.js` | Connected-event example, evidence timeline, inference and specialist review |
| `anomaly-detection/server.mjs` | Validation, inference APIs, serialized local mutations, workflow, explanations and model registry |
| `lib/assessment-adapter.mjs` | Six journey models and separate operational-control routing policy |
| `lib/cross-journey-adapter.mjs` | Event CSV contract and connected-model case mapping |
| `cross-journey/inference/detector.mjs` | Derived features and fitted Random Forest inference |
| `lib/case-explainer.mjs` | Minimal evidence packet, OpenAI Responses request, strict output validation |

Paths under `lib/` are relative to `anomaly-detection/`.

## Key contracts

- Assessments retain `assessmentId`, `caseId`, assessed time, model version, raw model result, input evidence and application routing separately.
- Decisions and outcomes reference the current assessment, require a named reviewer and note, and leave the original model result unchanged.
- `/case-workflow` stores assigned owner, stage and revision. Stale revisions, skipped stages and unresolved closures are rejected.
- `/case-explanation` retrieves or generates a draft for a current saved synthetic assessment. Cache identity includes assessment ID, evidence fingerprint, prompt version and configured model. Changed facts require a fresh explanation; evidence changing during generation prevents saving that draft.
- `/llm/status` exposes configuration status, not credentials. Only explicit generation requests call the external provider. Provider refusal, timeout or invalid output cannot become a fabricated successful explanation.
- Repeated identical connected evidence with the same model version is idempotent. Changed evidence/version creates a new assessment while preserving historical human reviews.
- Sandbox configuration is never used as the active routing policy for fitted-model cases.

## Storage and concurrency

`.madar-data/` is the launcher’s default runtime directory. Writes are queued within the single Node process and use temporary-file replacement. Ownership, assessments, human reviews, proposals and explanations use separate JSON files. These files are not a multi-instance transactional database or an immutable audit system. A process interruption across multiple related files can still require recovery/reconciliation.

Manal’s earlier checked-in session is preserved under `demo-sessions/manal-20261019/`. It is a historical fixture, not the default seed for a fresh installation. Local sessions stay excluded from Git.

## LLM controls

The server sends derived features, reason codes, model/routing context and recorded outcome/amount fields. It omits subject identifiers, names, contact details, event identifiers, reviewer notes and scenario free text. Synthetic flags are an input contract, not a mechanism for anonymizing real records. Only approved synthetic data should be used.

Responses use `store:false` and strict structured outputs. The server validates expected fields, text size and cited evidence IDs. Requests have a 45-second timeout, one in-flight generation per case and a five-generation-per-minute prototype limit. These measures are not an enterprise budget or abuse-control system. Provider retention and processing terms must be checked separately.

## Deployment boundary

Single Node service, persistent runtime directory, HTTPS from the hosting platform and optional shared demo password. Enterprise deployment needs SSO and enforced roles, transactional storage, approved connectors and provider, audit integrity, retention, observability, evaluation and controlled release processes. Existing ServiceNow files are import examples, not an implemented connector.
