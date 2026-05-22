# real-llm-provider-cost-governance Completion Report

> **Project**: marketcrew2
> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4
> **Date**: 2026-05-22 KST
> **Status**: Complete
> **1차 MVP 대비 진행율**: 100%

---

## Completed

실제 LLM 호출을 켜기 전에 비용과 token 안전장치를 운영실과 설정에서 확인하는 slice를 완료했다.

| Area | Result |
|------|--------|
| View model | `buildLlmCostGovernanceView` 추가 |
| Official pricing | Google AI 공식 가격표 기준 `gemini-3.5-flash`, `gemini-3.1-flash-lite` USD reference 단가 추가 |
| UI | `/operations`, `/settings`에 `LLM 비용 가드`와 `공식 가격 기준` 표시 |
| API | `/api/operations/llm-cost-governance` read-only route 추가 |
| Tests | unit/application/e2e smoke에 공식 가격 기준 assertion 추가 |
| Docs | plan/design/do/act/check/qa/report 작성 |

## Operator Behavior

현재 local env 상태에서는 provider/key는 준비되어 있지만 비용 단가와 예산 env가 없기 때문에 운영실은 `live call 차단`을 보여준다. 공식 USD 가격 기준은 참고로 표시하고, 실제 KRW 계산은 env 단가가 있어야만 열린다. deterministic fallback은 계속 동작한다.

## Changed Files

| Type | Files |
|------|-------|
| Feature | `src/features/agenda-room/buildLlmCostGovernanceView.ts`, `src/features/agenda-room/types.ts`, `src/features/agenda-room/buildAgendaRoomViewModel.ts`, `src/lib/llm/official-pricing.ts` |
| UI | `src/components/agenda-room/LlmCostGovernancePanel.tsx`, `src/app/operations/page.tsx`, `src/app/globals.css` |
| API | `src/app/api/operations/llm-cost-governance/route.ts` |
| Tests | `tests/application/llm-cost-governance.test.ts`, `tests/application/agenda-room-view-model.test.ts`, `tests/e2e/llm-cost-governance-smoke.spec.ts` |
| Docs | `docs/01-plan/features/real-llm-provider-cost-governance.plan.md`, `docs/02-design/features/real-llm-provider-cost-governance.design.md`, `docs/03-do/real-llm-provider-cost-governance.do.md`, `docs/04-act/real-llm-provider-cost-governance.iteration-1.md`, `docs/04-act/real-llm-provider-cost-governance.iteration-2.md`, `docs/03-analysis/real-llm-provider-cost-governance.analysis.md`, `docs/05-qa/real-llm-provider-cost-governance.qa-report.md`, `docs/04-report/real-llm-provider-cost-governance.report.md` |

## Verification

| Command | Result |
|---------|--------|
| `npm test -- --run` | passed, 26 files / 80 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/llm-cost-governance-smoke.spec.ts` | passed |
| `curl -I http://localhost:3001/operations` | HTTP 200 |
| `curl http://localhost:3001/api/operations/llm-cost-governance` | `live call 차단`, provider `gemini`, key configured, budget/rate missing |
| Browser smoke `http://localhost:3001/settings` | 공식 가격 기준, Gemini 3.5 Flash, Gemini 3.1 Flash-Lite, 공식 가격 formula visible |

## Remaining Risk

| Risk | Status |
|------|--------|
| 실제 LLM 비용 단가/예산 정책 미확정 | 공식 USD 기준은 표시됨. 대표가 환율/buffer를 반영한 env 정책값을 정하면 재검증 필요 |
| 실제 LLM adapter 미구현 | 다음 PDCA 후보 |
| 외부 provider write | 계속 차단, 별도 명시 승인 전까지 시작하지 않음 |

## Next Candidates

1. 실제 LLM adapter dry-run: cost governance gate를 통과할 때만 provider call 후보 생성.
2. normalized analytics schema: Smartstore/Youngcart/Search Ad 분석 테이블 정규화.

## 2026-05-22 Closeout Note

`/operations` per-card provenance drilldown은 `mvp-final-provenance-closeout`에서 완료했다. 1차 MVP 대비 진행율은 100%로 닫았다.

## 2026-05-22 Official Pricing Follow-up

Google AI 공식 Gemini Developer API pricing에서 현재 설정 모델 가격을 확인해 `/settings`에 표시했다.

| Model | Official standard paid tier |
|-------|-----------------------------|
| `gemini-3.5-flash` | input $1.50 / 1M tokens, output $9.00 / 1M tokens |
| `gemini-3.1-flash-lite` | input $0.25 / 1M tokens, output $1.50 / 1M tokens |

실제 호출 허용은 여전히 env 원화 단가, 1회 예산, 일 예산, token cap gate가 모두 통과해야 한다.
