# ai-marketing-character-ops Act Iteration 24

> **Module/Goal**: `module-26 결재 실행 범위 선택`으로 AI가 실행 범위를 먼저 제안하고 대표가 그대로 확정하거나 수정값을 기록한다.
> **Check Source**: 대표 질문 - 키워드광고 안건이 검색광고/쇼핑광고인지, PC/모바일/시간대 범위가 무엇인지 결재 전에 선택할 수 있어야 함
> **Date**: 2026-05-23
> **Status**: Done

## Context

키워드 광고 안건의 기존 결재 미리보기는 키워드, 일예산, 입찰 상한은 보여줬지만 실제 반영 범위가 모호했다. 대표가 결재 전 확인해야 하는 범위는 광고 유형, 신규/기존 광고그룹, PC/모바일, 시간대, 예산/입찰, 제외 키워드까지 포함해야 한다.

이번 iteration은 AI가 실행 범위를 먼저 추천하고, 대표가 결재 상세에서 그대로 확정하거나 일부 수정한 값을 결정 기록에 남기는 흐름을 추가했다. 실제 검색광고 외부 쓰기는 계속 차단한다.

## Changes

| Area | Result |
|------|--------|
| Domain | `ExecutionPlan.executionScopeProposal`과 `OwnerDecision.executionScopeSelection`을 추가했다. |
| 검색광고 안건 | 부처님오신날 선물카드 키워드 테스트에 광고 유형, 적용 위치, 기기/매체, 시간대, 예산/입찰, 제외 키워드 실행 범위 제안을 붙였다. |
| 결재 미리보기 | `ApprovalPreviewPanel`에서 `AI 제안 실행 범위`를 카드 안에 표시한다. |
| 대표 결재 입력 | `OwnerDecisionSubmitPanel`에서 실행 범위 선택값을 select로 수정할 수 있게 하고, 결정 메모와 구조화 필드로 함께 전송한다. |
| API | `/api/approvals/[id]/decision`이 `executionScopeSelection`을 검증해 대표 결정에 저장한다. |
| 문서 | plan/design에 실행 범위 제안과 대표 수정 계약을 반영했다. |

## Safety Contract

- 네이버 검색광고 공식 문서 기준으로 광고그룹, 키워드, 매체/타겟, 쇼핑검색광고 유형은 각각 다른 제약을 가진다.
- 이번 변경은 실행 범위 제안과 대표 선택 기록만 추가한다.
- `EXTERNAL_WRITE_ENABLED`와 provider write gate는 열지 않았다.
- 실제 광고 계정 반영 executor는 별도 PDCA와 같은 턴의 명시 승인 전까지 구현하지 않는다.

## Verification

| Check | Result |
|-------|--------|
| Official API check | PASS, Search AD 공식 문서와 GitHub sample/release note로 base URL, 캠페인/광고그룹/키워드, PC/모바일 가중치, 쇼핑검색광고 제약 확인 |
| Targeted tests | PASS, `approval-detail-view-model`, `approval-preview-panel`, `approval-decision-route` 3 files / 11 tests |
| Typecheck | PASS, `npm run typecheck` |
| Full unit tests | PASS, `npm test -- --run` 49 files / 128 tests |
| Build | PASS, `npm run build` |
| Audit | PASS, `npm audit --omit=dev` 0 vulnerabilities |
| E2E smoke | PASS, `npx playwright test tests/e2e/approval-detail-smoke.spec.ts` |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 완료된 MVP 위에서 결재 전 실행 범위를 더 명확히 하고, 대표 수정값을 감사 가능한 결정 기록으로 남기는 운영 UX/안전성 개선이다.

## Next

다음 후보는 실제 LLM adapter가 `ExecutionScopeProposal`까지 포함해 제안하도록 연결하는 것이다. 단, 실제 provider write executor는 별도 설계와 명시 승인 전까지 계속 차단한다.
