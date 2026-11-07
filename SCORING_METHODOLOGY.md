# Madar — decision and explanation methodology

The shared decision layer consumes existing model outputs; it does not retrain or replace the models. SANED uses its original `saned-if-20261016-v1` Isolation Forest (2,400 training histories,100 trees). Five additional journey-specific Isolation Forests and the maternity-enabled cross-journey Random Forest remain unchanged.

## Shared hybrid decision engine

`hybrid-review-55-45-v2` computes `round(0.55 × existing control score + 0.45 × raw AI model score ×100 + approved adjustment points)`, capped at0–100. The calibration percentile is retained as reference evidence and is never blended. These are prototype review-priority values, not fraud probabilities or validated comparisons across model families.

Low is0–34, Medium35–74 and High75–100. A control score≥80 retains a75-point minimum. Model/comparator flags can require at least Medium review even below the numeric threshold. Missing model evidence or control context gives an Incomplete hybrid decision; valid model evidence remains visible. Source conflicts route to verification. Account-change sequences retain cybersecurity routing unless critical existing controls require fraud-prevention escalation. Specialists approve or change the route with a recorded rationale.

Approved pattern entries require explicit journey and model-version scope, approval metadata, bounded points and matching conditions over the supplied model evidence. The current catalog is empty: zero adjustment applies. Uploaded fields, proposed indicators and activated reference examples do not deploy scoring changes.

## Explainability layer

Model-based cases show a **Hybrid review score**, original control and AI components, reason codes, supporting source evidence, field-quality confidence and a recommended review route with an accountable team. Reference-range differences are context, not causal feature attribution. Confidence measures completeness, basic validity and reported consistency of supplied evidence; it is not model certainty or probability of fraud.

Original inference scores, percentiles, flags and feature values remain available in technical evidence. Policy migration preserves specialist decisions, ownership, outcomes and historical reviews. Generic hybrid-score and missing-control reasons are excluded from repeated risk-indicator mining.

Rules-only cases retain control results and evidence quality; no AI score is fabricated. Existing business-rule scoring simulations retain their separate settings and labels. Applying simulation weights does not change the shared hybrid policy or native model inference.

## Case assistant

Explain this case and the separate question popup use saved, cited evidence. Executive-facing narrative uses operational case language without repeatedly labeling the environment or data provenance. Provenance stays in saved evidence and technical views. Recorded outcomes and amounts are described as recorded, never independently established savings or executed payment actions. The assistant cannot change a case decision, score or route.

## Model validation

All model evaluations remain synthetic-development checks and do not establish production performance. See `anomaly-detection/data/evaluation.json` and the corresponding journey/cross-journey evaluation artifacts. Evaluation of an individual detector does not validate the combined hybrid score.
