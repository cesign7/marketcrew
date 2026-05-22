# real-llm-provider-cost-governance Iteration 3

> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4 follow-up
> **Module/Goal**: `module-6 LLM 인터페이스`의 저장된 AI 운영 설정을 실제 비용 가드에 연결
> **Date**: 2026-05-23 KST
> **Status**: Complete

---

## Goal

`/people` 인사과와 `/settings`에서 저장한 AI 예산/모델 설정이 단순 표시로 끝나지 않고, `/operations`와 `/settings`의 실제 AI 비용 가드 계산에 반영되게 한다.

## Implemented Slice

| Area | Change |
|------|--------|
| Repository integration | 저장된 `AiOperationsSettings`를 agenda room view model에서 읽어 비용 가드에 전달 |
| Cost policy | env 원화 단가가 없으면 저장된 환율과 공식 모델 가격표로 입력/출력 1천 토큰 단가 계산 |
| Budget policy | 저장된 월/일/1회 예산과 입력/출력/총 토큰 상한을 비용 가드 gate에 반영 |
| Monthly visibility | 이번 달 누적 비용, 월 예산, 호출 후 월 잔여 예산 표시 추가 |
| Model visibility | 캐릭터별 저장 모델도 공식 가격 기준 목록에 포함 |
| Tests | 저장된 AI 운영 설정이 비용 가드에 적용되는 application test 추가 |

## Safety Boundary

- env에 `AI_LLM_COST_PER_1K_INPUT_KRW`, `AI_LLM_COST_PER_1K_OUTPUT_KRW`가 있으면 env 단가를 우선한다.
- 저장 설정은 실제 외부 provider write나 실제 LLM adapter 호출을 열지 않는다.
- provider credential은 선택된 provider 기준으로 다시 확인한다.
- 공식 가격표에 없는 모델은 여전히 `공식 단가 미확인`으로 남긴다.

## Verification

| Command | Result |
|---------|--------|
| `npm run typecheck` | passed |
| `npm test -- --run` | passed, 32 files / 96 tests |
| `npm run build` | passed |
| `npm run test:e2e -- tests/e2e/llm-cost-governance-smoke.spec.ts tests/e2e/navigation-structure-smoke.spec.ts` | passed, 9 chromium tests |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 iteration은 1차 MVP의 범위를 넓힌 것이 아니라, 이미 추가된 인사과/AI 예산 설정이 실제 호출 전 비용 판단에 반영되도록 닫은 후속 hardening이다. 실제 LLM adapter 호출과 외부 provider write는 계속 1차 MVP 밖의 확장으로 둔다.

