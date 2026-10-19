# Madar | مدار — Enterprise Fraud Operations

Madar’s proposed value is a shared operating layer for existing fraud capabilities: receive findings, explain evidence, assign ownership, investigate, record outcomes and track governance. Cross-journey detection is one example input, not the novelty of the enterprise proposal.

This repository is a working **synthetic prototype** of that process. English is the default interface, with Madar / مدار branding. It has seven bundled model artifacts, saved cases and human reviews, a staged investigation workflow and an optional API-based LLM case explainer. It has no live enterprise integrations or payment actions.

## Run it yourself

Requires **Node.js 22.13 or newer**. No package installation, Python training or API key is needed for the core app.

1. Open this project folder in Terminal.
2. Run `npm start` (or double-click `Start Madar.command` on macOS).
3. Open [Madar](http://localhost:8090).
4. Keep the terminal open. Stop with Control+C.

The app opens on **Fraud Operations**. One server supplies the interface and API; do not start a separate frontend or model service. If the port is occupied, stop the previous app or run `PORT=8091 npm start` and open that port.

For optional LLM explanations, follow [LLM_SETUP.md](LLM_SETUP.md). The app works without them and clearly displays “API setup required.”

## Validate the working journey

Use synthetic evidence only. These checks write to your local demo session.

- [ ] Open **Fraud Operations → Open connected case example → Assess demo portfolio**. Expect six saved cases from 35 events.
- [ ] Open **Connected SANED sequence**. Expect three contributors, each with a complete linked sequence, a model review flag, quiet comparator rules and a specialist-review recommendation.
- [ ] Compare **Routine activity** and **Legitimate restructuring**. Both should remain unflagged by the bundled model and comparator rules.
- [ ] Open **Missing employer evidence**. Expect abstention and “Complete evidence,” without a model score.
- [ ] Open **Inspect source events**. Check timestamps, identities and wage evidence against the displayed history.
- [ ] Select **Open in investigation queue**. Assign a case owner, choose **Triage**, enter reviewer name and work note, then save.
- [ ] Move to **Investigation**, then **Decision pending**. Stage skipping is rejected. A reviewer name and rationale are required for every saved update.
- [ ] Override the recommended route, then approve the original recommendation. The route should return to the original recommendation while both decisions remain in history.
- [ ] Record a specialist outcome. Cross-journey examples do not supply transaction amounts, so use zero financial amounts and “No financial impact”; do not claim prevented loss from these examples.
- [ ] Close only after recording a resolved outcome. Reopen a closed case before changing its outcome.
- [ ] Refresh. The owner, stage, reviews, outcome and original model evidence should remain.
- [ ] Return to **Fraud Operations** and check its saved-case and work-in-progress counts.
- [ ] Reassess unchanged evidence with the same model version. It should not create a duplicate case or discard human reviews. A model-version change creates a new assessment and retains prior reviews in history.
- [ ] Open **Model & Governance**. The registry should include six journey models and the connected-journey model.
- [ ] Switch **Workspace data** between **Assessed synthetic cases** and **Illustrative portfolio**. Dashboards, queue and reports must not mix their results.
- [ ] Select an empty reporting month. Expect an empty report, not fallback cases.
- [ ] With an LLM configured, generate a brief from a saved case. Inspect its evidence references, missing-evidence questions and suggested checks. Verify every claim before relying on the draft.

The former **AI Backend Demo** is now named **Model Evidence** in the left navigation. It contains model examples and saved backend evidence.

## Records and team collaboration

The launcher uses `.madar-data/`, excluded from Git. Set `ASSESSMENT_DATA_DIR` to use a different directory. Preserve it between restarts. Existing local session files are not deleted by this update.

Manal’s October 19 session is preserved as a historical fixture in [demo-sessions/manal-20261019](demo-sessions/manal-20261019/README.md). It uses the earlier model version. Shared example data belongs there; live rehearsal writes belong in `.madar-data/` and should not be committed.

Data Intake’s reset clears the selected local session. Case notes, model evidence and generated LLM drafts are local prototype records, not an enterprise immutable audit store. Governance roles are named demo roles rather than authenticated permissions. Candidate indicators and scenario review stages do not deploy rules or retrain models.

## Automated checks

Run `npm test`. The suite covers inference parity, synthetic holdout metrics, event grouping and validation, contributor-level sequences, duplicate imports, model-version handling, policy isolation, review and ownership persistence, stale edits, financial consistency, indicator evidence grouping, and LLM request/output validation. Provider calls are mocked in automated tests; a real configured API requires a separate smoke test.

The corrected cross-journey model is `madar-cross-journey-rf-20261019-v2`. It finds 300/300 provisional review cases with 18 false alarms among 400 routine or legitimate cases in its synthetic holdout. These figures do not establish production accuracy, prevented loss or specialist time savings.

## Hosting

Run as one Node service with `npm start`, `HOST=0.0.0.0`, the host’s `PORT`, and `ASSESSMENT_DATA_DIR` on persistent storage. Use one application instance with this file store. The supplied Dockerfile describes this layout; its image build is not verified in this update.

For a privately shared demonstration, configure `MADAR_DEMO_PASSWORD` through the host’s secret settings, use username `madar`, and require the host’s HTTPS endpoint. This optional shared gate is not enterprise identity or role-based access control. Put API keys in the host’s secret settings. Never commit `.env` or runtime records.

Hosting the full app needs a Node-compatible server and persistent storage. A static upload of `dist/` cannot run inference or save reviews. No new deployment was made in this update.

## Current scope and next integrations

| Working prototype | Enterprise integration still required |
|---|---|
| Shared synthetic case workspace and seven bundled models | Connect existing fraud use cases and their source systems |
| Named owner, staged case work, durable local reviews | Enterprise SSO, enforced roles, assignment and escalation controls |
| Optional cited LLM explanation adapter | Approved provider, live API validation, specialist quality evaluation |
| Recorded outcomes and financial consistency checks | Verified violation issuance, recovery/payment integrations and reconciled financial reporting |
| Indicator suggestions and review examples | Controlled deployment, production validation, monitoring and model governance |
| Local JSON persistence | Transactional database, concurrency, backup, immutable audit and retention policies |

See [solution design](AI_SOLUTION_DESIGN.md), [technical blueprint](TECHNICAL_BLUEPRINT.md), [scoring methodology](SCORING_METHODOLOGY.md), and [LLM setup](LLM_SETUP.md). Component READMEs and ServiceNow import files remain supporting material; they are not live integrations.
