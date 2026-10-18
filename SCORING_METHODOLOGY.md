# GOSI Adaptive Behavioral Intelligence — Prototype Scoring Methodology

## Purpose

The prototype produces an explainable **Behavioral Risk Assessment** for prioritization and proportionate review. It does not produce an AI Fraud Score, prove intent, determine eligibility, or authorize an adverse action.

## Inputs

- Existing control score from approved source rules, from 0 to 100.
- Behavioral features: event velocity, retroactive changes, linked-entity volume, prior validated outcomes, overrides, identifier reuse, source conflict, and material amount or salary change.
- Data-quality signals, including missing required information.
- Approved combined-pattern conditions.

## Behavioral anomaly score

For every numeric feature, the prototype calculates positive deviation from the 60-case synthetic baseline using the median and median absolute deviation (MAD). Each deviation is capped and multiplied by a transparent prototype contribution. A cross-source conflict contributes only when explicitly present.

The result is a 0–100 Behavioral Anomaly Score. It may be above or below the Existing Control Score. A higher anomaly may strengthen a distributed-rule signal; a lower anomaly may moderate it. Both values remain visible to the specialist.

This unsupervised method demonstrates technical behavior without requiring fraud labels. It does not claim real-world detection performance.

## Combined assessment

**Behavioral Risk Score = 55% Existing Control Score + 45% Behavioral Anomaly Score + Approved Combined-Pattern Adjustment**

Prototype bands:

- Low: 0–34 — accelerated or straight-through processing recommendation.
- Medium: 35–74 — targeted journey-specific verification.
- High: 75–100 — fraud prevention, inspection, or investigation review.

Guardrails:

- An approved critical control score of 80 or above establishes a minimum High-review floor in this simulation.
- Missing required information does not silently raise fraud risk; it lowers Assessment Confidence and routes the case to Data Verification Review.
- Operational urgency changes priority, not risk.
- Location outside Saudi Arabia does not contribute to risk by itself. It contributes only when combined with verified conflicting or implausible event evidence.

Weights, floors, interactions, and thresholds are prototype assumptions. The Scoring Simulation Lab may be used to test alternatives against sandbox data, but it does not change source rules or activate a production configuration. Production use requires historical validation, authorized domain ownership, Data & AI validation, and GM approval within the applicable delegation of authority.

## Assessment confidence

Risk and confidence are separate:

- **High confidence:** sufficient, consistent information is available.
- **Medium confidence:** conflicting evidence or limited context requires verification.
- **Low confidence:** required information is missing or insufficient; the recommendation cannot be relied upon without human review.

## Explainability and audit

Every assessment retains:

- Existing Control Score;
- Behavioral Anomaly Score;
- Combined-Pattern Adjustment;
- Behavioral Risk Score and band;
- Assessment Confidence;
- reason codes and evidence timeline;
- model version and source;
- recommended route; and
- specialist approval, override, evidence note, and final outcome.

## Indicator governance

**AI suggestion → Specialist review → Data & AI validation → GM approval → Activation → Monitoring**

Material, cross-domain, or adverse-action changes may require escalation above the GM according to the applicable delegation of authority.

The AI cannot activate a proposed indicator, change a production weight, or execute an adverse action. Validated outcomes may inform future proposals, but all material changes remain domain-owned and auditable.
