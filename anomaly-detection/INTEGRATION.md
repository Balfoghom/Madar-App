# Manal: integration contract

This v0.2 contract is implemented by the application HTTP adapter. The trained model works without an external AI provider. Choose either direct module import or the local HTTP adapter; do not implement both unless needed.

## Endpoints

| Method | Path | Result |
|---|---|---|
| GET | `/health` | Readiness, model version, synthetic-only flag |
| GET | `/model` | Algorithm, features, threshold, tree count, fingerprint and validation status |
| GET | `/journey-models` | Registry of the SANED model and five provisional synthetic journey models |
| GET | `/cases` | IDs and scenario names for the 24 bundled synthetic cases |
| POST | `/assess` | Assess a bundled SANED `case_id` or synthetic service-journey assessment; the latter includes a separated operational-control result and model review gate |
| POST | `/assess-journey` | Compatibility route for non-SANED synthetic journey inference |
| POST | `/assess-case` | Assess and save a synthetic SANED event case |
| POST | `/upload` | Receive CSV text plus raw synthetic evidence rows; run inference server-side and save results |
| GET/POST | `/risk-config` | Read/save sandbox risk weights and thresholds |
| POST | `/outcome` | Record a specialist outcome; `/record-outcome` remains an alias |
| GET | `/indicator-suggestions` | List indicator proposals |
| POST | `/indicator-suggestions/generate` | Generate Proposed items from repeated confirmed synthetic outcomes |
| POST | `/indicator-suggestions/:id` | Human governance actions |
| POST | `/decision` | Persist specialist approval, override, or rejection independently of model output |
| GET | `/assessments` | Saved model snapshots and linked human review history |
| POST | `/demo-reset` | Clear saved demo records and restore default sandbox settings |

Request:

```json
{"case_id":"SYN-demo-00002"}
```

The response includes:

| Field | Meaning / UI treatment |
|---|---|
| `assessmentId`, `assessedAt` | New adapter assessment ID and timestamp; persist alongside human decisions |
| `caseId`, `synthetic`, `validation` | Case identity and data/validation boundaries |
| `modelVersion` | Keep with every assessment |
| `complete` | False means abstention; show evidence-completion state |
| `score` | Raw anomaly score; omitted if incomplete |
| `percentile` | Relative unusualness, not fraud probability; null if incomplete |
| `modelFlagged`, `ruleFlagged` | Independent component outcomes; omitted if incomplete |
| `ruleReasons` | Provisional comparator rule triggers |
| `route`, `band` | Proposed review route and display category |
| `reasons` | Deterministic explanation text |
| `features` | Observed value, median, reference range and out-of-range flag |
| `explanationBoundary` | Feature ranges are context, not exact model attribution |

See `examples/demo-results.json` for complete real outputs. The direct `assess(case)` import returns the model result only; your application generates/persists its own assessment ID and timestamp.

## Required integration behavior

1. Run inference on the supplied synthetic evidence and retain the model version. Never substitute a random or hardcoded score on errors.
2. Keep existing operational controls separately visible. Our provisional comparator rules are not the complete existing engine.
3. Do not average an anomaly percentile into a legacy score without a separately agreed calibration and evaluation design.
4. When `complete` is false, request evidence completion. Do not label the case low risk.
5. Save human decisions separately from model results so reassessment preserves the review history.
6. “Unusualness percentile” is the correct label. Avoid “fraud probability,” “confirmed fraud,” or unvalidated “AI confidence.”
7. The prototype accepts only cases marked synthetic; CSV uploads are validated in the browser and sent to the local adapter with raw evidence rows for server inference. Do not upload real institutional records.
8. The local adapter persists JSON files but has no authentication or production database. Keep it local and synthetic-only.
9. Generated indicator proposals remain `Proposed`; testing and activation require human governance. The adapter does not modify active rules or weights from outcome history.

## Error handling

400: malformed JSON or unsupported request fields. 404: unknown endpoint or synthetic case ID. 413: request exceeds 64 KB for assessment evidence or 2 MB for CSV import (maximum 200 rows). Treat unreachable service/timeouts as unavailable AI; preserve human review. A complete response with `complete:false` is an intentional abstention, not a transport failure.

## Core model input

