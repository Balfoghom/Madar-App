# Madar cross-journey detection proof

**Status:** working synthetic proof. Haitham confirmed the business relevance of the cross-journey pattern. Exact model labels, thresholds, and production performance remain prototype Data & AI assumptions. This component does not replace the SANED Isolation Forest in the sibling directory.

## Role in Madar

Cross-journey detection is an example capability feeding the shared fraud operations workflow. Madar’s proposed enterprise value is connecting existing capabilities to case ownership, explanation, investigation, outcomes and governance; this detector is not presented as a new enterprise capability.

## What this proves

The model connects events through the same synthetic employer and contributors across:

1. Employer Registration
2. Contribution & Wage
3. SANED or Maternity Benefit
4. Digital Access, Account Maintenance and Benefit Payments where supplied

The main proof case contains three contributors who follow a registration → wage change → retroactive exclusion → SANED request sequence. Each individual signal remains below the included comparator-rule thresholds. The trained cross-journey model recommends specialist review.

The result is calculated from the event history. It is not hardcoded to the case ID or scenario name. Case IDs, family names, split names, expected outcomes, and explanations are excluded from model features.

## Model design

The SANED model in the parent directory remains an unsupervised Isolation Forest for novel behavior. The cross-journey component is a supervised Random Forest trained on provisional synthetic scenario labels.

This design is deliberate. A broad Isolation Forest was tested first, but legitimate high-volume activity was more globally unusual than the coordinated below-threshold sequence. A supervised pattern model is more suitable for proving detection of a specific business typology. Haitham confirmed the typology; Data & AI validation is still required before the fitted threshold or metrics can be treated as production evidence.

The model uses 25 derived features, including journey count, event volume, linked contributors, registration/wage/exclusion/SANED/maternity counts, wage and retroactivity values, identifier reuse, conflicts, overrides, and the count and timing of completed cross-journey sequences.

The model score measures similarity to the provisional synthetic review patterns. It is not a fraud probability.

## Data and evaluation

- Training: 13,300 synthetic connected histories
- Calibration: 2,000 separate routine or legitimate histories
- Test: 1,800 separate histories
- Test population: 900 routine/legitimate and 900 provisional review cases
- Model: 180-tree Random Forest
- Model version: `madar-cross-journey-rf-20261107-v4`

| Method | Review cases found | Missed | Legitimate cases flagged | Accuracy |
|---|---:|---:|---:|---:|
| Provisional rules | 250 / 900 | 650 | 0 / 900 | 63.9% |
| Cross-journey model | 900 / 900 | 0 | 7 / 900 | 99.6% |
| Rules OR model | 900 / 900 | 0 | 7 / 900 | 99.6% |

The key proof family contains 150 coordinated-sequence test cases. The model flags all 150 while the comparator rules flag none. These results are against the same synthetic generator families used to design training data. They do not establish production fraud accuracy, savings, fairness, or generalisation to real GOSI activity.

The false alarms are retained by scenario in `data/evaluation.json` and should be discussed as specialist review workload. Legitimate calibration families are balanced by choosing the maximum per-family 97th percentile. Held-out false alarms remain visible as review workload.

## Files for Manal

- `inference/detector.mjs`: direct JavaScript inference
- `data/model.json`: exported fitted model
- `data/demo-cases.json`: complete linked histories
- `data/cross-journey-demo-events.csv`: self-contained event-level Data Intake upload, including assessment time
- `data/cross-journey-demo-cases.csv`: case-level labels and validation status
- `data/evaluation.json`: evaluation summary
- `examples/demo-results.json`: real output examples
- `INTEGRATION.md`: integration contract

The two CSV files are designed for this cross-journey proof. Haitham's original 20-case CSV remains unchanged and can continue to demonstrate the existing multi-journey interface.

## Run

Requires Node 22.13 or newer. In this directory:

```sh
npm test
npm run demo
npm start
```

The server starts at `http://127.0.0.1:8788`. Opening the root address shows the available endpoints.

Assess the coordinated proof case:

```sh
curl -X POST http://127.0.0.1:8788/assess \
  -H 'Content-Type: application/json' \
  -d '{"case_id":"CJ-SYN-demo-00001"}'
```

Inference has no npm dependencies. Retraining requires the pinned Python packages in `requirements-training.txt`.

## Boundaries

- Synthetic data only
- No connection to live GOSI systems
- No automatic fraud confirmation or adverse action
- Missing linked evidence causes abstention
- Human specialist owns the case route
- The standalone detector does not store outcomes; the integrated Madar application stores specialist decisions and outcomes.
- No automatic conversion of a reviewed case into a rule or automatic retraining
- Cross-journey business pattern confirmed for the synthetic prototype
- Exact model threshold and production performance remain unvalidated

Any feedback loop must store authorized outcomes, accumulate evidence, propose a candidate rule or model version, evaluate it offline, and obtain governance approval before activation.

## Digital-account extension (November 7)

Version 3 adds Digital Access and Account Maintenance events before benefit requests: verified login location changes, payment-account changes and profile updates. Seven additional inputs capture event counts, distinct verified locations, same-contributor travel speed, ordered login → profile → IBAN → request sequences within 24 hours, and payment-account-change recency. Coordinates never identify a real person; all identifiers and coordinates belong to generated examples. Unverified location events do not contribute travel speed.

The model is retrained offline, not a renamed business rule. Three new suspicious families (account-takeover-like sequence, coordinated shared-IBAN changes, repeated profile/payment-account updates) and three legitimate families (routine digital access, plausible travel, legitimate account updates) are included across disjoint training/calibration/test entity namespaces. The new digital scenarios require specialist validation; confirmation of the original employment typology does not validate them. Synthetic financial context does not feed the classifier. A model review recommendation does not confirm fraud or automatically stop payment.

The comparator rules are unchanged to preserve an explicit ML-only demonstration. Twelve bundled examples include the original six histories and six digital histories. Event CSV columns now support `latitude`, `longitude`, `location_verified`, `previous_identifier_id`, and `changed_field`. Login coordinates must be bounded numbers; IBAN changes require distinct synthetic previous/new account identifiers; profile fields use mobile/email/address/identity.


## Maternity intake extension

Version 4 accepts maternity requests without requiring a SANED claim. It adds maternity-request count and contributor-level registration → wage → maternity chains, and generalizes digital request sequences to both terminal services. Existing SANED features and comparator rules retain their meaning. Maternity is not itself a risk indicator: training, calibration and holdout include routine histories and legitimate account changes. Three provisional review families cover coordinated wage histories, shared-account digital sequences and conflicting retroactive source records. These new typologies need business validation.

`data/maternity-intake-cases.json` is a reproducible separate six-case intake batch (three review examples, two legitimate and one incomplete). It never enters the automatic 77-case baseline. Uploading it appends new cases; stable IDs prevent duplicates on retry. Curated baseline histories remain unchanged by retraining. Python/JavaScript parity checks cover both services, and malformed links abstain. Training is reproducible with the pinned requirements and `python training/train.py`.
