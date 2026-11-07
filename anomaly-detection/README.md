# Madar model and decision components

All seven existing models are retained: the original SANED Isolation Forest (`saned-if-20261016-v1`,2,400 training histories,100 trees), five additional journey-specific Isolation Forests and the maternity-enabled connected Random Forest (`madar-cross-journey-rf-20261107-v4`). This update does not retrain them or change their native inference.

## Shared decision and explainability

`lib/hybrid-policy.mjs` combines55% supplied control score,45% raw model AI score ×100 and approved adjustment points. Application scores are rounded and capped0–100, with critical-control protection and model/comparator review safeguards. Native score, rank, flags and features remain saved in `modelResult`; `caseData.score` is the review-priority score. This prototype formula is not a calibrated probability or a validated comparison across model families.

The explainability layer saves component contributions, reason codes, source evidence, field-quality confidence and the recommended route with ownership. Confidence describes the supplied evidence, not certainty of fraud. Rule-only cases retain their control result and do not acquire invented AI scores. Existing business-rule simulation settings remain separate from the shared hybrid policy.

Approved catalog entries require an exact journey and model-version scope, approval metadata, bounded points and matching conditions over supplied model evidence. The current approved catalog is empty, so no adjustment points apply. Uploaded values, candidate indicators and approved reference scenarios cannot deploy a scoring adjustment.

Cross-journey event intake accepts separate control context through `existingControlScore` or a per-case `existing_control_score` CSV column. Missing controls leave model evidence visible while the hybrid decision is Incomplete. Controls never become model features. Different controls version the decision; identical evidence, controls and policy deduplicate. Demo batches supply explicit fictional control context independently of model results.

## Runtime and checks

From the repository root, use `npm test` and `npm start`. Node22.13+ loads saved artifacts for inference; no external AI service is needed for model inference. Existing offline training remains available to the model owner, with pinned Python requirements for SANED/connected models and a JavaScript trainer for the other journey models. Training is not part of this layer update.

All evaluation remains synthetic-development evidence. See `data/evaluation.json`, `data/journey-models.json` and `cross-journey/data/evaluation.json` for native model limitations. Individual detector evaluation does not validate the hybrid score. Tests preserve Python/JavaScript inference parity, native score invariants, approval gating, source completeness, control-context versioning, review history, ownership and model/policy migration.

Runtime records use `ASSESSMENT_DATA_DIR` (launcher default `.madar-data/`). The single-process JSON store is a prototype persistence mechanism. Specialist decisions, financial outcomes and model evidence remain distinct records; Madar does not execute payment or violation actions.

## Case assistant

Explain this case and its separate question popup use cited, saved evidence. Executive narrative describes case events, amounts, recorded status, recommendations and required verification without repeating environment or data-origin labels. Provenance stays saved internally. The assistant cannot change scores, decisions or routes, and cannot describe a recorded status as an executed action. Prompt-version changes invalidate cached briefs.

See root `SCORING_METHODOLOGY.md`, `TECHNICAL_BLUEPRINT.md` and `INTEGRATION.md` for policy and interface details.
