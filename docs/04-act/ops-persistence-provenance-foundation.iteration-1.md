# ops-persistence-provenance-foundation Iteration 1

> **완성 대상 모듈/목표**: module-1 `AgentRun` domain/repository contract, module-2 file/memory repository persistence.
>
> **Status**: Complete
> **Date**: 2026-05-22 KST

---

## What Changed

| Area | Result |
|------|--------|
| Domain | `AgentRun`, token/cost usage, workflow object ref, workflow link 타입을 추가했다. |
| Repository | 기존 `MarketingWorkflowRepository`가 `AgentRun`과 workflow link 저장/조회까지 지원한다. |
| File Store | `.marketcrew/workflow-store.json` 구조에 `agentRuns`, `agentRunWorkflowLinks` collection이 추가되며, 기존 파일은 빈 배열 fallback으로 읽힌다. |
| Memory Store | 테스트와 deterministic flow용 memory repository도 같은 계약을 지원한다. |
| Workflow Summary | `/api/operations/workflow-state` summary에 agent run count와 recent run ids가 포함될 준비가 됐다. |
| Tests | memory/file repository contract test를 추가했고 전체 Vitest와 typecheck를 통과했다. |

## Decisions

- DB driver/tooling 도입은 이번 iteration에서 하지 않았다.
- 기존 workflow repository contract를 제거하거나 이름을 바꾸지 않았다.
- `AgentRun`은 실제 LLM뿐 아니라 deterministic fallback, provider read-only sync, mock execution까지 감사 단위로 다룬다.
- raw provider row와 credential 저장 금지 원칙은 유지한다.

## Verification Evidence

```text
npm test -- --run tests/persistence/agent-run-repository.test.ts tests/persistence/file-repository.test.ts
Test Files  2 passed (2)
Tests       5 passed (5)

npm test -- --run
Test Files  16 passed (16)
Tests       56 passed (56)

npm run typecheck
passed

npm run build
passed

curl http://127.0.0.1:3001/operations
200

existing-server Playwright smoke
browser-smoke-ok agentRuns=0 links=0
```

## Next Iteration

`AgentRunRecorder`를 추가하고 `buildPlannerAuditRun`, provider sync, owner decision flow에서 같은 run payload를 만들도록 연결한다. 이후 DB-backed repository와 local JSON import로 넘어간다.
