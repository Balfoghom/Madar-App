# SANED anomaly-detection component

**Status:** Model component connected to the local application through the HTTP contract in INTEGRATION.md. Synthetic-only; business validation by Haitham is pending. This package is independent of the application UI. It has not been published as a hosted service.

## What is actually AI?

A scikit-learn Isolation Forest learns a reference distribution from 2,400 generated claim histories. Its 100 fitted trees are exported in `data/model.json`. `lib/detector.mjs` traverses those trees to score a new history. No AI service subscription or API key is required for this model.

The model is trained once; it does not learn from reviewer decisions automatically. The rules, route selection, reference-range explanations, and summaries are ordinary deterministic code. There is no LLM or autonomous agent in this version.

### The other five service journeys

Benefit Payments, Employer Registration, Retirement, Maternity Benefit, and Contribution & Wage now have the same reproducible offline lifecycle: a fixed-seed generator creates separate synthetic training and calibration sets, the Isolation Forests are fit, and each journey's model, reference ranges, calibration scores, threshold, and held-out synthetic evaluation are written to `data/journey-models.json`. The backend loads these saved artifacts rather than fitting models at startup. These pre-existing artifacts are used for inference only in the application. Training changes are reserved for the model owner; this integration does not regenerate them. The training, calibration, and holdout counts are available from `GET /journey-models`.

These five prototypes use each journey's structured features and separately generated synthetic baseline. They do not use real operational data or specialist outcomes. Their held-out checks use generated normal-like cases and deliberately extreme synthetic cases; the reported metrics only describe that generator and are not real-world validation. They must not be presented as validated fraud models.

For model metadata use `GET /journey-models`. `POST /assess` accepts either the bundled SANED `{ "case_id": "..." }` request or `{ "assessment": <synthetic journey assessment> }`; the latter returns the Isolation Forest result and the configured weighted behavioral risk assessment. `/assess-journey` remains as a compatibility route, and `/assess-case` accepts a SANED event case.

The application adapter now persists synthetic assessments, CSV imports, specialist outcomes, risk configuration, and proposed indicators as local JSON files under `data/`. `POST /upload` receives CSV text plus the browser-validated synthetic assessments; `POST /outcome` records a specialist outcome (`/record-outcome` remains an alias); `GET/POST /risk-config` reads or saves sandbox weights and thresholds; `GET /indicator-suggestions` lists suggestions and `POST /indicator-suggestions/generate` mines repeated reason codes from at least two confirmed synthetic outcomes. Suggestions can only move from `Proposed` to `Testing` through this prototype. `POST /demo-reset` clears saved demo assessments, uploads, suggestions, and sandbox settings.

## Quick start for Manal

Requires Node 22.13 or newer. In this directory:

```sh
npm test
npm run demo
npm start
```

Inference has **zero npm dependencies**; no installation is required. The server binds to `127.0.0.1:8787`. It is a local integration adapter, not an authenticated public service. Manal can import the inference module into her application's backend instead of deploying a second service.

```js
import { assess } from './lib/detector.mjs';
import cases from './data/cases.json' with { type: 'json' };
const result = assess(cases.find(c => c.id === 'SYN-demo-00002'));
```

Or use the local endpoint:

```sh
curl http://127.0.0.1:8787/model
curl http://127.0.0.1:8787/cases
curl -X POST http://127.0.0.1:8787/assess \
  -H 'Content-Type: application/json' \
  -d '{"case_id":"SYN-demo-00002"}'
```

The SANED event endpoint only accepts the 24 supplied synthetic case IDs or a validated synthetic event case. The application adapter is local-only, unauthenticated, and uses JSON files rather than a production database. It must not be exposed as a public service. CSV data is limited to synthetic or approved sandbox examples; the raw CSV is not retained, while its assessed case records are saved locally.

## Data → features → AI → review

Raw synthetic events include wage records, claimant amendments, employer exclusions, supervisor changes and claim submission. Features are calculated using only events **recorded on or before** the synthetic assessment time. A future-recorded event is excluded even if its effective date is earlier.

| Feature | Exact definition |
|---|---|
| Amendment count | Claimant amendments recorded in the preceding 30 days |
| Maximum backdating | Maximum nonnegative difference between amendment recording and effective date, in days |
| Amendment recency | `log(1 + hours since latest amendment)`; 720 hours when none occurred in the 30-day window |
| Wage change | Percentage change between the last two recorded claimant wages |
| Employer exclusion rate | Exclusion events in seven days per 100 current reference workers |
| Supervisor change rate | Supervisor-change events in 24 hours per 100 current reference workers |

The reference workforce is provided by the synthetic generator. Exclusion and supervisor inputs are assumed to already be scoped to the case's employer and relevant supervisor; a production event join is not implemented. Rates count events, not deduplicated people. Claim IDs, scenario names, expected outcomes, and labels never enter the model. The current model does not analyze text, graph relationships, or arbitrary event sequences.

Missing workforce, missing wage history, missing claim evidence or malformed required events cause abstention. No percentile is fabricated. There is no imputation of missing evidence.

## Scores and routing

- `score`: raw Isolation Forest unusualness, higher means more unusual. It is not a fraud probability.
- `percentile`: percentage of the 800 normal calibration scores less than or equal to the claim's score. 100 means above all calibration cases, **not 100% fraud likelihood**.
- `modelFlagged`: raw score is at least `0.6200281595573496`, the 97th percentile of the calibration set.
- `ruleFlagged`: one or more **new provisional comparator rules** fire: 4 amendments, 30 backdated days, 80% wage increase, 35 exclusions per 100 workers, or 20 supervisor changes per 100 workers.
- `route`: `Specialist review` if either component flags; otherwise `Standard review`. Missing required data gives `Complete evidence`.

