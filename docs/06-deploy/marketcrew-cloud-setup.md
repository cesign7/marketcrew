# MarketCrew Cloud Setup

> Date: 2026-05-22 KST
> Scope: GitHub, Vercel, Railway production 연결

## Current State

| Surface | Status | Detail |
|---------|--------|--------|
| GitHub | Connected | `https://github.com/cesign7/marketcrew` |
| GitHub default branch | Updated | `main` |
| GitHub legacy branch | Still present | `feat-ai-marketing-operations-mvp` |
| Vercel | Connected and deployed | `https://marketcrew.vercel.app` |
| Vercel project | Ready | `aipressos-projects/marketcrew` |
| Vercel production branch | Updated | `main` |
| Railway | Connected | project `marketcrew` |
| Railway Postgres | Online | service `Postgres`, production environment |

## Production Runtime

Vercel production uses Railway Postgres through encrypted environment variables.

Required production keys currently registered in Vercel:

| Group | Keys |
|-------|------|
| Repository | `MARKETCREW_REPOSITORY_MODE`, `DATABASE_URL`, `MARKETCREW_DATABASE_URL` |
| Naver Search Ad | `NAVER_SEARCH_AD_ACCESS_LICENSE`, `NAVER_SEARCH_AD_SECRET_KEY`, `NAVER_SEARCH_AD_CUSTOMER_ID`, `NAVER_SEARCH_AD_BASE_URL`, `NAVER_SEARCH_AD_KEYWORD_REQUEST_DELAY_MS` |
| SmartStore | `NAVER_COMMERCE_CLIENT_ID`, `NAVER_COMMERCE_CLIENT_SECRET`, `NAVER_COMMERCE_API_BASE_URL`, `NAVER_COMMERCE_TARGET_BRANDS`, `MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED`, `MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY`, `MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED` |
| Coffeeprint Youngcart | `YOUNGCART_BRIDGE_URL`, `YOUNGCART_BRIDGE_TOKEN`, `MARKETCREW_YOUNGCART_BRIDGE_APPROVED`, `MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED` |
| DataLab | `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET` |
| AI model readiness | `AI_AGENT_MODE`, `AI_AGENT_PROVIDER`, `AI_AGENT_MODEL`, `AI_LLM_PROVIDER`, `AI_LLM_MODEL_DEFAULT`, `AI_LLM_MODEL_STRATEGIC`, `AI_LLM_MODEL_REVIEWER`, `GEMINI_API_KEY` |

`OPENAI_API_KEY` was not registered because the local value was blank.

## Railway Seed

The production Railway DB was initialized from the local workflow store.

| Collection | Count |
|------------|-------|
| signals | 4 |
| keywordDemandSnapshots | 64 |
| searchTrendSnapshots | 2 |
| agendaCandidates | 5 |
| characterReports | 5 |
| opiSynthesisReports | 1 |
| approvalRequests | 5 |
| ownerDecisions | 2 |
| preflightChecks | 1 |
| executionResults | 1 |
| performanceCheckpoints | 18 |
| outcomeReports | 1 |
| followUpInternalTasks | 2 |
| providerSyncReports | 18 |
| agentRuns | 1 |
| agentRunWorkflowLinks | 5 |

Total records: 137.

## Deployment Notes

- `.vercelignore` excludes `.env`, `.marketcrew`, `.omx`, `.next`, `node_modules`, and local test outputs from Vercel upload bundles.
- `next.config.mjs` explicitly includes the Postgres bridge script, DB schema, and `pg` runtime dependencies for Vercel function file tracing.
- The first Vercel deployment that detected local `.env` was removed.
- The intermediate Vercel deployment that failed before file-tracing fix was removed.

## Verification

| Check | Result |
|-------|--------|
| Local `npm run typecheck` | PASS |
| Local `npm run build` | PASS |
| Vercel production deploy | READY |
| Railway service status | Online |
| `/operations` production smoke | 200, key Korean terms present |
| `/follow-ups` production smoke | 200, key Korean terms present |
| `/approvals/approval-agenda-season-plan-buddha-gift-card` production smoke | 200, key Korean terms present |
| `/api/operations/workflow-state` | `repositoryMode=db`, approvalRequests 5, providerSyncReports 18, agentRuns 1 |
| Vercel recent error logs after final smoke | no errors in latest 1 minute |

## Remaining GitHub Deletion Decision

The old GitHub branch `feat-ai-marketing-operations-mvp` still exists. Deleting that branch or deleting/recreating the entire GitHub repository is destructive and should only happen after an explicit final instruction.
