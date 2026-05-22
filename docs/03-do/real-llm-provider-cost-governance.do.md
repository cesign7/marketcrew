# real-llm-provider-cost-governance Do Log

> **Project**: marketcrew2
> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4
> **Status**: Complete
> **Started**: 2026-05-22 KST

---

## Scope

이번 Do 단계는 실제 LLM adapter를 붙이기 전에 호출 비용과 token 안전장치를 운영실에서 확인할 수 있게 만드는 slice다. 대표가 볼 자료만으로 승인하는 흐름은 유지하되, LLM 비용은 대표 모르게 자동으로 쓰이지 않도록 한다.

## Module Map

| Module | Goal | Status |
|--------|------|--------|
| module-6 | LLM 인터페이스의 실제 호출 전 비용 governance | Complete |
| operations-ui | `/operations` 비용 가드 패널 | Complete |
| api-tests-docs | read-only API, tests, PDCA 문서 | Complete |

## Iteration 1 - LLM Cost Governance Gate

### Completed

- `LlmCostGovernanceView`를 추가했다.
- `buildLlmCostGovernanceView`를 추가해 아래 조건을 계산한다.
  - provider/key readiness
  - 입력/출력 1K token KRW 단가 정책
  - 1회 호출 예산
  - 일 예산과 오늘 누적 AgentRun 비용
  - 입력/출력/총 token cap
  - raw row privacy
  - external write gate 분리
- `/operations`에 `LlmCostGovernancePanel`을 추가했다.
- `/api/operations/llm-cost-governance` read-only route를 추가했다.
- `tests/application/llm-cost-governance.test.ts`를 추가했다.
- `tests/e2e/llm-cost-governance-smoke.spec.ts`를 추가했다.

### Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/llm-cost-governance.test.ts tests/application/agenda-room-view-model.test.ts` | passed, 2 files / 5 tests |
| `npm test -- --run` | passed, 21 files / 70 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed, `/api/operations/llm-cost-governance` included |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/llm-cost-governance-smoke.spec.ts` | passed, 1 chromium test |
| `curl -I http://localhost:3001/operations` | HTTP 200 |
| `curl http://localhost:3001/api/operations/llm-cost-governance` | returned `live call 차단`, provider `gemini`, key configured, budget/rate missing |

## Remaining

Check/QA/report까지 완료했다. 실제 LLM call과 외부 provider write는 계속 차단한다.
