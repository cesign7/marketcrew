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

## Web-First Development

개발과 검증의 기준은 이제 운영 웹사이트다. 로컬은 코드 작성, 타입 검사, 단위 테스트, 빌드 검증에만 쓰고, 실제 데이터 확인은 `marketcrew.app`과 `api.marketcrew.app`에서 한다.

권장 흐름:

1. 로컬에서 작은 단위로 수정한다.
2. 변경 범위에 맞는 표적 테스트와 `npm run typecheck`를 먼저 돌린다.
3. 배포 전에는 `npm run build`와 필요한 Playwright smoke만 추가한다.
4. GitHub `main`에 push하면 Vercel과 Railway가 자동 배포한다.
5. 배포 후 `npm run smoke:prod`로 Railway API, Vercel bridge, 로그인 보호를 빠르게 확인한다.
6. 실제 데이터 수집과 AI 판단 확인은 운영 웹사이트에서만 진행한다.

로컬 Postgres는 기본 운영 경로에서 제외한다. 과거 데이터 마이그레이션이나 오프라인 재현이 필요할 때만 `docker start marketcrew-postgres`로 잠깐 켠다.

Required production keys on Vercel:

| Group | Keys |
|-------|------|
| Owner login | `MARKETCREW_AUTH_SECRET`, `MARKETCREW_OWNER_PASSWORD_HASH` |
| Railway backend bridge | `MARKETCREW_BACKEND_API_URL`, `MARKETCREW_BACKEND_API_TOKEN`, `MARKETCREW_BACKEND_API_TIMEOUT_MS` |

Required production keys on Railway `marketcrew-api`:

| Group | Keys |
|-------|------|
| Backend mode | `MARKETCREW_BACKEND_MODE`, `MARKETCREW_API_TOKEN` |
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
| Test data reset preview | `GET /api/operations/reset-test-data` |
| Test data reset apply | `POST /api/operations/reset-test-data` |
| Required Railway vars | `MARKETCREW_BACKEND_MODE=1`, `MARKETCREW_REPOSITORY_MODE=db`, `DATABASE_URL` or `MARKETCREW_DATABASE_URL`, `MARKETCREW_API_TOKEN` |
| Required Vercel vars | `MARKETCREW_BACKEND_API_URL`, `MARKETCREW_BACKEND_API_TOKEN` |

Vercel uses the Railway API first when `MARKETCREW_BACKEND_API_URL` is configured. On hosted Vercel, the backend is required; if Railway is unavailable, API calls fail closed instead of silently showing local sample data.

This split is intentionally backend-first but still write-safe. Provider writes, ad budget changes, customer messaging, and other external writes remain blocked unless a later PDCA explicitly opens that path with write gates and rollback rules.

## Test Data Reset

운영 시작 직전에는 테스트로 쌓인 workflow 데이터를 지울 수 있다. 이 기능은 Railway/Postgres 저장소에서만 실행되며, 인사과/AI 예산 설정인 `aiOperationsSettings`는 보존한다.

초기화 대상:

- 결재 후보와 결재안
- 대표 결정, 실행 전 점검, 모의 실행 결과
- 성과 체크포인트와 결과 보고
- 연동 수집 이력
- AI 실행 이력과 workflow 연결 기록
- 근거 요청, 가설 후보, 캐릭터 보고, 모아 종합

보존 대상:

- `aiOperationsSettings`
- Vercel/Railway 환경변수
- 대표 로그인 비밀값
- 외부 provider 원장 데이터

초기화 전 미리보기:

```bash
curl -s https://api.marketcrew.app/api/operations/reset-test-data \
  -H "Authorization: Bearer $MARKETCREW_API_TOKEN"
```

초기화 실행은 아래 확인 문구가 정확히 들어와야 한다.

```bash
curl -s -X POST https://api.marketcrew.app/api/operations/reset-test-data \
  -H "Authorization: Bearer $MARKETCREW_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"운영 시작 전 테스트 데이터 초기화"}'
```

이 명령은 외부 광고, 상품, 고객 데이터에는 쓰지 않는다. MarketCrew 내부 workflow 기록만 비운다.

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
| `/api/operations/reset-test-data` route tests | PASS, preview/confirmation/file-mode guard |
| Vercel recent error logs after pruned-env smoke | no errors in latest 3 minutes |
| `marketcrew.app` DNS | public resolvers return `76.76.21.21` |
| Owner login unit tests | PASS |

## Remaining GitHub Deletion Decision

The old GitHub branch `feat-ai-marketing-operations-mvp` still exists. Deleting that branch or deleting/recreating the entire GitHub repository is destructive and should only happen after an explicit final instruction.
