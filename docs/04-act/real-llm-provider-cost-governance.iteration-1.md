# real-llm-provider-cost-governance Iteration 1

> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4
> **Module/Goal**: `module-6 LLM 인터페이스`의 실제 호출 전 비용 governance 완성
> **Date**: 2026-05-22 KST
> **Status**: Complete

---

## Goal

실제 Gemini/OpenAI 호출을 붙이기 전에 `/operations`에서 대표가 비용/예산/token/privacy gate를 확인할 수 있게 한다.

## Implemented Slice

| Area | Change |
|------|--------|
| View model | `buildLlmCostGovernanceView`로 provider/key, env 단가, 예산, token cap, raw row, external write gate를 계산 |
| Operations UI | `LlmCostGovernancePanel` 추가, planner preview 아래 배치 |
| API | `/api/operations/llm-cost-governance` read-only 조회 추가 |
| Tests | cost governance unit test, agenda room integration assertion, Playwright smoke 추가 |
| Docs | plan/design/do/iteration 문서 추가 |

## Safety Boundary

- 실제 LLM provider 호출은 구현하지 않았다.
- API key 값은 표시하지 않는다.
- env 단가가 없으면 비용을 추정하지 않고 live call을 차단한다.
- 외부 provider write는 계속 차단한다.

## Verification

| Command | Result |
|---------|--------|
| `npm test -- --run` | passed, 21 files / 70 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/llm-cost-governance-smoke.spec.ts` | passed |
| `curl -I http://localhost:3001/operations` | HTTP 200 |

## Next

이 iteration이 완료되면 다음 후보는 실제 LLM adapter dry-run 또는 `/operations` per-card provenance drilldown이다. live adapter는 이 비용 가드를 통과한 뒤에만 붙인다.
