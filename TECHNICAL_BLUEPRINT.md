# GOSI Adaptive Behavioral Intelligence — Technical Blueprint

## Product position

The prototype demonstrates an enterprise multi-journey behavioral intelligence capability. It does not consolidate or replace source-system rules. It consumes approved rule results and behavioral events, links them into one explainable assessment, and recommends a proportionate route for an authorized specialist.

SANED is one demonstration journey and remains a strong candidate for the first measured Proof of Value. The shared capability is intentionally extensible to other authorized journeys.

## Prototype architecture

1. Existing source-system rule results and approved events remain in their original systems.
2. A shared event foundation links masked contributor, beneficiary, employer, payment, payroll, contact, device, and request activity.
3. Feature preparation derives reusable behavioral and contextual indicators.
4. An anomaly component compares observed activity with a robust synthetic baseline.
5. A hybrid assessment combines the existing control score, behavioral anomaly score, and approved combined-pattern adjustments.
6. The specialist workspace presents the risk band, confidence, reason codes, timeline, and recommended route.
7. An authorized specialist approves or overrides the route and records the final outcome.
8. Validated outcomes may support new indicator proposals, but no proposal or weight change activates without review, testing, and approval.

## Demonstrated journeys and scenarios

- SANED: repeated or retroactive exclusion changes and employer-wide request clusters.
- Benefit payments: IBAN ownership mismatch, identifier reuse, and conflicting session sequences.
- Employer registration: rapid registration/exclusion activity and shared supervisor relationships.
- Retirement: WPS or approved payroll evidence that conflicts with the recorded retirement status.
- Maternity benefit: material salary change or unusually short employment-benefit sequence.
- Contribution and wage: repeated salary changes, retroactive wage updates, and cross-source discrepancies.

The current dataset contains 60 fully synthetic cases across these six journeys. It includes generated evidence timelines, Saudi regional distribution, and contextual cross-border activity. Geography never increases risk by itself.

## Input and synthetic model flow

The static PoV supports 60 built-in synthetic cases and a manual synthetic assessment form. File and pasted-CSV intake have been removed.

All six service journeys have synthetic-only Isolation Forest models. Model metadata, generated training and calibration counts, holdout size, and synthetic evaluation summaries are available from the backend's `/journey-models` endpoint. SANED retains its Python training pipeline. The other five journeys are regenerated with `npm run train:journeys` from `anomaly-detection`; their artifacts are saved in `anomaly-detection/data/journey-models.json` and loaded by the backend.

The prototype's Data Intake page accepts CSV uploads or pasted CSV rows for browser-session assessment; it does not persist those imports as training data. The production target would use approved APIs or event streams, with separate validation of real-time operation, latency, integration, ownership, security, and recovery controls. The PoV does not train from specialist outcomes.

## AI agent boundary

The Behavioral Risk Decision-Support Agent may read approved sandbox inputs, calculate anomaly and combined assessments, generate reason codes, recommend a route, record a human decision, and propose an indicator for review.

It may not modify source rules, activate indicators, confirm fraud, stop or reject a payment, make an adverse eligibility decision, access unapproved data, or send data to an external party.

Human approval is required for high-risk routing, overrides, adverse-action recommendations, final outcomes, and all changes to indicators, weights, or thresholds. Model changes follow specialist review, Data & AI validation, and GM approval before activation; changes outside the GM's delegated authority are escalated through the applicable approval structure.

The prototype includes a sandbox-only Scoring Simulation Lab. Users can vary the existing-control/AI-anomaly mix, interaction contribution, risk thresholds, and approved indicator contributions; compare the resulting risk-band distribution; reset to defaults; and submit a configuration for governed review. No simulation changes an operational source rule or activates a production model.

## Prototype boundaries

- No live GOSI integration or real personal data.
- No automatic payment hold, rejection, eligibility decision, fraud confirmation, or inspection order.
- No source-system rule modification or enterprise rule migration.
- No claim of real-world accuracy, prevented loss, or operational benefit from synthetic results.
- No production authorization, retention model, monitoring, or security accreditation.

## Validation path

Production consideration requires confirmation of permitted data use, accountable ownership, existing capabilities, historical outcomes, data quality, architecture, security and privacy controls, fairness, performance, shadow-mode results, monitoring, rollback, and domain-approved thresholds.
