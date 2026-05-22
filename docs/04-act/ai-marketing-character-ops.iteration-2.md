# ai-marketing-character-ops Act Iteration 2

> **PDCA Phase**: Act / Iteration 2
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Evidence / provenance slice
>
> **Completes**: `module-6B` / planner evidence, token, cost, and provenance visibility goal
>
> **Check Source**: `docs/03-analysis/ai-marketing-character-ops.analysis.md`

## Act Target

Check 단계의 G-3을 줄인다. 오피 플래너가 실제 LLM을 호출하지 않는 deterministic fallback 상태여도, 대표가 업무실에서 모델/토큰/과금/근거 범위를 확인할 수 있어야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| 도메인 | `LlmPlannerAuditRun` 타입을 추가해 input/result ID, provider, model, token estimate, billing state, source counts, evidence IDs를 구조화했다. |
| 플래너 | `buildPlannerAuditRun`을 추가해 deterministic fallback도 감사 가능한 실행 기록으로 만든다. |
| 업무실 UI | 오피 플래너 카드에 provider/model, token usage, 과금 상태, input/result trace, 후보/선택/근거/연동 메모 수를 표시한다. |
| 테스트 | planner audit unit test와 agenda-room view model assertion을 추가했다. |

## Safety Boundary

이번 iteration은 실제 LLM 호출을 추가하지 않는다. raw row는 계속 제외되고, `deterministic_fallback`은 과금 없음으로 표시된다.

## Remaining Act Order

1. Read-only provider slice: Search Ad/DataLab 실제 읽기 호출을 failure-safe card로 연결한다.
2. Browser regression slice: approval detail에서 버튼 클릭 후 status notice를 검증하는 Playwright smoke를 추가한다.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 11 files, 26 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `GET /operations` HTML smoke | 200, `provider deterministic`, `model deterministic-fallback`, `과금 없음`, `tokens 추정` rendered |

## Act Decision

G-3은 local MVP 기준으로 일부 완화됐다. 아직 실제 `AgentRun` DB 행이나 provider별 실비 정산은 없지만, 오피 플래너의 input/result/model/token/evidence trace가 대표 업무실에 노출되기 시작했다. 다음 iteration은 read-only provider slice다.
