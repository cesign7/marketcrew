# ai-marketing-character-ops Act Iteration 9

> **PDCA Phase**: Act / Iteration 9
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Read-only provider outcome analysis loop
>
> **Completes**: `module-10` / approved internal draft outcome analysis with provider snapshots
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-8.md`

## Act Target

Iteration 8에서 상품별 키워드/마케팅/상품 발굴 후보를 만들었다. 이번 iteration은 대표가 승인한 내부 초안 또는 승인 시도 결과가 단순 `INCONCLUSIVE` 문구로 끝나지 않고, 최신 read-only provider 스냅샷을 성과 기준선과 체크포인트에 연결되게 한다.

LLM 비용을 줄이기 위해 원천 30일 행을 다시 읽거나 LLM에 넘기지 않는다. 이미 수집된 `ProviderSyncReport`, `KeywordDemandSnapshot`, `SearchTrendSnapshot`, `CommerceAggregateSnapshot`, `ShopAggregateSnapshot` 요약만 사용한다.

## Implemented Change

| Area | Change |
|------|--------|
| Application | `buildProviderOutcomeAnalysis`를 추가해 approval work type별 관련 provider report를 선택한다. |
| OutcomeReport | `evidenceIds`, `evidenceLabels`, `sourceReportIds`를 추가해 성과 보고의 근거 trace를 남긴다. |
| Approval workflow | `processOwnerDecision`이 `providerSyncReports`를 받아 outcome baseline/checkpoint에 read-only snapshot 요약을 붙인다. |
| API | `/api/approvals/[id]/decision`이 local workflow repository의 provider sync report를 outcome 생성에 전달한다. |
| Operations UI | `OwnerDecisionFlowPanel`이 성과 판단 아래 provider evidence label을 표시한다. |
| Cost control | LLM 입력이나 raw row 재분석 없이 aggregate snapshot과 report id만 연결한다. |
| Safety | 성과 분석은 read-only다. 광고 키워드 추가, 입찰/예산 변경, 상품 수정, CRM 발송은 계속 차단한다. |

## Outcome Contract

| Work Type | Relevant Provider Evidence | Outcome Use |
|-----------|----------------------------|-------------|
| `SEARCH_AD_KEYWORD` / `SEARCH_AD_BID_BUDGET` | Search Ad keyword demand, DataLab relative trend, Smartstore aggregate | 광고안 승인 후 키워드 수요와 매출 기준선 연결 |
| `PRODUCT_DRAFT` | Smartstore aggregate, Search Ad demand, DataLab trend, Youngcart aggregate | 상품/키워드/랜딩 초안의 기준선과 다음 체크포인트 연결 |
| `CRM_DRAFT` | Youngcart aggregate, Smartstore aggregate | 재구매 고객군과 매출 기준선 연결 |
| `INTERNAL_TASK` | Smartstore, Youngcart, Search Ad, DataLab | 채널 손익/운영 점검 기준선 연결 |

## Verification

| Check | Result |
|-------|--------|
| Targeted app tests | `provider-outcome-analysis`, `approval-workflow`, `agenda-room-view-model` 통과 |
| `npm test -- --run` | 15 files, 50 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| `GET /api/operations/provider-sync` on `localhost:3001` | 200, four providers `SYNCED` |
| Browser smoke on `/operations` | 2 decision flow cards, 2 outcome evidence lists, provider outcome summary and Smartstore/Search Ad evidence rendered |

## Remaining Act Order

1. provider sync failure/report 근거를 결재 상세 화면에서도 직접 펼쳐볼 수 있게 한다.
2. outcome report를 별도 조회 API 또는 상세 화면 기록으로 재조회하는 hardening을 진행한다.
3. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-10`은 local MVP 기준으로 구현됐다. 대표 결재 이후 outcome은 이제 “판단 보류” 상태를 유지하더라도, 어떤 provider report와 snapshot을 기준선으로 삼아 다음 성과 체크를 해야 하는지 보여준다. 다음 iteration은 같은 근거를 결재 상세 화면에서도 더 직접적으로 펼쳐보는 것이다.