Each bundled case has `id`, `synthetic:true`, `asOf` (UTC epoch milliseconds), positive integer `workforce`, and `events`. Events use `type`, `recordedAt`, synthetic `subject`, and, when applicable, `amount` or `effectiveAt`. `family` and `split` are generator metadata excluded from inference. The `synthetic` marker and synthetic ID prefix are input checks, not a way to certify the provenance of arbitrary data. The ID-only endpoint enforces the supplied-case allowlist. The event endpoint also permits explicitly marked synthetic histories with a SYN- ID and validated evidence.

The first six bundled cases are the demonstration cases listed in `DEMO.md`. The remaining 18 provide different synthetic examples from the same six scenario families. The core model is not a lookup: its score is computed from event-derived features at each invocation.

The synthetic assessment branch of `/assess` accepts Benefit Payments, Employer Registration, Retirement, Maternity Benefit, or Contribution & Wage. It returns the saved model’s genuine raw score, percentile and feature context. The application keeps the existing control score unchanged: no model percentile is averaged into it. A model flag can require review even when the separate control score is low. This is a review gate, not a calibrated combined risk score. Comparator rules are not implemented for these five models: ruleFlagged is null and comparatorRulesAvailable is false, rather than implying a successful rule check. `complete:false` abstains when required evidence is missing. This is demonstration behavior, not approved service policy. Do not use these synthetic models for real claims or payment decisions.

## Application request and persistence

The app uses HTTP inference, not a second direct inference implementation. New Assessment and CSV imports share `lib/assessment-adapter.mjs`.

```json
{"assessment":{"id":"NEW-demo-1","synthetic":true,"transactionId":"DEMO-1","journey":"SANED","scenario":"Synthetic reference case","ruleScore":20,"features":{},"modelInput":{"case_id":"SYN-demo-00000"}}}
```

`POST /assess` saves before returning. `POST /assess-case` accepts `{case, context}` for SANED synthetic event history. Other journeys use `journeyFeatures` with the evidence names in the loaded model registry. Missing required evidence produces abstention, not invented evidence or a local fallback.

`POST /upload` accepts `{csv, mode: "append" | "replace", rows: [...]}`. Rows use the same raw context schema. Browser parsing and basic validation happen first; the server independently validates each row and performs inference. It returns accepted/rejected counts and `saved` records. Rejected rows are identified; unavailable inference must not generate a successful local result. Replace replaces CSV-import records, not model artifacts. Raw CSV text is not retained.

Download the app CSV template or use `examples/synthetic-model-evidence.csv`. Required columns: `synthetic`, `journey`, `scenario`, `subject_id`, `existing_control_score`. A transaction ID is generated if blank. SANED requires `saned_case_id` from `/cases`, or explicit `workforce`, `as_of`, and quoted `events_json`. Other journeys use quoted `journey_features_json`. Aggregated case form fields are not silently converted to SANED event history during import.

Root `score` and `modelResult.score` are the raw model score. `caseData.score` is the unchanged operational control score, and is null when model evidence is incomplete. `caseData.modelAssessment` retains the genuine model snapshot: modelVersion, score, percentile, modelFlagged, ruleFlagged, complete, features and explanations. These are shown in the existing case details page. Legacy seeded/statistical examples are labelled separately. Model unusualness has no validated confidence percentage.

Human reviews are appended to `data/human-reviews.json` with assessmentId, caseId, actor, timestamp and note. `/outcome` and `/decision` update human case status without rewriting model snapshots. Reassessment retains the old review history linked to its original assessmentId; a supplied stale assessmentId is rejected with 409. These local JSON writes are not a transactional production database. `/save-assessment` only retrieves an already server-saved assessment by ID; it rejects client-generated scores.

Demo Reset clears runtime cases, decisions and proposals and restores sandbox settings; it does not delete or retrain model artifacts. Sandbox weights remain for legacy statistical simulation; trained model cases are protected from frontend recalculation. No training is invoked by startup, upload, review, proposals, or reset. Changes to other journey models remain the responsibility of the model owner.

To run the current adapter after source changes, stop the previous `npm start` process and start it again in `anomaly-detection`. `/health` must report `contractVersion: "integration-v0.2-separated"`. An older process does not pick up module changes automatically.
