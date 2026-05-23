# ai-marketing-character-ops Act Iteration 25

> **Module/Goal**: `module-27 실행 범위 소급 적용`으로 기존 저장 결재안에도 AI 제안 실행 범위를 채운다.
> **Check Source**: 대표 질문 - 기존에 올라온 데이터에도 반영됐는지, 적용 내역을 확인하고 싶음
> **Date**: 2026-05-23
> **Status**: Done

## Context

`module-26`은 새로 생성되는 검색광고 결재안에 실행 범위 제안과 대표 수정 기록을 추가했다. 그러나 기존 DB에 이미 저장돼 있던 결재안은 예전 JSON 구조라 `executionScopeProposal`이 없을 수 있었다.

이번 iteration은 저장된 기존 결재안에 대해 실행 범위를 소급 적용하고, 이후에도 미리보기/적용 내역을 확인할 수 있는 백필 API를 추가했다.

## Changes

| Area | Result |
|------|--------|
| 실행 범위 생성 | 검색광고용 제안 로직을 `execution-scope-proposal.ts`로 분리하고, 내부 초안/상품/CRM 안건용 범위 제안도 추가했다. |
| Provider 안건 | 스마트스토어/자체몰/CRM 계열 새 결재안도 생성 시점부터 `executionScopeProposal`을 갖는다. |
| Backfill | `backfillExecutionScopes`가 기존 `ApprovalRequest`와 기존 `OwnerDecision`을 점검하고 누락된 실행 범위를 채운다. |
| API | `/api/operations/execution-scope-backfill` GET은 미리보기, POST는 실제 적용 결과를 반환한다. |
| 테스트 | 검색광고 결재안과 기존 대표 결정에 소급 기본값이 들어가는지 검증했다. |

## Applied Data

로컬 `marketcrew` Postgres DB 기준 실제 적용 결과:

| 대상 | 스캔 | 적용 | 이미 준비됨 | 비고 |
|------|-----:|-----:|------------:|------|
| 결재안 | 3 | 3 | 0 | 스마트스토어/자체몰/CRM 저장 안건 3건 |
| 대표 결정 | 0 | 0 | 0 | 아직 저장된 대표 결정 없음 |

적용된 결재안:

| ID | 실행 범위 |
|----|-----------|
| `approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23` | 스마트스토어/자체몰 매출 균형 점검 안건 실행 범위 |
| `approval-agenda-provider-smartstore-stickersee-2026-05-23` | 스마트스토어 상위 상품 키워드 확장 안건 실행 범위 |
| `approval-agenda-provider-youngcart-coffeeprint-2026-05-23` | 영카트 재구매 고객군 CRM 초안 안건 실행 범위 |

DB 재조회에서 위 3건 모두 `executionScopeProposal.fields` 6개를 가진 것을 확인했다.

## Safety Contract

- 실제 스마트스토어, 쇼핑몰, 광고 계정 write는 열지 않았다.
- 기존 대표 결정이 있었다면 선택값이 없던 과거 결정임을 메모에 `소급 적용`으로 남기게 했다.
- 백필 API는 미리보기와 적용 결과를 반환하므로 나중에 운영 DB에서도 적용 전 변경 건수를 확인할 수 있다.

## Verification

| Check | Result |
|-------|--------|
| Targeted tests | PASS, `execution-scope-backfill`, `approval-detail-view-model`, `approval-decision-route` 3 files / 11 tests |
| Typecheck | PASS, `npm run typecheck` |
| Full unit tests | PASS, `npm test -- --run` 50 files / 130 tests |
| Build | PASS, `npm run build` |
| Audit | PASS, `npm audit --omit=dev` 0 vulnerabilities |
| Local DB backfill | PASS, 3 approval requests updated, DB re-read confirmed 6 fields each |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 완료된 MVP 위에서 기존 저장 데이터까지 결재 실행 범위 계약에 맞춘 운영 보정이다.

## Next

운영 배포 후 production DB에 같은 백필 API를 실행하면 현재 로컬에서 확인한 것과 같은 적용 내역을 JSON으로 확인할 수 있다. 실제 provider write는 계속 별도 승인 전까지 차단한다.
