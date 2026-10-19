# Madar implementation validation — 19 October 2026

## Changes verified

- Contributor-level ordered sequences replace pooled event counts; exported model regenerated as `madar-cross-journey-rf-20261019-v2`.
- Strict journey/type and wage validation; direct event evidence rejects duplicate IDs and invalid timestamps.
- Sandbox drafts do not change fitted-model routing. Approval restores the original recommended route after an override.
- Stable evidence codes prevent unrelated model features or comparator reasons being grouped as one repeated indicator.
- Named case ownership, adjacent stages, stale revision checks, closure after resolution and reopening before outcome changes.
- Financial classification/amount consistency; missing transaction/exposure totals remain unavailable instead of appearing as zero.
- Assessed and illustrative portfolios are separate. Seven bundled capabilities appear in the registry.
- Optional OpenAI case explainer with minimal evidence, structured responses, citations, timeout/failure handling and evidence-aware local caching.

## Automated result

53 tests pass. The suite runs inference against exported Python fixtures and held-out results, plus local HTTP integration tests with temporary session directories. It covers decision/outcome persistence, stage and governance gates, conflicting edits, model immutability, indicator collisions, financial reporting and explanation caching.

LLM tests use mocked responses. They verify request minimization, `store:false`, strict output shape, evidence references, refusal/error paths, duplicate generation locking, cache reuse and refusal to save a draft when evidence changes during generation. No real API call or explanation quality evaluation was performed.

## Browser checks

Used an isolated synthetic runtime, separate from the existing `.madar-data/` session. Confirmed:

- Fraud Operations opens with explicit synthetic status and empty-state guidance.
- Assessing the bundled connected portfolio produces six cases from 35 events.
- The main case has three complete contributor sequences; routine, legitimate-growth and incomplete cases show their expected routing states.
- Ownership, Triage, Investigation, Decision pending, a routing approval, resolved outcome and Closed persist after reload/server restart.
- The optional LLM panel clearly requires API setup; no generated explanation is faked.
- Assessed queue has six cases; illustrative queue has 60, displayed separately.
- Reports show missing amounts as “Not supplied”; an empty month returns no cases.
- Desktop operations layout and 720px indicator layout are usable; indicator status/actions remain visible.
- No browser console errors or warnings were observed in these checks.

## Model evidence

Corrected connected model: 300 true positives, 18 false positives, zero false negatives, 382 true negatives on 700 generated holdout histories. The 18 false alarms include seven routine and eleven legitimate-growth examples. These results do not establish real-world fraud detection, financial benefit or specialist time savings.

## Remaining validation

Choose the approved API provider and model, configure a server-side key, then perform real flagged/routine/incomplete case explanation checks with the fraud specialist. Hosting, Docker image build, production connectors, enterprise identity/permissions and real financial intervention are not validated by this work.

Manal’s checked-in session is preserved under `demo-sessions/manal-20261019/`; existing local runtime files were left intact. These changes have not been deployed to a hosted environment.

## Business-language brief follow-up

The user confirmed the original GOSI prototype as the style reference and selected OpenAI. The new prompt starts with service activity, explains why it matters, identifies evidence gaps and proposes practical specialist checks. Anonymous event histories provide the factual sequence; original and current routes are kept distinct. The response contract now requires business significance, invalidating prior-format cached drafts.

Browser testing with an isolated mock provider verified the five brief sections, numbered evidence links, readable source details and restoration of a saved brief. This demonstrates UI and storage behavior, not actual LLM writing quality. The mock server and its data are separate from the normal app. Live generation remains pending a locally configured key.

## Original page structure restored

The main navigation now uses the eight original business pages, with Dashboard as the landing page. The separate Fraud Operations register and mandatory case-workflow form were removed from the review experience. Model evidence and indicator tools are accessible within Model & Governance; connected source-event inspection is accessible from Data Intake.

One demo-loading action prepares three SANED cases and six connected-history cases through the existing inference endpoints, then opens the Intelligence Queue. Saved cases are reused, including existing review decisions. Browser checks verified the nine-case queue, connected evidence within the case panel, nested navigation, and repeated loading without changing saved assessment or review files. The existing 53 automated tests pass. This change does not change the fitted models or introduce a new hybrid scoring formula; the scoring simulation remains illustrative. Live OpenAI testing still requires a configured API key.

## Enterprise demo, data quality and review audit

The expanded portfolio adds 39 saved cases: 30 rules-only cases across Benefit Payments, Contribution & Wage, Employer Registration, Retirement and Maternity Benefit; three SANED model cases; and six connected-history model cases. All six journeys and all 13 Saudi regions are represented, with two outside-Saudi examples. Existing saved cases and reviews are preserved. Only SANED and connected histories use fitted inference in this added portfolio.

Seven scripted prevention outcomes total SAR 389,500. Two are linked to genuine synthetic model flags (SANED SAR 24,000; connected activity SAR 48,000). These are labeled demonstration outcomes, not actual interventions or measured savings. Transaction values are supplied scenario assumptions, never calculated from wage changes. Financial dashboards show known subtotals and count missing amounts. Monthly filters use the assessment month and include incomplete cases in the risk distribution.

Data quality is the proportion of passed applicable field checks, with individual missing source cells visible in the case. Zero is valid for amounts/control scores. Optional source fields are excluded; a critical missing field remains a blocker even if the overall percentage is high. This is not a verified-source accuracy metric or a probability of fraud. Tests verify one missing cell versus ten cells and missing required records.

Review fixes: rules-only cases no longer claim anomaly inference; incomplete assessments show deferred inference; completed outcomes prevent further route approvals from overwriting the resolved status; partial prevention has a distinct payment status; owner/next-step text respects evidence completion and resolved outcomes. Rules-only cases support explanation and named specialist decisions through the same queue.

Validation: 58 automated tests pass. Browser checks cover portfolio loading, six-journey dashboard, populated executive and monthly totals, missing-data details, and preservation of previous reviews. Live OpenAI quality remains pending until a key is saved locally.
