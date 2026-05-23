# ai-marketing-character-ops Act Iteration 22

> **Module/Goal**: `module-24 AI 파일럿 판단 패널`로 저장된 실제 AI 모델 판단을 운영실에서 확인하게 한다.
> **Check Source**: 대표 요청 - 실제 데이터 수집 확인 이후 1, 2, 3순위 안건과 실제 AI 판단을 운영 화면에서 확인
> **Date**: 2026-05-23
> **Status**: Done

## Context

Iteration 21에서 기존 운영 생성 데이터를 백업 후 초기화하고, 실제 provider 수집과 Gemini 파일럿 호출을 완료했다. 다음 문제는 결과가 `AgentRun` 감사 이력에만 남아 운영자가 `/operations`에서 바로 판단하기 어렵다는 점이었다.

이번 iteration은 실제 AI 모델을 새로 호출하지 않고, 저장된 `AgentRun(mode=llm, provider=gemini)`과 `AgentRunWorkflowLink`를 읽어 운영실에 한글 판단 패널로 보여주는 작업이다.

## Changes

| Area | Result |
|------|--------|
| View model | `AgendaRoomViewModel.aiPilotInsight`를 추가해 저장된 실제 AI 판단, 모델, 토큰/비용, 근거 수, 추천 안건을 한 곳에 묶었다. |
| 운영실 UI | `/operations`에 `AI 파일럿 판단` 패널을 추가해 실제 AI 판단, 추천 안건, 판단 근거, 안전 조건을 표시한다. |
| ID 보호 | 저장된 추천 안건 ID가 현재 화면 후보와 달라도 raw ID를 그대로 노출하지 않고 한글 안건명으로 풀어 보여준다. |
| 안전 조건 | 원천 행 제외, 집계 요약과 근거 ID만 사용, 고객 식별정보 제외, 외부 반영 없음 조건을 패널에 고정 표시한다. |
| 호환성 | 오래된 backend view model에 `aiPilotInsight`가 없어도 fallback view model로 깨지지 않게 보강했다. |
| 테스트 | view model, panel server render, 실제 LLM pilot route 테스트를 추가/확장했다. |

## Operator Behavior

- 실제 AI 파일럿 결과가 없으면 `저장된 판단 없음`으로 표시한다.
- 저장된 Gemini 파일럿 결과가 있으면 `저장된 판단` 상태로 표시한다.
- 추천 안건은 `스마트스토어/자체몰 매출 균형 점검 안건`, `스마트스토어 상위 상품 키워드 확장 안건`, `영카트 재구매 고객군 CRM 초안 안건`처럼 대표가 읽을 수 있는 한글 안건명으로 보여준다.
- 패널은 외부 광고, 상품, 주문, 고객 데이터에 write를 하지 않는다.

## Verification

| Check | Result |
|-------|--------|
| Targeted tests | `npm test -- tests/application/agenda-room-view-model.test.ts tests/components/ai-pilot-insight-panel.test.ts tests/api/llm-real-pilot-route.test.ts` passed, 3 files / 9 tests |
| Full unit tests | `npm test -- --run` passed, 49 files / 127 tests |
| Typecheck | `npm run typecheck` passed |
| Build | `npm run build` passed |
| Audit | `npm audit --omit=dev` passed, 0 vulnerabilities |
| API smoke | `GET /api/operations/view-model` returned `aiPilotInsight.statusLabel=저장된 판단`, Gemini model, 근거 6개, 추천 안건 3건 |
| Browser smoke | Playwright local `/operations`에서 `AI 파일럿 판단`, `저장된 판단`, 추천 안건 표시, raw approval ID 0건 |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 MVP 이후 실제 데이터/실제 AI 판단을 운영 화면에 연결한 후속 확장이다.

## Next

다음 순서는 normalized analytics schema를 설계해 시간대, PC/모바일, 광고 설정, 상품/채널 단위 판단 근거를 더 안정적으로 공급하는 것이다. 실제 provider write executor는 별도 PDCA와 명시 승인 전까지 시작하지 않는다.
