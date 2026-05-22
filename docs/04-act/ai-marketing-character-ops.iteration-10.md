# ai-marketing-character-ops Act Iteration 10

> **PDCA Phase**: Act / Iteration 10
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Approval detail provider sync evidence
>
> **Completes**: `module-11` / provider sync report and failure evidence on approval detail
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-9.md`

## Act Target

Iteration 9에서 승인 결과의 `OutcomeReport`를 read-only provider snapshot 기준선과 연결했다. 이번 iteration은 대표가 결재 상세 화면에서 바로 provider 동기화 성공/실패 근거를 확인할 수 있게 한다.

대표는 더 이상 `/operations`의 provider 근거 패널로 돌아가서 비교하지 않아도 된다. 결재 상세의 같은 흐름 안에서 read-only 동기화 상태, 실패 사유, 누락 env, snapshot 요약, write 시도 여부를 확인한다.

## Implemented Change

| Area | Change |
|------|--------|
| Detail view model | `ApprovalDetailViewModel`에 `providerSyncEvidence`를 추가했다. |
| Evidence filtering | 결재 제목, 실행기, diff, 근거 요약을 기준으로 Search Ad/DataLab/Smartstore/Youngcart 관련 report만 고른다. |
| UI reuse | `ProviderSyncEvidencePanel`에 제목/설명/empty message props를 추가해 operations와 approval detail에서 같은 카드 UI를 재사용한다. |
| Approval detail UI | `/approvals/[id]`가 결재 미리보기 아래에 “이 결재의 provider 수집 근거” 패널을 표시한다. |
| Failure visibility | 실패 report의 `failureReason`, HTTP 상태, 누락 env, write 미시도 상태를 상세 화면에서도 그대로 볼 수 있다. |
| Safety | 이 패널은 조회 전용이다. 실패 근거를 보여줘도 provider write나 재시도 호출을 만들지 않는다. |

## Detail Evidence Contract

| Approval Context | Included Evidence |
|------------------|-------------------|
| 검색광고/키워드/입찰/예산 | 네이버 키워드광고, 네이버 데이터랩 |
| 스마트스토어/상품/랜딩 | 스마트스토어, 네이버 키워드광고, 네이버 데이터랩 |
| 영카트/CRM/재구매 | 자체 쇼핑몰, 스마트스토어 |
| 채널/손익/매출 균형 | 스마트스토어, 자체 쇼핑몰 |
| 분류 불가 | 저장된 provider report 전체를 fallback으로 표시 |

## Verification

| Check | Result |
|-------|--------|
| Targeted view model test | `approval-detail-view-model` 3 tests passed |
| `npm test -- --run` | 15 files, 51 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| Browser smoke on `/approvals/approval-agenda-season-plan-buddha-gift-card` | provider evidence heading rendered, 2 provider cards, `네이버 키워드광고`, `read-only`, `쓰기 시도 없음` visible |

## Remaining Act Order

1. outcome report를 별도 조회 API 또는 결재 상세의 저장된 성과 보고 기록으로 재조회하는 hardening을 진행한다.
2. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-11`은 local MVP 기준으로 구현됐다. 대표는 이제 결재 상세에서 승인 대상의 실행 계획뿐 아니라, 그 안건이 어떤 provider sync report와 실패/성공 근거에 기대고 있는지 바로 확인할 수 있다. 다음 iteration은 생성된 outcome report를 상세 화면 또는 API에서 저장 이력으로 재조회하는 방향이다.
