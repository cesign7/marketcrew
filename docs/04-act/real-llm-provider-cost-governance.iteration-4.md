# real-llm-provider-cost-governance Iteration 4

> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4 follow-up
> **Module/Goal**: 인사과/설정 화면의 운영 접속 오류 수정
> **Date**: 2026-05-23 KST
> **Status**: Complete

---

## Problem

`/settings`와 `/people`은 AI 설정과 모델별 사용 명세만 필요했지만, hosted Vercel 화면에서 전체 `/api/operations/workflow-state`를 다시 읽고 있었다. 운영에서 해당 full state fetch가 실패하면 두 화면이 `Vercel 화면 런타임에서는 Railway 백엔드 workflow state가 필요합니다.` 오류로 렌더링되지 않았다.

## Implemented Slice

| Area | Change |
|------|--------|
| Targeted read | `/api/settings/ai-operations` 응답에 `peopleOfficeView`를 함께 포함 |
| Page loader | `/settings`, `/people`이 전체 workflow-state 대신 AI 설정 전용 Railway 응답을 사용 |
| Cache | AI 설정 저장 성공 후 운영실 view model/read-through cache를 비움 |
| Regression test | hosted runtime에서 AI 설정 전용 응답만 쓰고 workflow-state fallback을 호출하지 않는 테스트 추가 |

## Verification

| Command | Result |
|---------|--------|
| `npm run typecheck` | passed |
| `npm test -- --run tests/application/ai-operations-view-loader.test.ts tests/application/llm-cost-governance.test.ts` | passed, 2 files / 6 tests |
| `npm test -- --run` | passed, 33 files / 97 tests |
| `npm run build` | passed |
| `npm run test:e2e -- tests/e2e/navigation-structure-smoke.spec.ts` | passed, 8 chromium tests |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 작업은 운영 화면 접속 안정화이며 실제 LLM 호출과 외부 provider write는 계속 닫아 둔다.

