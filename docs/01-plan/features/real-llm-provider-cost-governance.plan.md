# real-llm-provider-cost-governance Plan

> **Status**: Complete
>
> **Project**: marketcrew2
> **Feature**: `real-llm-provider-cost-governance`
> **PDCA Cycle**: #4
> **Created**: 2026-05-22 KST

---

## Executive Summary

| Item | Content |
|------|---------|
| **Problem** | Gemini/OpenAI 같은 실제 LLM key는 설정될 수 있지만, 호출 단가, 1회 예산, 일 예산, token cap이 보이지 않으면 대표가 비용 폭주 여부를 판단하기 어렵다. |
| **Solution** | `/operations`에 LLM 비용 가드를 추가해 provider/key readiness, env 단가, 예상 token, 1회/일 예산, 누적 AgentRun 비용, privacy gate를 한 번에 보여준다. |
| **Function/UX Effect** | 대표는 live LLM 호출을 켜기 전에 어떤 조건 때문에 차단/주의/가능인지 확인할 수 있다. |
| **Core Value** | 실제 LLM 도입을 “되는지”가 아니라 “비용과 근거가 통제되는지” 기준으로 연다. |

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 30일 비교, 시즌성, 전년도 비교가 늘어날수록 LLM 비용이 커질 수 있어 호출 전 budget gate가 필요하다. |
| **WHO** | 대표, 오피, 데이는 실제 LLM 호출 가능 여부와 비용 근거를 운영실에서 확인한다. |
| **RISK** | 단가를 코드에 고정하거나, key가 있다는 이유만으로 live call을 열거나, 원천 row가 LLM 입력에 섞일 수 있다. |
| **SUCCESS** | env 예산/단가/token cap이 없거나 초과하면 live call은 차단되고 deterministic fallback은 계속 동작한다. |
| **SCOPE** | view model, `/operations` UI panel, read-only API, tests, docs. 실제 LLM provider 호출 구현은 제외한다. |

## Goals

1. provider/key readiness와 비용 정책 readiness를 분리해서 보여준다.
2. 이번 planner 입력의 input/output/total token estimate를 보여준다.
3. env 기반 KRW 단가가 있을 때만 예상 비용을 계산한다.
4. 1회 예산, 일 예산, token cap, raw row privacy, external write gate를 live call 조건으로 둔다.
5. 누적 `AgentRun` 비용을 오늘 예산에 반영한다.
6. 실제 provider write와 실제 LLM 호출은 계속 차단한다.

## Non-Goals

| Item | Reason |
|------|--------|
| 실제 Gemini/OpenAI API 호출 | 이번 cycle은 호출 전 비용/안전장치만 만든다. |
| 최신 vendor 가격 자동 반영 | 가격은 바뀔 수 있으므로 코드에 고정하지 않고 env 단가로 관리한다. |
| 외부 광고/커머스 write gate 변경 | LLM 비용 가드는 외부 provider write 권한과 분리한다. |
| 대량 raw data summarization | LLM 입력은 집계 요약과 evidence id만 유지한다. |

## Functional Requirements

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-01 | 비용 가드 view model을 만든다. | `plannerAudit`, `AgentRun`, provider readiness, env 정책을 합쳐 gate 결과를 반환한다. |
| FR-02 | `/operations`에 비용 가드 패널을 표시한다. | status, provider/model/key, 예상 비용, 예산, token, gate checks가 보인다. |
| FR-03 | env 단가 정책을 사용한다. | `AI_LLM_COST_PER_1K_INPUT_KRW`, `AI_LLM_COST_PER_1K_OUTPUT_KRW`가 없으면 비용 추정과 live call은 차단된다. |
| FR-04 | 예산 정책을 사용한다. | `AI_LLM_RUN_BUDGET_KRW`, `AI_LLM_DAILY_BUDGET_KRW`가 없거나 초과하면 차단된다. |
| FR-05 | token cap과 privacy를 검증한다. | `AI_LLM_MAX_*_TOKENS` 초과 또는 raw row 포함 시 차단된다. |
| FR-06 | read-only API를 제공한다. | `/api/operations/llm-cost-governance`가 패널 데이터를 조회한다. |

## Success Criteria

| # | Criteria |
|---|----------|
| SC-1 | 단가/예산/token cap이 모두 맞으면 `실행 가능` 상태가 계산된다. |
| SC-2 | 단가/예산이 없으면 key가 있어도 `live call 차단`이다. |
| SC-3 | 1회/일 예산 또는 token cap 초과는 차단 gate로 표시된다. |
| SC-4 | `/operations`에서 비용 가드 패널이 보인다. |
| SC-5 | unit/typecheck/build/e2e/browser smoke가 통과한다. |
| SC-6 | 실제 LLM 호출과 외부 provider write는 열리지 않는다. |

## Next Step

Iteration 1은 `module-6 LLM 인터페이스`의 실제 호출 전 비용 governance를 완성한다. 이후 별도 cycle에서 live LLM adapter를 붙이더라도 이 gate를 먼저 통과해야 한다.
