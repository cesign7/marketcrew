# MarketCrew Cloud Setup

> Date: 2026-05-23 KST
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
| Vercel production env | Minimized | owner login + Railway backend bridge only |
| Custom domain | Added in Vercel, DNS updated | `marketcrew.app`, `www.marketcrew.app` |
| Owner login | Enabled | password session gate |
| Railway | Connected | project `marketcrew` |
| Railway Postgres | Online | service `Postgres`, production environment |
| Railway API | Online | service `marketcrew-api`, `https://api.marketcrew.app` |

## Production Runtime

Production is split into a thin Vercel frontend and a Railway backend.

- Vercel keeps only the owner login gate plus the Railway backend bridge token.
- Railway owns Postgres, provider API credentials, DataLab credentials, LLM readiness keys, cache settings, and write gates.
- External writes are still disabled by default. Moving secrets to Railway does not enable ad/product/customer writes.

Required production keys on Vercel:

| Group | Keys |
|-------|------|
| Owner login | `MARKETCREW_AUTH_SECRET`, `MARKETCREW_OWNER_PASSWORD_HASH` |
| Railway backend bridge | `MARKETCREW_BACKEND_API_URL`, `MARKETCREW_BACKEND_API_TOKEN`, `MARKETCREW_BACKEND_API_TIMEOUT_MS` |

Required production keys on Railway `marketcrew-api`:

| Group | Keys |
|-------|------|
| Backend mode | `MARKETCREW_BACKEND_MODE`, `MARKETCREW_API_TOKEN`, `MARKETCREW_API_CACHE_TTL_MS` |
| Repository | `MARKETCREW_REPOSITORY_MODE`, `DATABASE_URL`, `MARKETCREW_DATABASE_URL` |
| Naver Search Ad | `NAVER_SEARCH_AD_ACCESS_LICENSE`, `NAVER_SEARCH_AD_SECRET_KEY`, `NAVER_SEARCH_AD_CUSTOMER_ID`, `NAVER_SEARCH_AD_BASE_URL`, `NAVER_SEARCH_AD_KEYWORD_REQUEST_DELAY_MS` |
| SmartStore | `NAVER_COMMERCE_CLIENT_ID`, `NAVER_COMMERCE_CLIENT_SECRET`, `NAVER_COMMERCE_API_BASE_URL`, `NAVER_COMMERCE_TARGET_BRANDS`, `MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED`, `MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY`, `MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED` |
| Coffeeprint Youngcart | `YOUNGCART_BRIDGE_URL`, `YOUNGCART_BRIDGE_TOKEN`, `MARKETCREW_YOUNGCART_BRIDGE_APPROVED`, `MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED` |
| DataLab | `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET` |
| AI model readiness | `AI_AGENT_MODE`, `AI_AGENT_PROVIDER`, `AI_AGENT_MODEL`, `AI_LLM_PROVIDER`, `AI_LLM_MODEL_DEFAULT`, `AI_LLM_MODEL_STRATEGIC`, `AI_LLM_MODEL_REVIEWER`, `GEMINI_API_KEY` |
| Safety gates | `EXTERNAL_WRITE_ENABLED`, `MARKETCREW_EXTERNAL_WRITE_ENABLED`, `SEARCH_AD_WRITE_ENABLED`, `NAVER_SEARCH_AD_WRITE_ENABLED` |

`OPENAI_API_KEY` was not registered because the local value was blank.

## Railway Backend API

The backend now runs the same Next.js application on Railway, with backend mode enabled. This keeps Vercel as the UI/login surface while moving DB access, provider reads, LLM readiness, and API mutations to Railway.

| Surface | Detail |
|---------|--------|
| Service root | repository root |
| Runtime | Next.js production server |
| Production URL | `https://api.marketcrew.app` |
| Health check | `GET /api/backend/health` |
| View model | `GET /api/operations/view-model` |
| Read model | `GET /api/operations/workflow-state` |
| Provider sync | `GET /api/operations/provider-sync` |
| Approval mutation | `POST /api/approvals/[id]/decision` |
| Follow-up mutation | `PATCH /api/follow-ups/[id]` |
| Cache clear | `POST /api/cache/clear` |
| Required Railway vars | `MARKETCREW_BACKEND_MODE=1`, `MARKETCREW_REPOSITORY_MODE=db`, `DATABASE_URL` or `MARKETCREW_DATABASE_URL`, `MARKETCREW_API_TOKEN` |
| Required Vercel vars | `MARKETCREW_BACKEND_API_URL`, `MARKETCREW_BACKEND_API_TOKEN` |

