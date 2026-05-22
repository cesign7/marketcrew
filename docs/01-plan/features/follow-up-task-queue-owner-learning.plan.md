# follow-up-task-queue-owner-learning Plan

> **Status**: Complete
>
> **Project**: marketcrew2
> **Feature**: `follow-up-task-queue-owner-learning`
> **PDCA Cycle**: #3
> **Created**: 2026-05-22 KST

---

## Executive Summary

| Item | Content |
|------|---------|
| **Problem** | 1차 MVP와 운영 DB/provenance 기반은 대표 결정 이후 `FollowUpInternalTask`를 만들지만, 담당 캐릭터가 볼 전용 큐와 대표 결정 패턴 학습 요약이 부족하다. |
| **Solution** | 후속 업무를 캐릭터별 큐로 보여주고, 대표 결정/메모/preflight 차단/write gate/outcome 상태를 owner learning 신호로 요약한다. |
| **Function/UX Effect** | 대표는 `/follow-ups`에서 오피, 데이 등 담당자별 열린 업무를 보고 완료 처리하며, 다음 추천에 반영될 결정 기준을 확인한다. |
| **Core Value** | “결재하면 바로 반영” 이후의 일이 사라지지 않고, AI 직원의 다음 업무와 향후 추천 기준으로 남는다. |

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 승인/보류/근거 요청/쓰기 차단 이후의 내부 일이 관리되지 않으면 대표는 다시 직접 기억하고 챙겨야 한다. |
| **WHO** | 대표와 오피는 결재 이후 내려간 업무를 담당 캐릭터별로 확인하고 닫아야 한다. |
| **RISK** | 후속 업무 큐가 실제 외부 실행처럼 보이거나, 완료 상태가 저장되지 않거나, 대표 메모가 다음 추천 기준으로 연결되지 않을 수 있다. |
| **SUCCESS** | `/follow-ups`에서 후속 업무, source approval, 최신 대표 결정, 차단 사유, outcome, owner learning 신호가 보이고 OPEN/DONE 상태 변경이 저장된다. |
| **SCOPE** | view model, `/follow-ups` UI, follow-up status API, tests, docs. 실제 provider write나 자동 실행은 제외한다. |

## Goals

1. `FollowUpInternalTask`를 담당 캐릭터별 큐로 보여준다.
2. 각 업무가 어떤 결재안, 대표 결정, outcome, 차단 사유에서 내려왔는지 보여준다.
3. 후속 업무를 `OPEN`과 `DONE`으로 상태 변경할 수 있게 한다.
4. 대표 결정/메모/write gate/preflight/outcome을 owner learning 신호로 요약한다.
5. 외부 provider write는 계속 차단한다.

## Non-Goals

| Item | Reason |
|------|--------|
| 실제 provider write executor | 별도 policy, rollback proof, 명시 승인이 필요하다. |
| LLM 기반 자동 재추천 | 이번 slice는 deterministic owner learning summary까지다. |
| 복잡한 업무 관리 도구 | MVP는 담당 캐릭터별 열린 업무와 완료 처리만 먼저 증명한다. |
| 알림/스케줄러 | 후속 heartbeat/cron은 별도 cycle에서 다룬다. |

## Functional Requirements

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-01 | `/follow-ups` 전용 route를 만든다. | 운영자가 브라우저에서 후속 업무 큐를 볼 수 있다. |
| FR-02 | 담당 캐릭터별 queue를 만든다. | 오피/그로/프로/카피/리피/마루/데이 별 open/done count와 task list가 보인다. |
| FR-03 | source approval provenance를 보여준다. | 각 task에 approval title, approval status, 최신 대표 결정, outcome 상태, blocker가 보인다. |
| FR-04 | task status update API를 만든다. | `PATCH /api/follow-ups/[id]`가 `OPEN`/`DONE`을 저장한다. |
| FR-05 | owner learning summary를 만든다. | decision count, draft-first pattern, write gate block, top blocker, open load, outcome wait가 보인다. |
| FR-06 | `/operations`에서 후속 업무로 이동할 수 있다. | topbar에 `후속 업무` link가 있다. |

## Success Criteria

| # | Criteria |
|---|----------|
| SC-1 | `/follow-ups`가 후속 업무 요약과 담당 캐릭터별 큐를 렌더링한다. |
| SC-2 | 각 task는 source approval, latest decision, outcome, blocker, learning note를 가진다. |
| SC-3 | follow-up task를 `DONE`과 `OPEN`으로 바꾸면 저장소에 반영된다. |
| SC-4 | owner learning signal이 대표 결정과 차단 사유에서 계산된다. |
| SC-5 | `/operations`에서 `/follow-ups`로 이동할 수 있다. |
| SC-6 | unit/API/typecheck/build/browser smoke가 통과한다. |
| SC-7 | 실제 외부 provider write는 열리지 않는다. |

## Next Step

Iteration 1은 deterministic queue/view model, UI, status API를 구현한다. 이후 Check에서 browser smoke와 API 상태 변경을 검증한다.
