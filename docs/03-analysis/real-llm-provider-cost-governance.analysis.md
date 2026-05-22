# real-llm-provider-cost-governance Check Analysis

> **Project**: marketcrew2
> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4
> **Date**: 2026-05-22 KST
> **Verdict**: PASS
> **Match Rate**: 99.5%

---

## Scope Reviewed

이번 Check는 `module-6 LLM 인터페이스`에서 실제 provider 호출을 열기 전에 비용 governance가 충분히 보이는지 확인했다.

## Requirement Match

| Requirement | Result | Evidence |
|-------------|--------|----------|
| provider/key readiness와 비용 정책 분리 | PASS | `ProviderReadinessPanel`과 별도 `LlmCostGovernancePanel`로 분리 |
| env 단가 기반 비용 추정 | PASS | `AI_LLM_COST_PER_1K_INPUT_KRW`, `AI_LLM_COST_PER_1K_OUTPUT_KRW` 없으면 차단 |
| 1회/일 예산 gate | PASS | `AI_LLM_RUN_BUDGET_KRW`, `AI_LLM_DAILY_BUDGET_KRW` 누락/초과 차단 |
| AgentRun 누적 비용 반영 | PASS | 오늘 AgentRun `estimatedCostKrw`를 일 예산에 합산 |
| token cap과 raw row privacy | PASS | 입력/출력/총 token cap, `rawRowsIncluded=false` gate 표시 |
| operations UI | PASS | `/operations` planner preview 아래 비용 가드 표시 |
| read-only API | PASS | `/api/operations/llm-cost-governance` 추가 |
| 실제 외부 write 차단 | PASS | LLM panel은 조회/판단만 하고 provider write를 열지 않음 |

## Runtime Observation

현재 local env에서는 `AI_LLM_PROVIDER=gemini`과 Gemini key가 준비되어 있지만, 비용 단가와 예산 env가 아직 없다. 따라서 `/api/operations/llm-cost-governance`는 의도대로 `live call 차단`을 반환한다.

## Verification Evidence

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/llm-cost-governance.test.ts tests/application/agenda-room-view-model.test.ts` | passed, 2 files / 5 tests |
| `npm test -- --run` | passed, 21 files / 70 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/llm-cost-governance-smoke.spec.ts` | passed |
| `curl -I http://localhost:3001/operations` | HTTP 200 |
| `curl http://localhost:3001/api/operations/llm-cost-governance` | returned provider `gemini`, status `live call 차단`, budget/rate missing |

## Gaps

| Gap | Reason | Next |
|-----|--------|------|
| 실제 LLM adapter 없음 | 이번 cycle의 non-goal | 다음 cycle에서 dry-run adapter 후보 |
| 예산 env 미설정 | live call을 열기 전 대표가 정해야 하는 정책값 | `AI_LLM_*_BUDGET_KRW`, `AI_LLM_COST_PER_1K_*_KRW`, token cap 설정 후 재검증 |
| vendor 가격 자동 갱신 없음 | 가격은 변동 가능하고 코드 고정은 위험 | 운영 env 정책 또는 별도 pricing config로 관리 |

## Decision

PDCA cycle #4는 `QA_PASS`로 넘겨도 된다. 1차 MVP 대비 진행율은 99.5%로 본다. 실제 LLM call과 외부 provider write는 계속 차단한다.