These comparator rules are not validated SANED policy and are not the full legacy Haitham scoring engine. Manal should display AI and existing controls separately; preserve mandatory business controls. Do not silently replace the legacy 55/45 score with this model's percentile. Our proposed hybrid is an OR review gate, not an averaged fraud score.

`features` shows the observed values and the reference population's 5th–95th percentile range. These are contextual deviations, **not causal explanations or exact feature attributions**. The displayed amendment-recency value is converted back to hours.

The AI never confirms fraud, denies benefits, stops payment, or proves eligibility. Human review remains necessary.

## Evaluation, including failures

Training: 2,400 reference histories. Calibration: 800 separate normal/legitimate histories. Test: 600 separate histories, consisting of 300 provisional review cases and 300 provisional legitimate cases. A fixed random seed makes the run reproducible. Claimant IDs are disjoint between partitions. All partitions use the same generator and distributions; this is not external or real-world validation.

| Method | Review cases caught / 300 | Missed | False alarms / 300 legitimate |
|---|---:|---:|---:|
| Provisional rules only | 200 | 100 | 14 |
| Isolation Forest only | 221 | 79 | 16 |
| Rules OR Isolation Forest | 300 | 0 | 27 |

The model flags all 100 designed coordinated-change cases, which the comparator rules miss. It misses 79 of 100 designed wage-increase cases, which the rules catch. It flags 13 of 60 legitimate employer-reduction cases. The combined approach therefore increases review workload as well as detection coverage.

**Do not describe the combined result as “100% fraud detection accuracy.”** It is recall against our provisional generator labels. Real fraud accuracy, savings, fairness and operational workload have not been established. The simple generator makes designed anomaly families easier to distinguish and cannot validate novel real-world fraud.

Detailed results: `data/evaluation.json`. All 600 test vectors, provisional labels and Python reference scores: `data/evaluation-cases.json`. A separate fixture file includes raw histories for feature-extraction parity checks. The model fingerprint links the evaluation to the exact exported artifact.

## Verification

The automated suite checks:

- Exported JavaScript inference matches Python/scikit-learn to `1e-10` on all 600 held-out test vectors.
- Raw event feature extraction matches Python on 36 independently selected test histories.
- Future events cannot leak into current assessments.
- Reordering events or changing labels does not change the score.
- Changing actual event evidence changes the score.
- Missing/malformed evidence causes abstention.
- The inference endpoint rejects arbitrary records and runs the actual fitted model.

## Retraining

Only retraining needs Python and the pinned dependencies:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-training.txt
.venv/bin/python ml/train.py
npm run train:journeys
```

The SANED trainer writes its model and evaluation artifacts to `data/`. The other five journey models are generated and evaluated with `npm run train:journeys`; their saved artifact is `data/journey-models.json`. Both pipelines use synthetic-only data. The other five holdouts contain 400 normal-like and 400 deliberately extreme cases per journey. Preserve model versions and evaluation artifacts when comparing changes. Synthetic evaluation is a software-development check, not evidence of real-world fraud performance.

## Team handoff

- **Manal:** integrate `assess()` or the adapter, keep model version and assessment IDs, show missing-evidence/error states, capture human decisions in her app, and handle deployment/access controls.
- **Haitham:** validate the six scenario families, expected routes, legitimate exceptions, feature windows and comparator thresholds using `SCENARIO_REVIEW.md`.
- **User + AI workstream:** own synthetic scenario generation, feature definitions, model training, comparisons, limitations and the next evaluation after Haitham's review.

See `INTEGRATION.md` for the request/response contract and `DEMO.md` for a short review sequence. The original application source is unchanged. An earlier separate `saned-prototype` UI draft is unintegrated and unpublished; the AI deliverable is this directory.


## New Assessment scenario approval

After running a manual New Assessment and recording a specialist outcome, open **Scenario Approval** in the case detail. Submit a rationale, then record each named review in order: Specialist Review → Testing (Data & AI) → GM Approval → Approved → Active. A reviewer may reject at a review gate. Every decision requires a note; the backend rejects skipped stages, incorrect declared roles, duplicate submissions, and stale stage updates. Active examples are selectable in New Assessment; selection copies the journey and description for a new, independently assessed case.

`GET /scenario-proposals` reads the saved scenario reviews. `POST /scenario-proposals` takes `caseId`, `action`, `actorName`, `role`, `note`, and `expectedStatus` for transitions. Actions are `submit`, `review`, `pass-test`, `approve`, `activate`, and `reject`. The scenario snapshot, reasons, outcome, and reviewer history are retained in `data/scenario-proposals.json`, with a linked state and audit in the saved assessment. Demo Reset clears these proposals too.

Roles in this local hackathon prototype are declared demo roles, not authenticated user accounts. Activation adds an approved reference example; it does not retrain the model, change scores, or create an executable new risk rule. Test approval records a human's evidence note, not an automatic model evaluation. Newly assessed manual cases return structured `reasonCodes` and `mainReason` from backend model/reference findings and configured patterns, and these are stored with the case.

Run `node --test tests/scenario-workflow.test.mjs` for an isolated integration check across all six journeys and review transitions. It sets `ASSESSMENT_DATA_DIR` to a temporary directory and does not reset the saved demo data.

## Application integration v0.2

New Assessment and CSV import now call the local backend for inference and persistence. Genuine model fields are visible in case details. Operational control scores and model unusualness remain separate; legacy simulation weights do not recalculate model-backed cases. Incomplete evidence requests completion, and transport failures do not produce substitute scores. Specialist route decisions and outcomes are saved in a separate linked review ledger. See INTEGRATION.md for the request formats, limits, restart requirement and synthetic-only boundaries.
