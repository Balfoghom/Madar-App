# ServiceNow PDI build pack

This pack mirrors the GOSI Adaptive Behavioral Intelligence prototype using synthetic data only. It demonstrates an enterprise multi-journey behavioral-risk workspace; SANED is one use case and remains a candidate for the first measured Proof of Value. The CSV pack is a representative 15-case ServiceNow subset; the standalone web prototype contains the expanded 60-case dataset and saved synthetic model training evidence for all six journeys. Browser-based CSV intake is not included in the web prototype.

## Scoped application

- Name: `GOSI Adaptive Behavioral Intelligence`
- Scope suggestion: `x_gosi_abi`

## Tables

1. `Behavioral Risk Case` - cross-service case, scoring, recommendation, and human decision record.
2. `Behavioral Event` - timeline of rule triggers and contextual events related to a case.
3. `Risk Indicator` - governed indicator catalogue and prototype weights.

Import `table_definitions.csv` as the build dictionary, then import the three synthetic data files into their matching tables.

## Roles

- `x_gosi_abi.fraud_specialist`
- `x_gosi_abi.fraud_supervisor`

## Minimum interface

The case list should show Case ID, Journey, Subject, Related Entity, Overall Risk Score, Risk Level, Main Reason, Recommended Action, and Status. The case form should include related Behavioral Events and the specialist decision fields.

## Important limitation

The PDI is used for the interface and workflow. The prototype anomaly calculation runs in the standalone app because ServiceNow PDIs do not support Machine Learning. Production use, real PII, automatic adverse decisions, and live-system integration are outside this prototype.
