# ops-persistence-provenance-foundation Iteration 4

> **완성 대상 모듈/목표**: module-3 runtime DB-backed repository switch.
>
> **Status**: Complete
> **Date**: 2026-05-22 KST

---

## What Changed

| Area | Result |
|------|--------|
| Repository mode | `MARKETCREW_REPOSITORY_MODE=file|db`를 추가했다. |
| DB runtime | `MARKETCREW_REPOSITORY_MODE=db`일 때 `createLocalWorkflowRepository()`가 Postgres repository를 반환한다. |
| DB bridge | `scripts/postgres-workflow-bridge.mjs`가 `workflow_records`를 read/write한다. |
| Shared state | file/DB repository가 같은 workflow collection key와 normalization helper를 사용한다. |
| Operations API | `/api/operations/workflow-state`가 `repositoryMode=db`, masked DB label, DB counts를 반환한다. |
| Local env | `.env`의 local runtime mode를 `db`로 전환했다. |

## Runtime Verification

| Check | Evidence |
|-------|----------|
| Postgres bridge read | approvalRequests=5, providerSyncReports=18, agentRuns=1, agentRunWorkflowLinks=5 |
| Postgres bridge write | `approvalRequests` 5건 idempotent save 완료 |
| Workflow state API | `repositoryMode=db`, masked `postgresql://marketcrew:***@localhost:5432/marketcrew?schema=public` |
| Browser smoke | `/operations`에서 `오늘 올라온 안건`, `승인 대기`, `AI 실행 감사 로그` 확인 |

## Test Evidence

```text
npm test -- --run tests/persistence/workflow-store-mode.test.ts tests/persistence/file-repository.test.ts tests/persistence/agent-run-repository.test.ts
3 files / 8 tests passed

npm test -- --run
18 files / 62 tests passed

npm run typecheck
passed

npm run build
passed

npm audit --omit=dev
found 0 vulnerabilities
```

## Decisions

- 현재 app/application layer는 동기식 `MarketingWorkflowRepository` contract를 유지한다.
- 이번 iteration은 안전한 local MVP 전환을 위해 server-side Node bridge로 Postgres JSONB mirror를 읽고 쓴다.
- 장기적으로 트래픽과 동시성이 커지면 async repository boundary 또는 ORM 기반 table-per-entity schema로 옮긴다.
- 실제 provider write는 계속 닫혀 있다.

## Next Iteration

module-5의 남은 UI/route 검증을 진행한다.

- `/approvals/[id]`에서 linked `AgentRun` timeline을 결재별로 보여준다.
- model/token/cost/failure/evidence summary를 결재 상세 화면에서 숨기지 않는다.
- DB mode에서 owner decision, execution result, outcome report, follow-up task가 저장되는 route-level smoke를 추가한다.
