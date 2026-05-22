# ops-persistence-provenance-foundation Iteration 5

> **완성 대상 모듈/목표**: module-5 `/approvals/[id]` linked `AgentRun` timeline and DB mode route smoke.
>
> **Status**: Complete
> **Date**: 2026-05-22 KST

---

## What Changed

| Area | Result |
|------|--------|
| Approval detail view model | 결재별 `agentRunTimeline`을 추가했다. |
| Linked run resolution | approval, owner decision, preflight, execution, checkpoint, outcome, follow-up, provider source report link를 모은다. |
| UI | `/approvals/[id]`에 `이 결재의 AgentRun 타임라인` 섹션을 추가했다. |
| Run metadata | runner, status, provider/model, mode, token, cost, evidence count, input/output summary, linked object, relation을 표시한다. |
| E2E isolation | Playwright 기본 e2e는 `MARKETCREW_REPOSITORY_MODE=file`로 고정해 `.env` DB mode와 분리했다. |
| DB smoke | 3001 live DB mode에서 decision route 저장과 workflow-state count를 확인했다. |

## Verification Evidence

```text
npm test -- --run
18 files / 63 tests passed

npm run typecheck
passed

npm run build
passed

npm run test:e2e -- --project=chromium tests/e2e/approval-detail-smoke.spec.ts
1 passed

npm audit --omit=dev
found 0 vulnerabilities

DB mode workflow-state
repositoryMode=db
agentRuns=2
agentRunWorkflowLinks=13
```

## Browser Evidence

`http://localhost:3001/approvals/approval-agenda-season-plan-buddha-gift-card`에서 아래 문구를 확인했다.

- `이 결재의 AgentRun 타임라인`
- `local / owner-decision-workflow`
- `이 결재의 provider 수집 근거`
- `저장된 성과 보고`

## Decisions

- 결재 상세은 summary만 보여주지 않고, 실제 연결된 `AgentRun`과 workflow object relation을 직접 보여준다.
- provider evidence는 기존 provider sync panel과 timeline의 provider source report link를 함께 사용한다.
- e2e 기본 저장소는 파일 격리를 유지하고, DB mode 검증은 live smoke로 분리한다.
- 외부 provider write는 계속 닫혀 있다.

## Next

`ops-persistence-provenance-foundation`은 Check 단계로 넘길 수 있는 상태다. 다음 작업은 acceptance criteria 재점검, 문서/테스트 gap 확인, 필요 시 최종 hardening iteration이다.
