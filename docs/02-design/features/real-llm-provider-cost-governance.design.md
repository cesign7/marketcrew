# real-llm-provider-cost-governance Design Document

> **Summary**: 실제 LLM 호출 전 provider/key, env 단가, 예산, token cap, privacy 조건을 검문하는 비용 가드를 운영실에 추가한다.
>
> **Project**: marketcrew2
> **Version**: 0.1
> **Author**: Codex
> **Date**: 2026-05-22 KST
> **Status**: Complete
> **Planning Doc**: [real-llm-provider-cost-governance.plan.md](../../01-plan/features/real-llm-provider-cost-governance.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 시즌성, 전년도 비교, 30일 분석이 늘어나면 LLM token 비용이 커질 수 있다. |
| **WHO** | 대표는 운영실에서 live LLM 호출 가능 여부와 차단 사유를 확인한다. |
| **RISK** | key 설정과 호출 허용을 혼동하거나, 코드에 가격을 고정하거나, raw row가 LLM 입력에 섞일 수 있다. |
| **SUCCESS** | 모든 비용/토큰/privacy gate를 통과해야만 live call 후보가 되고, 기본은 deterministic fallback이다. |
| **SCOPE** | view model, panel, API, tests. 실제 LLM call은 제외한다. |

## 1. Architecture Choice

| Option | Description | Tradeoff |
|--------|-------------|----------|
| A. Provider readiness에 비용 필드 추가 | 기존 LLM readiness 카드에 예산 정보를 섞는다. | 빠르지만 key readiness와 cost governance가 뒤섞인다. |
| B. Actual LLM adapter first | Gemini/OpenAI 호출을 먼저 만들고 비용을 사후 기록한다. | 위험하다. 호출 전에 예산 gate가 없다. |
| C. Dedicated cost governance view | `plannerAudit` 예상 token, `AgentRun` 누적 비용, env 정책을 합쳐 별도 패널로 보여준다. | 패널이 하나 늘지만 운영 판단이 명확하다. |

**Selected**: Option C.

## 2. Data Flow

```text
buildAgendaRoomViewModel
  -> buildPlannerAuditRun
  -> repository.listAgentRuns
  -> buildProviderReadinessReports
  -> buildLlmCostGovernanceView
  -> LlmCostGovernancePanel
  -> /api/operations/llm-cost-governance
```

## 3. Policy Inputs

| Env | Purpose |
|-----|---------|
| `AI_LLM_PROVIDER` | `gemini` 또는 `openai` 등 configured provider |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | provider별 credential readiness |
| `AI_LLM_MODEL_PLANNER` | planner 전용 모델명. 없으면 strategic/default 순서로 대체 |
| `AI_LLM_MODEL_STRATEGIC` | 전략/검토용 모델명 fallback |
| `AI_LLM_MODEL_DEFAULT` | 기본 모델명 fallback |
| `AI_LLM_COST_PER_1K_INPUT_KRW` | 입력 token 1K당 내부 계산 단가 |
| `AI_LLM_COST_PER_1K_OUTPUT_KRW` | 출력 token 1K당 내부 계산 단가 |
| `AI_LLM_RUN_BUDGET_KRW` | 1회 호출 예상 비용 상한 |
| `AI_LLM_DAILY_BUDGET_KRW` | 하루 누적+예상 비용 상한 |
| `AI_LLM_MAX_INPUT_TOKENS` | 입력 token hard cap |
| `AI_LLM_MAX_OUTPUT_TOKENS` | 출력 token hard cap |
| `AI_LLM_MAX_TOTAL_TOKENS` | 총 token hard cap |

단가는 vendor 가격을 코드에 넣지 않는다. 운영자가 env로 넣은 정책 단가가 있을 때만 KRW 예상 비용을 계산한다.

## 4. Gate Rules

| Gate | Pass | Block |
|------|------|-------|
| provider/key | provider와 provider별 key가 있음 | provider/key 누락 |
| 단가 정책 | 입력/출력 1K token KRW 단가가 있음 | 둘 중 하나라도 누락 |
| 1회 예산 | 이번 예상 비용 <= `AI_LLM_RUN_BUDGET_KRW` | 예산 누락 또는 초과 |
| 일 예산 | 오늘 AgentRun 비용 + 이번 예상 <= `AI_LLM_DAILY_BUDGET_KRW` | 예산 누락 또는 초과 |
| 입력/출력/총 token | cap 이내 | cap 초과 |
| raw row privacy | `rawRowsIncluded=false` | raw row 포함 |
| external write | LLM이 외부 channel에 직접 쓰지 않음 | external write gate가 열린 상태에서 재검토 필요 |

Token cap env가 없으면 `주의`로 표시하지만, 예산/단가 env가 없으면 `차단`이다.

## 5. UI

| Surface | Content |
|---------|---------|
| `/operations` | Planner preview 아래에 `LLM 비용 가드` 패널 |
| Header | status: `실행 가능`, `주의 후 가능`, `live call 차단` |
| Metrics | provider/model/key/mode |
| Budget | 이번 예상, 1회 한도, 오늘 누적, 일 예산, 호출 후 잔여 |
| Token | 입력/출력/총 token, raw row 제외 |
| Gate grid | provider/key, 단가, 예산, token, privacy, external write |

## 6. API

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/api/operations/llm-cost-governance` | GET | 운영실 view model에서 비용 가드, planner audit, AgentRun summary를 read-only로 반환 |

## 7. Safety

- 실제 LLM API를 호출하지 않는다.
- API key 값은 UI/API 응답에 표시하지 않는다.
- raw row와 고객 식별 정보는 planner input에 포함하지 않는다.
- 외부 provider write는 계속 별도 gate와 대표 명시 승인 대상이다.

## 8. Module/Iteration Map

| Iteration | Module/Goal | Files |
|-----------|-------------|-------|
| iteration-1 | `module-6 LLM 인터페이스`의 실제 호출 전 cost governance 완성 | `src/features/agenda-room/buildLlmCostGovernanceView.ts`, `src/components/agenda-room/LlmCostGovernancePanel.tsx`, `/api/operations/llm-cost-governance`, tests/docs |
