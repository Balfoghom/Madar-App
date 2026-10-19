# Madar — optional LLM explanation setup

## What is implemented

The prototype has a server-side **OpenAI Responses API** adapter for English case briefs: overview, cited findings, questions to investigate and suggested checks. It is disabled until a provider, model and API key are configured. The ordinary structured evidence summary continues to work without it.

Azure OpenAI and internal gateways are not implemented in this adapter. If the team requires one, adapt and validate its endpoint/authentication before enabling it. Do not put a gateway URL into the OpenAI key field.

## Enable locally

1. Obtain an approved OpenAI API project/key and select a model available to that project that supports Responses and strict structured outputs. API billing/access is separate from a ChatGPT subscription.
2. Copy `.env.example` to `.env` in the project root.
3. Edit `.env` locally: set `MADAR_LLM_PROVIDER=openai`, enter your selected model ID in `MADAR_LLM_MODEL`, and enter the key in `OPENAI_API_KEY`. Do not paste a key into chat or the browser UI.
4. Restart with `npm start`. The launcher loads `.env`; existing host environment settings take precedence.
5. Assess a synthetic case, open it in **Intelligence Queue**, and select **Generate LLM explanation**.
6. Review the generated draft and expand **Inspect cited evidence**. It must distinguish an observed signal from a confirmed fraud conclusion, and should ask for missing evidence rather than invent it.

For hosting, use the provider’s secret/environment settings instead of uploading `.env`. Configure a project spending limit and the appropriate approved model. To disable the integration, clear `MADAR_LLM_PROVIDER` and restart.

## Data and behavior

The key stays on the server. The request sends a minimal synthetic evidence packet: model version/results, derived features, reason codes, route and recorded outcome/amount context. It excludes case/person/employer identifiers, contact details, event identifiers, scenario free text and reviewer notes. This is not a real-data anonymization guarantee; never test with real personal or confidential records without the appropriate approved processing arrangement.

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

Automated tests use mocked provider responses. A real API smoke test was not performed during implementation because no provider/model/key was configured.

Official references: [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Responses migration guide](https://developers.openai.com/api/docs/guides/migrate-to-responses).
