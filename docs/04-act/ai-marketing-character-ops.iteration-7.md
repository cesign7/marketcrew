# ai-marketing-character-ops Act Iteration 7

> **PDCA Phase**: Act / Iteration 7
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Provider sync evidence panel
>
> **Completes**: `module-8` / provider sync report and snapshot evidence visibility goal
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-6.md`

## Act Target

Iteration 6에서 read-only provider aggregate가 담당 캐릭터 안건과 결재 요청으로 올라왔다. 이번 iteration은 대표가 `/operations`에서 안건의 원천 근거를 더 빠르게 확인할 수 있게 provider sync report 자체를 노출한다. 단순히 "연동 준비됨"이 아니라 실제 동기화 상태, HTTP 결과, snapshot 개수, 누락 env, 실패 사유, write 시도 여부를 함께 보여야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| View model | `ProviderSyncEvidenceView`를 추가해 provider별 최신 sync report를 대표 화면용 근거 요약으로 변환한다. |
| Operations UI | `ProviderSyncEvidencePanel`을 추가해 Search Ad, DataLab, Smartstore, Youngcart의 최신 `SYNCED/FAILED/SKIPPED` 상태와 snapshot 요약을 보여준다. |
| Evidence labels | 키워드 수요 건수, 데이터랩 추이 건수, 스마트스토어 주문/매출/상위 상품, 영카트 주문/재구매/매출을 report별 snapshot label로 표시한다. |
| Safety | 모든 report는 `readOnly`, `writeAttempted=false`를 화면에 표시하며 provider write는 열지 않는다. |

## Evidence Contract

| Provider | Visible Evidence |
|----------|------------------|
| `search_ad` | HTTP status, KeywordDemandSnapshot count, evidence note, write attempt state |
| `datalab` | HTTP status, SearchTrendSnapshot count, relative-ratio evidence note |
| `smartstore` | Commerce aggregate order count, gross sales, top product, generated signal |
| `shop` | Youngcart aggregate order count, repeat customer count, gross sales, generated signal |

## Verification

| Check | Result |
|-------|--------|
| `npm test -- tests/application/product-growth-opportunities.test.ts tests/application/agenda-room-view-model.test.ts` | 2 files, 4 tests passed |
| `npm run typecheck` | passed after removing stale generated `.next/types/* 2.ts` files |
| `GET /api/operations/provider-sync` on `localhost:3001` | 200, `search_ad`, `datalab`, `smartstore`, `shop` all `SYNCED` |
| `GET /operations` on `localhost:3001` | 200, `Provider 동기화 결과`, `실제 수집 근거` rendered |

## Remaining Act Order

1. Search Ad 키워드 수요와 커머스/영카트 상품 집계를 합쳐 상품별 키워드/마케팅/상품 발굴 후보를 고도화한다.
2. 승인된 내부 초안의 성과 분석 루프를 실제 provider read-only 데이터와 연결한다.
3. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-8`은 local MVP 기준으로 완료됐다. 대표는 이제 안건 카드 이전에 각 provider의 실제 sync 상태와 snapshot 근거를 확인할 수 있다. 다음 iteration은 이 근거를 단순 표시에서 끝내지 않고 상품별 키워드, 마케팅 제안, 상품 발굴 후보로 조합하는 것이다.
