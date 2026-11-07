# SANED anomaly detection and hybrid review

The current SANED engine is a custom Isolation Forest implemented and trained in JavaScript on **96 fully synthetic SANED behavioral histories**, using **80 isolation trees**. Saved artifact `data/model.json` is loaded for inference; reviews do not retrain the model. No external AI service is needed for this detector.

## Decision flow

1. Validate synthetic history and derive six behavioral features: claimant amendment count, maximum backdating, amendment recency, wage change, employer exclusion rate and supervisor change rate. Missing required evidence causes abstention.
2. Traverse the 80 trees and calculate the multivariate Isolation Forest anomaly score and a separate calibration percentile.
3. Apply the hybrid policy: `round(0.55 × existing control score + 0.45 × anomaly score × 100 + approved adjustments)`, capped at 0–100. An existing control score ≥ 80 retains a minimum review score of 75. Model/comparator flags can require Medium review even when the combined score is Low. Source conflicts and missing critical evidence route to verification.
4. Record reason codes, score contributions, supporting source evidence, field-quality confidence and a recommended review route. Confidence describes completeness/basic validity, not statistical certainty or fraud probability. Authorized specialists retain the final decision.

Only entries in `data/approved-behavioral-patterns.json` with Approved status, approval metadata, bounded points and matching evidence conditions can adjust the score. The catalog currently contains no approved entries, so adjustments are zero. Uploaded context, candidate indicators and reference-scenario approval cannot deploy scoring changes.

## Training and verification

From the repository root:

```sh
npm run train:saned
npm test
npm start
```

Training is reproducible from fixed seeds. `data/saned-training-records.json` contains the exact 96 source histories. Calibration uses 800 separate synthetic legitimate histories; holdout uses 600 separate histories (300 provisional review, 300 legitimate), with disjoint identifiers and independent seeds. IDs, scenario labels and outcomes are excluded from features. The former Python SANED trainer is disabled; connected-model Python training remains separate.

| Synthetic holdout method | Review cases found /300 | Missed | Legitimate flagged /300 |
|---|---:|---:|---:|
| Provisional comparator rules |200|100|23|
| Custom Isolation Forest |101|199|26|
| Rules OR Isolation Forest |300|0|29|

The forest finds 100/100 designed coordinated cases that the comparator rules miss, but misses99/100 retroactive cases and 100/100 wage cases. Rules catch those designed cases. It also flags 26/60 legitimate surge histories. These failures are retained in `data/evaluation.json`. Combined detector recall is not accuracy of the hybrid score, and these generator results do not establish production fraud detection, fairness, savings or workload.

Tests verify the 96-history/80-tree lineage by reproducing training, score/path normalization, held-out artifact consistency, input validation, label/outcome independence, future-event exclusion, hybrid arithmetic and critical-control protection, approval gating, evidence-quality explanations, review persistence and model migration.

## Other capabilities

Five additional journey Isolation Forests and the connected Random Forest retain their existing policies. Maternity connected-event intake remains supported. The seven models appear in `GET /journey-models`. Optional LLM explanations use saved evidence and never alter scores or routes.

See `INTEGRATION.md` for API contracts and the root `SCORING_METHODOLOGY.md` for application scoring. Raw response `score` and `modelResult.score` remain the model output; `caseData.score` is the SANED hybrid review score. Runtime records are saved under `ASSESSMENT_DATA_DIR` (launcher default `.madar-data/`). The prototype does not execute benefit, payment or violation actions.
