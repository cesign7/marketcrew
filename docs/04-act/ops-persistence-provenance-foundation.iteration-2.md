# ops-persistence-provenance-foundation Iteration 2

> **완성 대상 모듈/목표**: module-4 `AgentRunRecorder` 연결, module-5 `/operations` agent run summary 부분 표시.
>
> **Status**: Complete
> **Date**: 2026-05-22 KST

---

## What Changed

| Area | Result |
|------|--------|
| Recorder | `recordPlannerAgentRun`, `recordProviderSyncAgentRuns`, `recordOwnerDecisionAgentRun`을 추가했다. |
| Planner | 오피 deterministic planner audit이 `AgentRun`으로 저장되고 추천 approval에 연결된다. |
| Provider Sync | read-only provider sync report가 provider sync `AgentRun`으로 저장된다. |
| Owner Decision | 대표 결정 처리 결과가 local `AgentRun`으로 저장되고 approval/execution/outcome/follow-up에 연결된다. |
| Operations UI | `/operations`에 `AI 실행 감사 로그` 패널을 추가해 runs, tokens, cost, 최근 실행 근거를 표시한다. |
| Rendering | `/operations`를 dynamic route로 고정해 local workflow store의 최신 실행 이력을 읽게 했다. |

## Decisions

- 실제 provider write는 계속 차단했다.
- provider sync run은 LLM 비용이 없으므로 token/cost를 0으로 기록한다.
- deterministic fallback planner는 실제 과금이 없지만 token estimate는 `estimated=true`로 남긴다.
- `/approvals/[id]`의 결재별 run timeline은 DB-backed repository와 상세 조회 모델이 생긴 뒤 다음 slice에서 붙인다.

## Verification Evidence

```text
npm test -- --run tests/application/agent-run-recorder.test.ts tests/application/approval-workflow.test.ts tests/api/approval-decision-route.test.ts
Test Files  3 passed (3)
Tests       10 passed (10)

npm test -- --run
Test Files  17 passed (17)
Tests       59 passed (59)

npm run typecheck
passed

npm run build
passed
/operations -> dynamic

existing-server Playwright smoke
browser-smoke-ok runs=1 links=5
```

## Next Iteration

DB-backed repository와 local JSON import를 구현한다. 기존 file repository fallback은 유지하고, import count 검증과 idempotent upsert 테스트를 먼저 둔다.
