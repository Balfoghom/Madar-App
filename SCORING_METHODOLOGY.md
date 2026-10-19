# Madar — assessment methodology

The interface contains three different assessment modes. Their numbers must not be combined or presented as one probability of fraud.

| Mode | Meaning | How it affects the case |
|---|---|---|
| Six journey-specific fitted models | Isolation Forest anomaly score and rank against synthetic reference data | Model/comparator flags can require review; the supplied operational control score remains separate |
| Connected-journey fitted model | Random Forest similarity to provisional synthetic review patterns | A model or comparator-rule flag recommends specialist review; missing evidence causes abstention |
| Illustrative legacy portfolio | Median/MAD statistical demonstration with configurable weighted control and pattern adjustments | Browser sandbox only; never changes the fitted-model policy or retrains a model |

## Fitted journey routing

The prototype operational-control bands are Low 0–34, Medium 35–74 and High 75–100. Missing required model evidence yields Incomplete. A model flag, comparator flag or supplied cross-source conflict raises a Low case to at least Medium. These are provisional routing assumptions, not validated enterprise risk bands. Model percentiles are not added to the operational score.

## Connected-journey routing

Events are assessed within a 30-day window. A completed sequence requires the same contributor to have registration → wage change → exclusion → SANED request, in order. Counts represent distinct contributors with completed sequences; unrelated contributors cannot collectively supply one sequence. Inputs with unsupported journey/type combinations or invalid wages cause abstention.

A complete unflagged case routes to Standard review. Model or comparator flags route to Specialist review. No operational control score or transaction amount is supplied in the bundled connected examples; these fields display “Not supplied.” Pattern similarity and reference percentiles are technical model outputs, not fraud probability or calibrated case risk percentages.

Model `madar-cross-journey-rf-20261019-v2` uses 16 derived features and 180 trees. Its held-out synthetic evaluation records 300 true positives, 18 false positives, zero false negatives and 382 true negatives (97.4% accuracy). Generator-based evaluation does not establish performance on real enterprise cases.

## Explanation and governance

Reason codes identify evidence categories consistently. Repeated-indicator suggestions exclude generic model flags and ambiguous positional legacy reasons; unrelated reasons cannot become one repeated indicator. Reference-range deviations provide context, not causal feature attribution.

LLM explanations use saved evidence and do not change scores, routes, findings or outcomes. Human review, formal violation issuance, payment intervention and verified financial impact are distinct steps. The prototype records human outcomes and validates amount consistency; it does not execute those enterprise actions.
