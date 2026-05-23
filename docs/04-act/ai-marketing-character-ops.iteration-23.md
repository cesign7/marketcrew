# ai-marketing-character-ops Act Iteration 23

> **Module/Goal**: `module-25 결재 상태 용어 정리`로 초안 승인과 실제 외부 반영의 경계를 화면에서 명확히 한다.
> **Check Source**: 대표 질문 - 초안만 승인이 어떤 상태인지 명확하지 않음
> **Date**: 2026-05-23
> **Status**: Done

## Context

`APPROVE_DRAFT_ONLY`는 광고, 상품, CRM에 바로 반영하지 않고 내부 작업물만 확정하는 결정이다. 그런데 화면 문구가 `초안만 승인`, `승인됨`, `실행됨`처럼 보이면 대표가 실제 외부 반영과 혼동할 수 있다.

이번 iteration은 내부 enum과 저장 계약은 유지하고, 운영자에게 보이는 표현만 `초안 확정 · 외부 미반영` 흐름으로 정리했다.

## Changes

| Area | Result |
|------|--------|
| 결재 버튼 | `초안만 승인`을 `초안 확정`으로 변경했다. |
| 제출 결과 | draft-only 응답은 `초안 확정이 기록됐습니다.`로 표시한다. |
| 후속 업무 | `초안 확정 범위로 내부 작업을 정리하고 외부 반영 전 재상신`으로 업무명을 바꿨다. |
| 성과 보고 | draft-only outcome summary를 `초안 확정만 기록`으로 정리했다. |
| 운영실 상태 | draft-only로 승인된 안건은 `초안 확정됨`, 실행 대기열은 `내부 초안`으로 표시한다. |
| 학습 신호 | 후속 업무 큐의 대표 결정 라벨과 초안 우선 패턴 설명을 `초안 확정` 기준으로 바꿨다. |

## Safety Contract

- `APPROVE_DRAFT_ONLY` 내부 enum은 유지한다.
- 외부 광고, 상품, CRM write는 계속 차단한다.
- `초안 확정`은 외부 반영 완료가 아니라 내부 작업 방향 승인 상태다.
- 외부 반영 전에는 별도 재상신과 대표 결재가 필요하다.

## Verification

| Check | Result |
|-------|--------|
| Targeted tests | `npm test -- tests/application/agenda-room-view-model.test.ts tests/application/follow-up-queue-view-model.test.ts tests/api/approval-decision-route.test.ts tests/application/provider-outcome-analysis.test.ts tests/api/follow-up-route.test.ts tests/application/agent-run-recorder.test.ts` passed, 6 files / 20 tests |
| Full unit tests | `npm test -- --run` passed, 49 files / 127 tests |
| Typecheck | `npm run typecheck` passed |
| Build | `npm run build` passed |
| Audit | `npm audit --omit=dev` passed, 0 vulnerabilities |
| Browser smoke | production build server에서 결재 상세 `초안 확정` 버튼 표시, 기존 `초안만 승인` 버튼 0건 |
| E2E smoke | `npx playwright test tests/e2e/follow-ups-smoke.spec.ts` passed |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 완료된 MVP 위에서 결재 상태 언어를 더 정확하게 다듬은 운영 UX 개선이다.

## Next

다음 순서는 실제 운영 모드에서 샘플/규칙/실제 AI 판단 출처를 카드별로 더 명확히 구분하는 것이다. 실제 provider write executor는 별도 PDCA와 명시 승인 전까지 시작하지 않는다.
