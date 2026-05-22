# ai-marketing-character-ops Act Iteration 12

> **PDCA Phase**: Act / Iteration 12
>
> **Date**: 2026-05-22 KST
>
> **Scope**: 데이터 연동 화면의 수집/저장 데이터 명세
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

## Verification

| Check | Result |
|-------|--------|
| Targeted component/view-model tests | 2 files, 4 tests passed |
| `npm test -- --run` | 27 files, 81 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| Targeted Playwright smoke | `/data` navigation/filter test passed |
| Local HTTP smoke | `/data` returned `200 OK` and contained `#search-ad-incoming`, `#smartstore-stored`, `불러오는 데이터와 저장하는 데이터` |

## MVP Progress

1차 MVP 대비 진행율은 **97%**로 본다. 대표가 결재 전에 수집 근거, 저장 근거, 성과 이력, 비용/토큰 경계를 볼 수 있는 흐름은 갖춰졌다. 남은 3%는 실제 운영 전 데이터 스키마 고정, 배포 환경 회귀검증, 운영용 백필/스케줄 UI의 최종 정리다.

## Act Decision

`module-13`은 local MVP 기준으로 구현됐다. 데이터 연동 화면은 이제 단순 동기화 상태가 아니라, 불러오는 원천 필드와 저장되는 내부 필드를 분리해서 보여준다. 실제 provider write는 여전히 차단한다.
