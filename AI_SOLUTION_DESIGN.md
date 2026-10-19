# Madar | مدار — solution design

## Business purpose

Madar proposes one operating layer for the fraud business team across existing detection capabilities. Findings become owned cases with source evidence, explanation, investigation steps, specialist decisions, recorded outcomes and a governed improvement process. Cross-journey detection can already exist in the enterprise; it is an input to this process, not the central innovation claim.

The intended value is less time assembling evidence and writing case summaries, more consistent investigation, clearer accountability and better measurement of confirmed outcomes and verified financial interventions. These are hypotheses to evaluate, not measured results of this prototype.

## Enterprise end state

1. Connect existing fraud use cases, controls and models through a common finding contract. Preserve source, model or rule version, source timestamps and evidence identifiers.
2. Deduplicate and relate findings into cases. Assign accountable owners and service-level expectations.
3. Prepare an evidence-grounded LLM brief: what was observed, why the originating capability flagged it, what is missing and what the specialist should check.
4. Investigate with controlled access, work notes, evidence requests and explicit decision authority.
5. Record specialist conclusions separately from detector signals. Integrate authorized violation issuance and intervention processes, rather than treating a model flag as a finding of fraud.
6. Reconcile outcomes and amounts with the relevant systems. Measure elapsed specialist effort, useful findings, false positives, confirmed cases, issued violations and verified prevented/recovered amounts.
7. Aggregate feedback into candidate indicators and model improvements. Validate, approve, version and monitor changes before deployment.

## Implemented prototype

- English Madar / مدار workspace opens on Fraud Operations.
- Seven bundled synthetic models supply cases: six journey-specific Isolation Forest models and one connected-journey Random Forest.
- CSV/manual synthetic intake, calculated model evidence and a shared case queue.
- Named ownership and staged work: New → Triage → Investigation → Decision pending → Closed. Adjacent transitions and a resolved outcome before closure are enforced server-side.
- Named human routing decisions, outcomes, financial consistency checks, assessment-version checks and persisted local review history.
- Optional OpenAI Responses API explanation adapter. It sends a minimal evidence packet, validates the response structure and evidence IDs, caches by assessment/evidence/model, and displays an unreviewed draft. It never changes the detector or case decision.
- Indicator suggestions and example scenario-governance stages. They do not activate a production rule or retrain a model.
- Assessed cases and illustrative legacy portfolio are separate reporting scopes.

## Evidence and boundaries

All supplied examples are synthetic. Anomaly scores, pattern similarity and calibration percentiles are not fraud probabilities. The current connected model’s synthetic holdout has 300 true positives, 18 false positives, no false negatives and 382 true negatives; this is not evidence of enterprise performance.

The prototype records outcomes; it does not formally issue violations, block payments or verify recovered money. A zero recorded amount is not proof that there was no exposure. Missing transaction values remain “Not supplied.” The app has no measured specialist-effort saving or detection uplift.

The LLM is an advisory assistant. Valid evidence citations do not guarantee that the generated interpretation is correct. Specialist review and provider-specific validation remain necessary.

## Validation before an enterprise pilot

Agree the common finding contract and case ownership rules with the business team. Connect a small, approved set of existing capabilities. Use authorized retrospective cases to compare review effort, explanation quality, false positives, missed findings and outcome traceability against the current process. Establish a baseline and an evaluation protocol before claiming improvement. Add enterprise identity, role enforcement, database transactions, audit integrity and retention controls before operational use.
