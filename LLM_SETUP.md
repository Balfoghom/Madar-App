# Madar — optional LLM explanation setup

## What is implemented

The prototype has a server-side **OpenAI Responses API** adapter for English case briefs: case in brief, why it matters, cited observations, questions to investigate and suggested next steps. The business narrative follows the original GOSI prototype’s case-summary approach; it does not copy its legacy weighted-risk claims. It is disabled until a provider, model and API key are configured. The ordinary structured evidence summary continues to work without it.

Azure OpenAI and internal gateways are not implemented in this adapter. If the team requires one, adapt and validate its endpoint/authentication before enabling it. Do not put a gateway URL into the OpenAI key field.

## Enable locally

1. Obtain an OpenAI API key for your project. API access/billing is separate from a ChatGPT subscription.
2. In Finder, double-click **Set up Madar LLM.command** in this project folder. Alternatively, run `npm run llm:setup` in Terminal.
3. Accept the suggested model `gpt-5.6-terra`, or enter a Responses/structured-output model available to your project. The suggested model supports both capabilities in [official OpenAI documentation](https://developers.openai.com/api/docs/models/gpt-5.6-terra). Account availability still requires a live test.
4. Paste the API key at the hidden prompt and press Enter. The helper saves only local configuration in the Git-ignored `.env`, restricts file permissions to your user, and makes no API call. It retains unrelated existing settings. Do not paste the key into chat or the browser.
5. Restart Madar with `npm start` or **Start Madar.command**. Existing host environment variables take precedence over `.env`.
6. Assess a synthetic case, open it in **Intelligence Queue**, then choose **Explain this case**.
7. Verify the draft. Use its numbered references to open readable evidence. Provider/model details are available under **About this AI draft**. A generated draft replaces the visible generic summary for that assessment; failed or unconfigured generation keeps the ordinary evidence overview available.

Manual alternative: copy `.env.example` to `.env`, set the key locally, and restart. Never overwrite an existing `.env` blindly.

For hosting, use the provider’s secret/environment settings instead of uploading `.env`. Configure a project spending limit and the appropriate approved model. To disable the integration, clear `MADAR_LLM_PROVIDER` and restart.

## Data and behavior

The key stays on the server. The request sends a minimal synthetic evidence packet: model version/results or rules-only findings, field-level data quality, derived features, reason codes, service context, original/current route and recorded outcome/amount context. For connected cases it also sends anonymous contributor histories with relative timing and supplied wage changes. At most six contributor histories and twelve events per contributor are sent, with omissions disclosed. It excludes case/person/employer identifiers, contact details, event identifiers, scenario free text and reviewer notes. This is not a real-data anonymization guarantee; never test with real personal or confidential records without the appropriate approved processing arrangement.

The request uses `store:false` and a strict JSON schema. The server checks returned evidence IDs and shape before saving. Valid references do not prove that an interpretation is correct. The draft is visibly unreviewed and must be verified by a specialist. It cannot change the case route, issue a violation or stop a payment.

Drafts are cached locally against the assessment, evidence, prompt version and configured model. A matching saved draft is reused without a second API call. Updated outcome/evidence invalidates the match. Errors, refusals, timeout and incomplete responses remain explicit failures; no fake LLM explanation is substituted. The prototype allows five generation requests per minute, with one in flight per case.

## Acceptance checks before the live demonstration

- [ ] Generate a real explanation for a flagged synthetic case and a routine case.
- [ ] Generate one for incomplete evidence; verify that it acknowledges the gap.
- [ ] Check every cited finding against the saved facts. Reject invented amounts, intent, legal conclusions, causal attributions or guaranteed savings.
- [ ] Refresh and verify that the draft is restored without another charged generation.
- [ ] Change a recorded outcome and verify that a fresh draft is required.
- [ ] Test an invalid key or unavailable model and confirm that evidence remains usable and the failure is visible.
- [ ] Record response latency and ask the fraud specialist to assess usefulness and editing effort. Do not claim measured time savings until tested against a baseline.

The current business-brief prompt is `madar-business-brief-v3`; previous brief versions are not reused. Automated tests use mocked provider responses. A real API smoke test was not performed during implementation because no provider/model/key was configured.

Official references: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses).
