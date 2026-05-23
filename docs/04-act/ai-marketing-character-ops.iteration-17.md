# ai-marketing-character-ops Act Iteration 17

> **Module/Goal**: `module-22 AI 실행 큐 모의 실행`으로 실제 LLM adapter 호출 전 입력 범위, 비용 가드, 토큰, 근거, 감사 기록 계약을 고정한다.
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-16.md`
> **Date**: 2026-05-23
> **Status**: Done

## Context

`module-21`에서 데이의 근거 요청 처리와 검증 후 안건 승격까지 닫았다. 다음 단계는 실제 LLM provider를 바로 호출하는 것이 아니라, 비용 가드가 보는 입력과 모아가 읽을 근거 묶음이 무엇인지 먼저 큐로 보여주고 감사 기록을 남기는 것이다.

## Changes

| Area | Result |
|------|--------|
| Application | `buildLlmDryRunQueue`를 추가해 비용 가드, planner audit, 추천 결재 안건, 근거 ID를 `AI 실행 큐`로 변환했다. |
| Audit | `AgentRun.runType=llm_dry_run`을 추가하고, 실제 호출 없이 `local` provider와 `deterministic_fallback` mode로 모의 실행 기록을 저장한다. |
| Operations UI | `/operations`에 `AI 실행 큐` 패널을 추가해 `비용 가드 차단`, `모의 실행만 기록`, `원천 행 제외`, 토큰/근거 요약을 보여준다. |
| API | `GET /api/operations/llm-dry-run-queue`가 큐, planner audit, AgentRun 요약을 반환한다. |
| Compatibility | 오래된 backend view model에 `llmDryRunQueue`가 없으면 frontend가 기본 큐를 보강한다. |

## Safety Boundary

- 실제 LLM 호출은 구현하지 않았다.
- 비용 조건이 열려도 이번 slice는 `실제 호출 대기` 상태만 보여주며 `모의 실행만 기록`으로 남긴다.
- 원천 행은 큐와 AgentRun 모두에 포함하지 않는다.
- 실제 provider write는 계속 차단한다.

## Verification

| Check | Result |
|-------|--------|
| Red test | `npm test -- --run tests/application/llm-dry-run-queue.test.ts tests/components/llm-dry-run-queue-panel.test.ts tests/api/llm-dry-run-queue-route.test.ts`가 신규 계약 부재로 실패하는 것을 확인 |
| Targeted green | 같은 테스트 3 files / 5 tests 통과 |
| Existing regression | `tests/application/agenda-room-view-model.test.ts`, `tests/api/approval-decision-route.test.ts`, `tests/components/evidence-request-queue-panel.test.ts` 3 files / 9 tests 통과 |
| Full unit | `npm test` 45 files / 119 tests 통과 |
| Typecheck | `npm run typecheck` 통과 |
| Build | `npm run build` 통과, `/api/operations/llm-dry-run-queue` route 포함 |
| Browser smoke | `npm run test:e2e -- tests/e2e/navigation-structure-smoke.spec.ts --grep "대표 업무실"` 1 test 통과 |
| Security audit | `npm audit --omit=dev` 0 vulnerabilities |

## Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 닫힌 MVP 위에서 실제 LLM 호출 전 안전한 실행 큐를 추가한 후속 확장이다.

## Next

다음 안전 순서는 `llm_dry_run` 기록을 기준으로 실제 LLM adapter를 붙이되, 비용 가드 통과, 원천 행 제외, provider write 차단, 대표 승인 전 실행 금지를 계속 유지하는 것이다.
