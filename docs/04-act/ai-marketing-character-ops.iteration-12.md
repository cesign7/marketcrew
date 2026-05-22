# ai-marketing-character-ops Act Iteration 12

> **PDCA Phase**: Act / Iteration 12
>
> **Date**: 2026-05-22 KST
>
> **Scope**: 데이터 연동 화면의 수집/저장 데이터 명세와 수집 주기 정책
>
> **Completes**: `module-13` / provider data contract transparency
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-11.md`

## Act Target

대표가 `/data`에서 각 채널이 무엇을 API 또는 브리지에서 불러오고, MarketCrew가 무엇을 DB/저장소에 남기는지 바로 확인할 수 있게 한다.

이번 iteration은 실제 외부 수집 범위를 넓히지 않는다. 화면에 보여주는 계약은 현재 읽기 전용 어댑터가 쓰는 필드와 정규화 타입을 기준으로 삼고, 주문/고객 원문과 토큰/시크릿은 저장하지 않는다는 경계를 명확히 드러낸다.

## Implemented Change

| Area | Change |
|------|--------|
| Data contract model | `ProviderDataContractView`와 `ProviderDataContractDatasetView`를 추가했다. |
| Contract source | `provider-data-contracts.ts`가 네이버 키워드광고, 네이버 데이터랩, 스마트스토어(스티커씨), 쇼핑몰(커피프린트)의 불러오는 데이터/저장하는 데이터 칼럼을 제공한다. |
| Data page UI | `ProviderDataContractPanel`을 추가해 채널별 `불러오는 데이터`, `저장하는 데이터` 링크, 칼럼 설명, 샘플 데이터를 보여준다. |
| Source field UI | `원문 필드 점검표`를 데이터 명세 상단에 두고, API/브리지 원문 필드 후보를 그룹별로 접었다 펼쳐 처리 기준과 함께 확인하게 한다. |
| Collection schedule policy | 공식 API 제약을 기준으로 자동 스케줄, 수동 연동 수집, 결재 전 최신성, 중복 스냅샷 갱신 기준을 `ProviderSyncReport.historyPolicy`와 `/data` 정책 패널에 추가했다. |
| Channel filter | 상단 채널 필터를 데이터 명세에도 적용한다. 스티커씨 선택 시 스마트스토어 명세만, 커피프린트 선택 시 쇼핑몰 명세만 보인다. |
| Korean copy | 연동 근거 문구에서 `행는`, `연결는`처럼 어색하게 조합되던 조사를 보정했다. |
| Tests | 컴포넌트, view model, E2E 네비게이션 스모크에 데이터 명세 확인을 추가했다. |

## Data Contract Boundary

| Provider | Incoming | Stored |
|----------|----------|--------|
| 네이버 키워드광고 | `relKeyword`, 월간 PC/모바일 검색수, 경쟁도, 평균 클릭률 | `KeywordDemandSnapshot`, 연동 실행 ID, 캐시 만료일 |
| 네이버 데이터랩 | 검색어 그룹, 기간, `ratio` | `SearchTrendSnapshot`, 상대값 주석 |
| 스마트스토어(스티커씨) | 최근 변경 주문 ID와 주문 상세의 상품명/금액 | `CommerceAggregateSnapshot`, 주문수, 매출, 상위 상품 |
| 쇼핑몰(커피프린트) | 영카트 브리지의 주문/재구매/매출 집계 | `ShopAggregateSnapshot`, 주문수, 재구매 고객수, 매출, 객단가 |

## Collection Schedule Policy

| 기준 | 운영 방식 |
|------|-----------|
| 자동 스케줄 | 매일 07:00대 전체 채널 기본 수집으로 기준 스냅샷을 만든다. 실패해도 실행 이력과 실패 사유를 남긴다. |
| 광고 집행 중 | 네이버 키워드광고는 07:05/15:05 2회 점검한다. 광고 변경 직후에는 수동 갱신을 우선한다. |
| 시즌 D-30 | 시즌 키워드, 주문, 광고 지표를 매일 강화 수집한다. 설날·추석 등 음력 명절은 연도별 양력 환산일 기준 D-기간으로 비교한다. |
| 수동 수집 | 결재 직전, 캠페인/상품/CRM 변경 직후, 이상 신호 확인 시 최신 근거를 즉시 갱신한다. |
| 중복 방지 | 같은 채널/브랜드/날짜/기간/시즌 이벤트는 최신 스냅샷으로 갱신하고, 수집 실행 이력만 별도로 누적한다. |

## Source Field Boundary

원천 필드 점검표는 실제 저장 데이터가 아니다. `keywordList[0].monthlyAvePcClkCnt`, `lastChangeStatuses[0].productOrderId`, `productOrders[0].productOrder.productName`, `productOrders[0].completedClaims[0].claimRequestReason`, `results[0].data[0].period`, `results[0].data[0].ratio`처럼 API/브리지 응답에서 점검할 원문 필드 후보를 먼저 보여주되, 값 샘플을 노출하지 않고 `상세 조회에만 사용`, `매출 합산에 사용`, `개인정보로 저장 안 함` 같은 처리 기준만 표시한다.

## Verification

| Check | Result |
|-------|--------|
| Targeted component/view-model tests | 2 files, 4 tests passed |
| `npm test -- --run` | 27 files, 81 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| Targeted Playwright smoke | `/data` navigation/filter test passed |
| Local HTTP smoke | `/data` returned `200 OK` and contained `#search-ad-incoming`, `#smartstore-stored`, `원문 필드 점검표` |
| Browser UI smoke | `/data` contains `추천 수집 주기`, `자동 스케줄`, `07:05 / 15:05`, `중복 방지` |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 대표가 결재 전에 수집 근거, 원문 필드 점검표, 저장 근거, 수집 주기/최신성 기준, 성과 이력, 비용/토큰 경계를 볼 수 있는 흐름은 갖춰졌다. 실제 외부 provider write, 운영용 Cron 활성화, 운영 DB 확장은 1차 MVP 밖의 후속 확장으로 둔다.

## Act Decision

`module-13`은 local MVP 기준으로 구현됐다. 데이터 연동 화면은 이제 단순 동기화 상태가 아니라, 불러오는 원천 필드, 저장되는 내부 필드, 자동/수동 수집 기준, 중복 방지 기준을 분리해서 보여준다. 실제 provider write는 여전히 차단한다.
