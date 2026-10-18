# Integration contract verification — 2026-10-17

Scope: apply INTEGRATION.md to the existing app using HTTP inference. No new page, no retraining, and no model artifact changes.

| Contract requirement | Implementation | Evidence |
|---|---|---|
| Genuine inference, original fields and model version | New Assessment and CSV call the backend; case details render the saved model snapshot | contract.test.mjs compares modelVersion, score, percentile, modelFlagged, ruleFlagged, complete and features with direct SANED inference |
| Operational controls separate | assessment-adapter.mjs keeps ruleScore separate from raw model score and unusualness | Same evidence with control score 20 versus 90 produces unchanged raw model output |
| No uncalibrated average | Model-backed cases bypass legacy frontend reassessment; policy uses a separate review gate | Contract test and headless UI exercise |
| Missing evidence abstains | score unavailable, percentile null, risk Incomplete, route Complete evidence | Contract and existing model tests; UI missing case |
| Human decisions separate | Append-only human-reviews.json links assessmentId; model snapshot retained | Outcome/approve/override/reject/reassessment and stale-review test |
| Accurate labels | Raw score and unusualness percentile; confidence Not calibrated | Existing details panel displays all fields; legacy examples labelled |
| Synthetic only | Explicit synthetic declaration and ID/schema checks; raw evidence inference at backend | Non-synthetic rejected; unknown supplied IDs rejected |
| Local prototype boundaries | Loopback server; local JSON persistence; no production authentication claimed | INTEGRATION.md and existing runtime binding |
| Proposals remain governed | Generation retains Proposed; existing human workflow; no outcomes change models or rules | Existing scenario workflow tests and unchanged training artifacts |

## Verification performed

- `node --check dist/app.js` and `node --check anomaly-detection/server.mjs` succeeded.
- `node --test anomaly-detection/tests/*.test.mjs`: 14 passed.
- Headless DOM exercise used the real app HTML/JS with an isolated backend: boot, CSV model inference, raw output rendering, missing evidence, manual SANED assessment, reassessment preservation, CSV and manual service-unavailable handling all passed.
- The five protected model/training file SHA-256 hashes match their before-change copies. No training command was run.
- Live `/health` returned contractVersion `integration-v0.2-separated`, modelVersion `saned-if-20261016-v1`, syntheticOnly true.

## Boundaries

Other journeys load the already-existing artifacts only; their comparator-rule field is explicitly not applicable. They have not been trained or validated by this integration. Synthetic metrics are not real-world performance. Summaries are deterministic evidence summaries, not an LLM. Governance role selection remains a local demo, not authenticated authorization. JSON persistence is not a production transactional database. No institution systems or sensitive data were connected.

The bundled reference CSV is `examples/synthetic-model-evidence.csv`; the existing Data Intake page can also download an evidence template. CSV uploads run inference; they do not train a model.
