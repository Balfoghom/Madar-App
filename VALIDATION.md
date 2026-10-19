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

49 tests pass. The suite runs inference against exported Python fixtures and held-out results, plus local HTTP integration tests with temporary session directories. It covers decision/outcome persistence, stage and governance gates, conflicting edits, model immutability, indicator collisions, financial reporting and explanation caching.

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
