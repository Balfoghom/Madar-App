# AI Solution Design

## 1. Objective

The solution supports proactive external-fraud risk assessment by assembling authorized events across a customer, beneficiary, employer, payment, and service journey. It does not automate fraud determination. It prioritizes cases, explains the contributing evidence, and recommends a proportionate route for human decision.

## 2. Current prototype components

### A. Behavioral Anomaly Detection

**Current implementation:** transparent unsupervised calculation in `dist/app.js`.

For each numeric feature, the prototype measures positive deviation from the 60-case synthetic baseline using the median and median absolute deviation (MAD). Deviations are capped and multiplied by configurable feature contributions. A verified cross-source conflict contributes only when explicitly present.

**Output:** Behavioral Anomaly Score from 0 to 100.

**Production target:** a versioned anomaly-model service trained and validated on approved historical behavioral events, with monitoring for quality, drift, fairness, and performance.

### B. Hybrid Decisioning Engine

**Current implementation:** deterministic explainable calculation in `dist/app.js`.

```text
Behavioral Risk Score =
55% Existing Control Score
+ 45% Behavioral Anomaly Score
+ Approved Combined-Pattern Adjustment
```

The score is mapped to Low, Medium, or High. Missing required information reduces confidence and routes the case to data verification rather than silently treating missingness as evidence of fraud.

**Production target:** an internal decisioning service with domain-owned configurations, version control, approval workflow, full audit history, and rollback.

### C. AI Case Summary

**Current implementation:** controlled bilingual evidence-to-text templates. The summary uses only the structured evidence already visible in the case and never labels a person as fraudulent.

**Production target:** GOSI Brain or another approved internal LLM endpoint. Retrieval and prompting must be restricted to the authorized case, reason codes, event timeline, and policy context. The response must remain advisory, attributable, logged, and subject to human review.

### D. New Risk Indicator Suggestions

**Current implementation:** prototype suggestions demonstrate the governance workflow and are not learned or activated automatically.

**Production target:** periodic analytics over validated outcomes to identify recurring event combinations, emerging patterns, or control gaps. Every proposal follows:

```text
AI suggestion → Specialist review → Data & AI validation → Approval → Activation → Monitoring
```

## 3. Current processing flow

1. Load one of the 60 built-in synthetic cases or enter a synthetic assessment manually.
2. Validate required fields and normalize the input.
3. Calculate behavioral anomaly signals with the saved model for the selected journey.
4. Combine anomaly output with the existing-control score and approved interaction logic.
5. Generate risk band, confidence, reason codes, and recommended route.
6. Present the complete case context to the specialist.
7. Record the specialist classification and verified financial outcome.
8. Recalculate executive and monthly business-owner metrics from the current session.

## 4. Target internal architecture

| Layer | Responsibility | Suggested internal implementation |
| --- | --- | --- |
| Source systems | Existing rules, requests, profile, employer, payment, WPS and outcome events | Approved APIs or event streams |
| Integration | Schema validation, event correlation, identity resolution | Internal integration/API platform |
| Behavioral store | Authorized historical event sequence and reusable features | Governed internal data platform |
| Anomaly service | Model inference, version, confidence and monitoring | Data & AI model-serving platform |
| Decision service | Domain weights, thresholds, reason codes and routes | Internal API with governed configuration |
| LLM service | Case summary and controlled indicator proposals | GOSI Brain/approved internal LLM |
| Specialist workspace | Queue, explanation, review, override and outcomes | Existing UI adapted for internal hosting |
| Reporting | Operational, executive and benefit-realization views | Internal reporting/BI integration |

## 5. API contracts recommended for the next phase

- `POST /api/v1/assessments` — submit a case and approved events; return component scores, combined assessment, confidence, reason codes, model versions, and route.
- `GET /api/v1/cases/{caseId}` — retrieve the authorized case, timeline, explanations, and audit history.
- `POST /api/v1/cases/{caseId}/decisions` — record specialist approval, override, classification, evidence note, and financial outcome.
- `POST /api/v1/cases/{caseId}/summary` — request an approved internal LLM summary from structured evidence.
- `GET /api/v1/indicators` — retrieve active and proposed indicators by domain and version.
- `POST /api/v1/indicator-proposals` — submit a proposal into the governed review workflow; never activate it directly.
- `GET /api/v1/reports/monthly` — produce reconciled management metrics using verified outcomes and payment status.

## 6. Human and governance boundaries

The AI may calculate an assessment, summarize evidence, recommend a route, and propose an indicator. It may not independently confirm fraud, prove intent, stop or reject payment, change eligibility, activate an indicator, change a production weight, access unapproved data, or send information outside approved internal services.

## 7. Evidence required before production

- Confirmed business owner and domain decision rights.
- Approved data purpose, fields, retention, access, and masking rules.
- Historical outcome quality and fraud/error classification standard.
- Back-testing and shadow testing against agreed baselines.
- Precision, recall where measurable, false-positive rate, review effort, customer impact, and fairness assessment.
- Security architecture, threat model, penetration testing, logging, monitoring, recovery, and rollback.
- Operational SLA for any future temporary hold, specialist action, release, and escalation.