Vercel uses the Railway API first when `MARKETCREW_BACKEND_API_URL` is configured. On hosted Vercel, the backend is required; if Railway is unavailable, API calls fail closed instead of silently showing local sample data.

This split is intentionally backend-first but still write-safe. Provider writes, ad budget changes, customer messaging, and other external writes remain blocked unless a later PDCA explicitly opens that path with write gates and rollback rules.

## Owner Login

Production routes are protected by a password-only owner login gate:

- Public entry: `/login`
- Protected pages: `/operations`, `/follow-ups`, `/approvals/[id]`
- Protected APIs: all `/api/*` except `/api/auth/*`
- Session cookie: HTTP-only, same-site, secure in production, 12 hour max age

The generated owner password is not committed. The local handoff file is `.marketcrew/owner-login.txt`, and Vercel stores only the bcrypt password hash plus session secret as encrypted environment variables.

## Railway Seed

The production Railway DB was initialized from the local workflow store.

| Collection | Count |
|------------|-------|
| signals | 4 |
| keywordDemandSnapshots | 64 |
| searchTrendSnapshots | 2 |
| agendaCandidates | 5 |
| characterReports | 5 |
| moaSynthesisReports | 1 |
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

## Custom Domain

`marketcrew.app` is registered at Cloudflare nameservers and has been added to the Vercel `marketcrew` project together with `www.marketcrew.app`.

Current Cloudflare nameservers:

- `peter.ns.cloudflare.com`
- `sandy.ns.cloudflare.com`

Required Cloudflare DNS records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `76.76.21.21` | DNS only during verification |
| A | `www` | `76.76.21.21` | DNS only during verification |

Cloudflare DNS API/CLI authentication is not available in this workspace yet. The records were added manually in Cloudflare and public resolvers now return `76.76.21.21`.

Verify with:

```bash
dig +short A marketcrew.app
dig +short A www.marketcrew.app
vercel domains inspect marketcrew.app --scope aipressos-projects
curl -I https://marketcrew.app/operations
```

## Verification

| Check | Result |
|-------|--------|
| Local `npm run typecheck` | PASS |
| Local `npm run build` | PASS |
| Local targeted API/persistence tests | PASS, 4 files / 14 tests |
| Railway root Next backend deploy | SUCCESS, Node 22 runtime |
| Railway `/api/backend/health` | `ok=true`, `repositoryMode=db`, approvalRequests 5, providerSyncReports 42, agentRuns 25 |
| Railway `/api/operations/view-model` | 200, DB-backed operations view model returned |
| Railway `/api/operations/workflow-state` | 200, token-protected DB summary returned |
| Railway unauthenticated API guard | `/api/operations/view-model` returns 401 without backend token |
| Vercel production deploy | READY, `marketcrew.app` alias updated after env pruning |
| Vercel production env list | 5 keys remain: owner login 2, Railway bridge 3 |
| Railway service status | Online |
| Railway custom API domain | `https://api.marketcrew.app` |
| Vercel backend bridge health | `https://marketcrew.app/api/backend/health` returns the same DB-backed health summary |
| `/operations` production smoke | 200, key Korean terms present |
| `/operations` login smoke after env pruning | 200 after owner login, `repositoryMode=db`, approvalRequests 5, providerSyncReports 42, agentRuns 25 |
| `/operations` unauthenticated guard | 307 redirect to `/login?next=/operations` |
| `/follow-ups` production smoke | 200, key Korean terms present |
| `/approvals/approval-agenda-season-plan-buddha-gift-card` production smoke | 200, key Korean terms present |
| `/api/operations/workflow-state` | `repositoryMode=db`, approvalRequests 5, providerSyncReports 42, agentRuns 25 |
| Vercel recent error logs after pruned-env smoke | no errors in latest 3 minutes |
| `marketcrew.app` DNS | public resolvers return `76.76.21.21` |
| Owner login unit tests | PASS |

## Remaining GitHub Deletion Decision

The old GitHub branch `feat-ai-marketing-operations-mvp` still exists. Deleting that branch or deleting/recreating the entire GitHub repository is destructive and should only happen after an explicit final instruction.
