# VDI Deployment Guide

## Short answer

The current prototype can be opened inside a VDI without rebuilding the user interface. For a controlled internal demonstration, IT can copy and host the `dist` folder on an internal IIS or other static web server and provide an internal URL.

Moving from the prototype to a production solution is not only a URL change. The interface can be reused, but in-browser synthetic processing must be replaced with approved internal APIs, identity and role controls, persistent storage, model serving, GOSI Brain integration where approved, and audit/security controls.

## Option 1 — Internal demonstration in VDI

**Purpose:** allow the AI and IT teams to inspect and demonstrate the current prototype using synthetic data.

1. Copy the source package into the VDI development area.
2. Host the `dist` directory as a static site in IIS, Nginx, Apache, or a permitted local development server.
3. Allow access only to the approved review group.
4. Keep the synthetic-data banner visible.
5. Do not upload real personal or operational data.

Example local command when Python is permitted:

```powershell
python -m http.server 8080 --directory dist
```

Open `http://localhost:8080` from the VDI browser.

## Option 2 — Internal pilot architecture

**Purpose:** connect approved historical data in a sandbox or shadow mode.

1. Retain the interface and replace the browser assessment call with an internal assessment API.
2. Store case and event history in an approved internal data store.
3. Deploy the anomaly component through the approved Data & AI model-serving platform.
4. Use GOSI Brain only for approved LLM functions such as controlled case summarization or indicator-proposal drafting.
5. Integrate enterprise identity, RBAC, audit logging, secrets management, encryption, monitoring, and recovery.
6. Validate results without affecting live decisions.

## Option 3 — Production integration

**Purpose:** real-time assessment within live service journeys.

Requires separate architecture approval, privacy and cybersecurity review, service ownership, tested APIs or streams, model governance, shadow results, operational SLA, rollback, and approved decision thresholds. Any temporary hold or adverse action must be governed separately and must not be executed solely by an AI signal.

## Recommended responsibility split

| Workstream | Primary lead |
| --- | --- |
| Fraud scenarios, reason codes, risk appetite and route ownership | Fraud Prevention, Detection & Risk specialists |
| Data sources, quality, labels and historical outcomes | Data owners and Data Governance |
| Anomaly model, validation, monitoring and model registry | Data & AI |
| APIs, hosting, identity, security and VDI deployment | IT / Enterprise Architecture / Cybersecurity |
| LLM summary and prompt controls | GOSI Brain owner with Data & AI and Fraud specialists |
| Final decisions and outcome feedback | Authorized business specialists |

## Review checklist for the receiving team

- Open `README.md`, `AI_SOLUTION_DESIGN.md`, and `SCORING_METHODOLOGY.md` first.
- Run the application and review the saved synthetic model training and evaluation details for all six journeys.
- Review `dist/app.js`, especially `DEFAULT_MODEL_CONFIG`, `assess`, `generateSignals`, and the case-summary functions.
- Confirm the preferred internal hosting pattern.
- Confirm whether GOSI Brain exposes a secured API for structured case summarization.
- Identify the approved source and owner for every proposed event and outcome field.
- Decide whether the first connected phase is synthetic demonstration, historical sandbox, or shadow mode.

