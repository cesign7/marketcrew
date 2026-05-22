# real-llm-provider-cost-governance Iteration 2

> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4 follow-up
> **Module/Goal**: `module-6 LLM 인터페이스`의 공식 모델 가격 기준을 설정 화면에 반영
> **Date**: 2026-05-22 KST
> **Status**: Complete

---

## Goal

대표가 `/settings`에서 현재 설정된 LLM 모델의 공식 가격 기준을 바로 확인하고, 실제 호출 비용 계산이 어떤 env 단가로 열리는지 구분할 수 있게 한다.

## Implemented Slice

| Area | Change |
|------|--------|
| Official source | Google AI 공식 Gemini Developer API pricing에서 `gemini-3.5-flash`, `gemini-3.1-flash-lite` 단가를 확인 |
| Pricing catalog | `src/lib/llm/official-pricing.ts`에 확인일이 있는 USD reference 단가 추가 |
| View model | 기본/전략/검토 모델을 중복 없이 모아 공식 가격 row로 반환 |
| Settings UI | `LlmCostGovernancePanel`에 `공식 가격 기준` 섹션과 공식 가격표 링크 추가 |
| Tests | application test와 Playwright smoke에 공식 가격 표시 assertion 추가 |

## Safety Boundary

- 공식 가격은 USD reference로만 표시한다.
- 실제 live call 차단 계산은 계속 `AI_LLM_COST_PER_1K_INPUT_KRW`, `AI_LLM_COST_PER_1K_OUTPUT_KRW`, 예산 env가 있어야만 수행한다.
- 공식 가격표에 없는 모델명은 `공식 단가 미확인`으로 표시한다.
- 실제 LLM provider 호출과 외부 provider write는 열지 않는다.

## Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/llm-cost-governance.test.ts` | passed, 4 tests |
| `npm test -- --run` | passed, 26 files / 80 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/llm-cost-governance-smoke.spec.ts` | passed |
| Browser smoke `http://localhost:3001/settings` | 공식 가격 기준, Gemini 3.5 Flash, Gemini 3.1 Flash-Lite, 공식 가격 formula visible |

## Follow-up

후속 실제 LLM adapter를 붙일 때도 이 공식 가격 reference와 env 원화 단가 gate를 분리해서 유지한다.
