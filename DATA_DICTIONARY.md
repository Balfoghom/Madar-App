# Prototype Data Dictionary

Journey-specific candidate fields and derived indicators are documented in [`anomaly-detection/JOURNEY_FEATURES.md`](anomaly-detection/JOURNEY_FEATURES.md). Those definitions are proposals for synthetic prototyping and require approval by the relevant data and service owners.

The application uses synthetic data. Production field names, identifiers, purpose, retention, and access must be approved by the accountable data owners.

## Case and entity context

| Field | Meaning |
| --- | --- |
| `transaction_id` | Synthetic transaction/request identifier |
| `journey` | Service journey, such as SANED, benefit payment, retirement, maternity, employer registration, or contribution and wage |
| `scenario` | Human-readable case scenario |
| `subject_id` | Masked synthetic contributor/beneficiary/employer reference |
| `related_entity` | Related employer, IBAN, supervisor, payroll or other entity reference |
| `region`, `city`, `country` | Geographic context; geography does not increase risk by itself |
| `customer_name`, `national_id_masked`, `mobile_masked` | Synthetic identity context for the specialist workspace |
| `employer_name`, `employer_number` | Synthetic employer context |
| `supervisor_name`, `supervisor_user_id`, `supervisor_mobile_masked` | Synthetic operator/supervisor context |

## Assessment inputs

| Field | Meaning |
| --- | --- |
| `existing_control_score` | 0–100 result supplied by approved existing rules |
| `events_in_window` | Count of relevant events within the assessment window |
| `linked_entities` | Number of relevant linked entities |
| `prior_risk_score` | Context from validated prior outcomes |
| `retroactive_days` | Extent of relevant retroactive change |
| `identifier_reuse_count` | Reuse of an IBAN, mobile, device or approved identifier |
| `amount_salary_change_pct` | Material amount or salary change percentage |
| `rule_overrides` | Relevant overrides in the assessment window |
| `cross_source_conflict` | Explicit inconsistency between approved sources |
| `material_data_gap` | Missing information required for a reliable assessment |
| `urgent_priority` | Operational priority; changes priority, not risk |
| `journeyFeatures.requests30d` | Benefit Payments only: synthetic request/payment count in the last 30 days |
| `journeyFeatures.amountDeviationPct` | Benefit Payments only: percentage deviation from recent synthetic benefit history |
| `journeyFeatures.payoutAccountChangeDays` | Benefit Payments only: days since payout account change; raw account details are not collected |
| `journeyFeatures.duplicatePayments` | Benefit Payments only: synthetic count of duplicate or similar payments |
| `journeyFeatures.sharedBeneficiaries` | Benefit Payments only: aggregate synthetic count of beneficiaries associated with the same payout account; raw account details are not collected |
| `journeyFeatures.amendments30d` | Employer Registration only: synthetic count of material registry amendments in 30 days |
| `journeyFeatures.companyAgeAtChangeDays` | Employer Registration only: company age when a material change was recorded, in days |
| `journeyFeatures.linkedContactEmployers` | Employer Registration only: aggregate count of employers linked through a pseudonymous contact reference |
| `journeyFeatures.workforceChangePct` | Employer Registration only: percentage change in workforce |
| `journeyFeatures.backdatedChanges90d` | Employer Registration only: count of backdated registry changes in 90 days |
| `journeyFeatures.sourceConflicts` | Employer Registration only: aggregate count of conflicting source fields |
| `journeyFeatures.contributionMonths` | Retirement only: verified contribution months in the synthetic case |
| `journeyFeatures.gapMonths` | Retirement only: contribution gap months |
| `journeyFeatures.wageChangePct` | Retirement or Maternity Benefit: synthetic wage percentage change in the relevant pre-request window |
| `journeyFeatures.retroCorrections12m` | Retirement or Maternity Benefit: retroactive contribution corrections in 12 months |
| `journeyFeatures.overlapPeriods` | Retirement only: overlapping employment periods |
| `journeyFeatures.overlapMonths` | Retirement only: months overlapping across employment records |
| `journeyFeatures.contributionMonthsInWindow` | Maternity Benefit only: contribution months in a candidate eligibility window |
| `journeyFeatures.daysEventToRequest` | Maternity Benefit only: days between a synthetic qualifying event and request |
| `journeyFeatures.employerTenureDays` | Maternity Benefit only: employer tenure in days at the qualifying event |
| `journeyFeatures.concurrentClaims` | Maternity Benefit only: aggregate concurrent similar benefit claims |
| `journeyFeatures.materialWageChangeWorkersPct` | Contribution & Wage only: share of workers with material wage changes, percent |
| `journeyFeatures.medianWageChangePct` | Contribution & Wage only: median wage change, percent |
| `journeyFeatures.payrollDelayDays` | Contribution & Wage only: payroll file delay in days |
| `journeyFeatures.resubmissions30d` | Contribution & Wage only: payroll file resubmissions in 30 days |
| `journeyFeatures.retroCorrections90d` | Contribution & Wage only: retroactive payroll corrections in 90 days |
| `journeyFeatures.workersAcrossEmployers` | Contribution & Wage only: aggregate workers linked across synthetic employers |
| `journeyFeatures.reconciliationDeviationPct` | Contribution & Wage only: percentage deviation between source totals |

## Financial and timing context

| Field | Meaning |
| --- | --- |
| `transaction_amount` | Amount associated with the transaction or request |
| `currency` | Prototype currency, normally SAR |
| `amount_at_risk` | Potential exposure requiring verification; not a confirmed loss |
| `detection_stage` | Before payment or after payment |
| `payment_status` | Pending, held, paid, prevented, partially prevented, or other approved status |

## Human outcome and benefit realization

| Field | Meaning |
| --- | --- |
| `specialist_classification` | Legitimate, data/process error, suspected fraud, confirmed violation, inconclusive, or formally confirmed fraud |
| `financial_outcome` | Proceeded, prevented before payment, paid/post-payment detection, partially prevented, or no impact |
| `confirmed_fraud_amount` | Amount formally established through the approved outcome process |
| `prevented_amount` | Amount verified as prevented before payment or partially prevented |
| `decision_date` | Date of the authorized specialist decision |
| `decision_owner` | Authorized role or owner recording the decision |

## Derived outputs

| Output | Meaning |
| --- | --- |
| Behavioral Anomaly Score | 0–100 transparent prototype anomaly result |
| Behavioral Risk Score | Combined existing-control, anomaly and approved interaction result |
| Risk band | Low, Medium or High based on approved prototype thresholds |
| Assessment confidence | Separate measure of data sufficiency and consistency |
| Reason codes | Traceable rules, indicators, and evidence affecting the assessment |
| Recommended route | Advisory next step; the specialist retains the final decision |

