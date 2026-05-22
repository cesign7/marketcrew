# follow-up-task-queue-owner-learning Design Document

> **Summary**: 대표 결정 이후 생성된 `FollowUpInternalTask`를 캐릭터별 큐와 owner learning summary로 보여준다.
>
> **Project**: marketcrew2
> **Version**: 0.1
> **Author**: Codex
> **Date**: 2026-05-22 KST
> **Status**: Complete
> **Planning Doc**: [follow-up-task-queue-owner-learning.plan.md](../../01-plan/features/follow-up-task-queue-owner-learning.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 승인/보류/근거 요청/쓰기 차단 이후의 내부 일이 관리되지 않으면 대표는 다시 직접 기억하고 챙겨야 한다. |
| **WHO** | 대표와 오피는 결재 이후 내려간 업무를 담당 캐릭터별로 확인하고 닫아야 한다. |
| **RISK** | 후속 업무 큐가 실제 외부 실행처럼 보이거나, 완료 상태가 저장되지 않거나, 대표 메모가 다음 추천 기준으로 연결되지 않을 수 있다. |
| **SUCCESS** | `/follow-ups`에서 후속 업무, source approval, 최신 대표 결정, 차단 사유, outcome, owner learning 신호가 보이고 OPEN/DONE 상태 변경이 저장된다. |
| **SCOPE** | view model, `/follow-ups` UI, follow-up status API, tests, docs. 실제 provider write나 자동 실행은 제외한다. |

## 1. Architecture Choice

| Option | Description | Tradeoff |
|--------|-------------|----------|
| A. Approval detail only | 상세 화면에 후속 업무를 더 붙인다. | 빠르지만 전용 큐가 되지 않는다. |
| B. Full task manager | Kanban/status/due date/assignee 변경까지 만든다. | 지금 MVP에는 과하다. |
| C. Dedicated deterministic queue | `/follow-ups`에서 repository data를 읽어 캐릭터별 큐와 owner learning summary를 계산한다. | 작고 검증 가능하다. |

**Selected**: Option C.

선택 이유는 현재 repository에 이미 `FollowUpInternalTask`, `OwnerDecision`, `PreflightCheck`, `ExecutionResult`, `OutcomeReport`가 저장되어 있기 때문이다. 새 LLM 호출 없이도 owner learning의 첫 버전을 만들 수 있다.

## 2. Data Flow

```text
MarketingWorkflowRepository
  -> listFollowUpInternalTasks
  -> listApprovalRequests / listOwnerDecisions / listPreflightChecks / listExecutionResults / listOutcomeReports
  -> buildFollowUpQueueViewModel
  -> /follow-ups server page
  -> FollowUpQueueBoard / OwnerLearningPanel
  -> PATCH /api/follow-ups/[id]
  -> saveFollowUpInternalTasks
```

## 3. View Model

| Type | Purpose |
|------|---------|
| `FollowUpQueueViewModel` | generatedAt, summary, characterQueues, ownerLearningSignals |
| `FollowUpCharacterQueueView` | 캐릭터별 open/done count와 task list |
| `FollowUpTaskQueueItemView` | source approval, latest decision, outcome, blockers, learning note |
| `OwnerLearningSignalView` | 대표 결정과 차단 사유 기반 요약 신호 |

## 4. API

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/api/follow-ups/[id]` | PATCH | body `{ status: "OPEN" | "DONE" }`를 검증한 뒤 task status를 저장한다. |

API는 provider write와 연결하지 않는다. 저장소의 `saveFollowUpInternalTasks`만 호출한다.

## 5. UI

| Surface | Content |
|---------|---------|
| `/operations` topbar | `후속 업무` 이동 버튼 |
| `/follow-ups` header | 열린 후속 업무, 완료 업무, 연결된 결재안, 학습 신호 요약 |
| Owner learning | 대표 결정 학습, 초안 우선 패턴, 쓰기 게이트 차단, 반복 차단 사유, 미완료 업무, 성과 판단 대기 |
| Character queue | 7개 캐릭터별 업무 list, source approval link, blocker, next action, 완료/재오픈 버튼 |

## 6. Safety

- `FollowUpInternalTask` status만 변경한다.
- 외부 provider API를 호출하지 않는다.
- 실제 write gate 값을 바꾸지 않는다.
- 대표 메모는 화면 요약에만 사용하고 LLM prompt로 보내지 않는다.

## 7. Implementation Guide

### 7.1 Module Map

| Module | Goal | Files |
|--------|------|-------|
| module-1 | view model + API | `src/features/follow-ups/*`, `src/app/api/follow-ups/[id]/route.ts` |
| module-2 | UI route + components | `src/app/follow-ups/page.tsx`, `src/components/follow-ups/*`, `src/app/globals.css` |
| module-3 | tests/docs/check | `tests/application/follow-up-queue-view-model.test.ts`, `tests/api/follow-up-route.test.ts`, PDCA docs |

### 7.2 Session Plan

1. Implement deterministic view model and status API.
2. Add `/follow-ups` UI and `/operations` link.
3. Verify with unit/API tests, typecheck, build, and browser smoke.
