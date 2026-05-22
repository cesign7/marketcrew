# ops-persistence-provenance-foundation Do Log

> **Project**: marketcrew2
> **Feature**: `ops-persistence-provenance-foundation`
> **PDCA Cycle**: #2
> **Status**: Complete
> **Started**: 2026-05-22 KST

---

## Scope

이번 Do 단계는 1차 MVP 이후 운영 기반을 강화하는 사이클이다. 목표는 local file workflow store를 운영 DB로 옮기기 전에, 저장소 계약과 provenance domain을 먼저 안정화하는 것이다.

## Module Map

| Module | Goal | Status |
|--------|------|--------|
| module-1 | `AgentRun` domain type, workflow link, repository contract | Complete |
| module-2 | file/memory repository에 `AgentRun` 저장 지원 | Complete |
| module-3 | DB-backed repository와 local JSON import | Complete |
| module-4 | planner/provider sync/decision flow에 run recorder 연결 | Complete |
| module-5 | `/operations`, `/approvals/[id]` provenance UI | Complete |
| module-6 | provider 근거의 실제 운영 브랜드/채널 구분 표시 | Complete |

## Iteration 1 - AgentRun Repository Contract

### Completed

- `AgentRun`, `AgentRunTokenUsage`, `AgentRunWorkflowLink`, `WorkflowObjectRef` domain type을 추가했다.
- `MarketingWorkflowRepository`에 `saveAgentRuns`, `listAgentRuns`, `saveAgentRunWorkflowLinks`, `listAgentRunWorkflowLinks`, `listAgentRunsForWorkflowObject`를 추가했다.
- `MemoryMarketingWorkflowRepository`와 `FileMarketingWorkflowRepository`가 동일한 contract를 지원하게 했다.
- `buildWorkflowStateSummary`에 `agentRuns`, `agentRunWorkflowLinks`, recent `agentRunIds`를 추가했다.
- `tests/persistence/agent-run-repository.test.ts`로 memory/file 저장소의 동일 동작과 summary count를 검증했다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/persistence/agent-run-repository.test.ts tests/persistence/file-repository.test.ts` | passed, 2 files / 5 tests |
| `npm test -- --run` | passed, 16 files / 56 tests |
| `npm run typecheck` | passed after removing stale `.next/types/* 2.ts` generated duplicates |
| `npm run build` | passed |
| `/operations` HTTP smoke | 200 OK |
| existing-server Playwright smoke | passed, `agentRuns=0`, `agentRunWorkflowLinks=0` fields present |

Note: `npm run test:e2e` could not start its own configured web server because the user-visible dev server was already running on port 3001. The equivalent non-mutating browser smoke was run against the existing 3001 server instead.

## Next

다음 iteration은 DB-backed repository와 local JSON import를 구현한다. UI는 `/operations`에 agent run summary가 먼저 붙었고, `/approvals/[id]`의 결재별 run timeline은 DB/import 이후 상세 조회 모델과 함께 확장한다.

## Iteration 2 - AgentRun Recorder and Operations Summary

### Completed

- `src/lib/application/agent-run-recorder.ts`를 추가했다.
- 오피 planner audit을 `AgentRun`으로 저장하고 추천 approval에 workflow link를 건다.
- provider sync report를 provider read-only `AgentRun`으로 저장하고 provider report/signal에 link를 건다.
- owner decision workflow 결과를 local `AgentRun`으로 저장하고 approval, decision, execution, outcome, checkpoint, follow-up task에 link를 건다.
- `/operations`를 `force-dynamic`으로 고정해 local workflow store 최신 상태를 읽게 했다.
- `/operations`에 `AgentRunSummaryPanel`을 추가해 총 runs, 토큰, 비용, 상태, 최근 run을 표시한다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/agent-run-recorder.test.ts tests/application/approval-workflow.test.ts tests/api/approval-decision-route.test.ts` | passed, 3 files / 10 tests |
| `npm test -- --run` | passed, 17 files / 59 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed, `/operations` is dynamic |
| existing-server Playwright smoke | passed, `runs=1`, `agentRunWorkflowLinks=5` |

## Iteration 3 - Fresh Postgres and Workflow Import

### Completed

- Docker container `marketcrew-postgres`의 기존 `marketcrew` DB를 backup dump 후 drop/create했다.
- Backup dump: `.marketcrew/db-backups/marketcrew-before-reset-20260522-132554.sql`
- 새 `marketcrew` DB는 owner `marketcrew`, public user tables 0개 상태에서 시작했다.
- `pg`와 `@types/pg`를 추가했다.
- `db/workflow-store.sql`에 최소 workflow mirror schema를 추가했다.
- `scripts/import-workflow-store-to-postgres.mjs`를 추가했다.
- `npm run db:import-workflow-store`로 `.marketcrew/workflow-store.json`의 137개 record를 새 Postgres DB에 import했다.

### Imported Collections

| Collection | Count |
|------------|------:|
| signals | 4 |
| seasonalKeywordAdPlans | 2 |
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

### Verification

| Command | Result |
|---------|--------|
| `docker exec marketcrew-postgres psql -U marketcrew -d marketcrew ...` | fresh DB connected, `user_tables=0` before import |
| `npm run db:import-workflow-store` | imported 137 records |
| Node `pg` count query | collection counts matched local JSON |

### Remaining

Runtime repository switch is complete in Iteration 4. The remaining work is `/approvals/[id]`의 linked run timeline과 DB-backed owner decision/outcome smoke를 결재 상세 UI에서 더 선명하게 보여주는 것이다.

## Iteration 4 - Runtime DB-backed Repository Switch

### Completed

- `src/lib/persistence/workflow-state.ts`를 추가해 file/DB 저장소가 같은 workflow collection list와 state normalization을 공유하게 했다.
- `scripts/postgres-workflow-bridge.mjs`를 추가해 Postgres `workflow_records` JSONB mirror를 read/write할 수 있게 했다.
- `src/lib/persistence/postgres-repository.ts`를 추가해 기존 동기식 `MarketingWorkflowRepository` contract를 DB-backed runtime에서도 지원하게 했다.
- `createLocalWorkflowRepository()`가 `MARKETCREW_REPOSITORY_MODE=file|db`를 읽고, `db`일 때 `MARKETCREW_DATABASE_URL` 또는 `DATABASE_URL`을 사용하게 했다.
- `.env`에 `MARKETCREW_REPOSITORY_MODE="db"`를 추가해 local runtime을 새 `marketcrew` Postgres DB로 전환했다.
- `/api/operations/workflow-state`가 `repositoryMode`, masked DB label, DB-backed counts를 반환하게 했다.

### Runtime DB Counts

| Collection | Count |
|------------|------:|
| signals | 4 |
| keywordDemandSnapshots | 64 |
| searchTrendSnapshots | 2 |
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

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/persistence/workflow-store-mode.test.ts tests/persistence/file-repository.test.ts tests/persistence/agent-run-repository.test.ts` | passed, 3 files / 8 tests |
| `npm test -- --run` | passed, 18 files / 62 tests |
| `npm run typecheck` | passed after removing stale generated `.next/types/* 2.ts` duplicates |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `scripts/postgres-workflow-bridge.mjs read-state` | DB mode read verified, approvalRequests=5, providerSyncReports=18, agentRuns=1 |
| `scripts/postgres-workflow-bridge.mjs save-collection approvalRequests` | idempotent DB write verified, count=5 |
| `/api/operations/workflow-state` on port 3001 | `repositoryMode=db`, masked DB label, imported counts returned |
| in-app browser `/operations` smoke | page loaded, `오늘 올라온 안건`, `AI 실행 감사 로그`, `승인 대기` visible |

## Next

다음 iteration은 module-5의 남은 부분이다. `/approvals/[id]`에서 approval별 linked `AgentRun` timeline, model/token/cost, provider evidence를 더 직접적으로 보여주고, DB mode에서 owner decision/outcome 흐름이 계속 저장되는지 route-level smoke를 추가한다.

## Iteration 5 - Approval Detail Provenance Timeline

### Completed

- `/approvals/[id]` 상세 view model에 `agentRunTimeline`을 추가했다.
- 결재안, 대표 결정, preflight, execution result, performance checkpoint, outcome report, follow-up task, outcome의 source provider report를 기준으로 연결된 `AgentRun`을 묶는다.
- 결재 상세 화면에 `이 결재의 AgentRun 타임라인` 섹션을 추가했다.
- 각 run에서 runner type, status, provider/model, mode, token, cost, evidence count/trace, input/output summary, 연결 객체, relation을 표시한다.
- Playwright e2e web server는 `.env`의 DB mode에 영향받지 않도록 `MARKETCREW_REPOSITORY_MODE=file`을 명시했다.
- 실제 3001 DB mode에서 decision API를 호출해 owner decision/outcome/AgentRun link 저장을 확인했다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/approval-detail-view-model.test.ts tests/api/approval-decision-route.test.ts tests/persistence/workflow-store-mode.test.ts` | passed, 3 files / 12 tests |
| `npm test -- --run` | passed, 18 files / 63 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm run test:e2e -- --project=chromium tests/e2e/approval-detail-smoke.spec.ts` | passed, 1 test |
| `npm audit --omit=dev` | 0 vulnerabilities |
| DB mode live decision route | `APPROVE_DRAFT_ONLY` saved owner decision/outcome/follow-up/AgentRun links |
| DB mode workflow-state | `repositoryMode=db`, `agentRuns=2`, `agentRunWorkflowLinks=13` |
| in-app browser approval detail | `이 결재의 AgentRun 타임라인`, `local / owner-decision-workflow`, provider evidence, outcome history visible |

### Notes

- The DB mode live route smoke is idempotent for the sample approval because decision/run/object IDs are deterministic and upserted.
- External provider write remains blocked. The smoke used `APPROVE_DRAFT_ONLY`, so no external write was attempted.

## Iteration 6 - Provider Channel Scope and Brand Labels

### Module/Goal

- **Module**: module-6
- **Goal**: Smartstore를 `스마트스토어(스티커씨)`, 자체 쇼핑몰을 `쇼핑몰(커피프린트)`로 명확히 보여주고, 대표가 provider 근거를 전체 또는 채널별로 확인하게 한다.

### Completed

- `ProviderSyncEvidenceView`에 `providerKey`, `providerGroup`, `channelKey`, `channelLabel`, `brandLabel`을 추가했다.
- 스마트스토어 aggregate는 `스티커씨`, 쇼핑몰/Youngcart aggregate는 `커피프린트`로 표시한다.
- snapshot label을 `스티커씨 주문`, `스티커씨 매출`, `커피프린트 주문`, `커피프린트 매출`처럼 브랜드 기준으로 바꿨다.
- `ProviderSyncEvidencePanel`에 `전체 근거`와 `구분 보기`를 추가해 같은 provider report를 통합/채널별로 확인할 수 있게 했다.
- 결재 상세 화면은 연관 provider 근거를 먼저 보여주되, 나머지 provider report도 유지해 현재 결재 화면에서 전체/구분 근거를 함께 확인한다.
- readiness와 read-only sync 기본 label도 `스마트스토어(스티커씨)`, `쇼핑몰(커피프린트)` 기준으로 정리했다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/agenda-room-view-model.test.ts tests/application/approval-detail-view-model.test.ts` | passed, 2 files / 7 tests |
| `npm test -- --run` | passed, 18 files / 63 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| in-app browser approval detail | `전체 4건`, `스마트스토어(스티커씨)`, `쇼핑몰(커피프린트)`, `전체 근거`, `구분 보기`, 스티커씨/커피프린트 집계 label visible |

### Notes

- 기존 외부 provider write gate는 그대로 닫혀 있다.
- 이번 iteration은 표시/검토 범위 hardening이며, 실제 스마트스토어/쇼핑몰 쓰기 executor는 열지 않는다.

## Next

QA/report packaging까지 완료했다. `docs/05-qa/ops-persistence-provenance-foundation.qa-report.md`는 `QA_PASS`, `docs/04-report/ops-persistence-provenance-foundation.report.md`는 completion rate 98%로 정리했다. 다음 PDCA 후보는 FollowUpInternalTask 전용 큐와 owner learning, 실제 LLM cost governance, `/operations` per-card provenance drilldown이다. 실제 provider write는 계속 차단한다.
