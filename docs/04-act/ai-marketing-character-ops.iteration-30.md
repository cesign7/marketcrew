# ai-marketing-character-ops iteration 30

> **Date**: 2026-05-23
> **Scope**: module-32 쇼핑검색광고 성과 수집기
> **MVP Progress**: 100% 유지. 이번 작업은 1차 MVP 이후 실데이터 판단 고도화다.

## 목표

네이버 검색광고 공통 `/stats` 성과와 별도로, 쇼핑검색광고 상품형/카탈로그형 검색어 성과를 읽어 규칙 엔진과 AI 판독 근거에 연결한다. 실제 광고 쓰기는 계속 차단한다.

## 공식 계약 확인

| 출처 | 확인 내용 | 반영 |
|---|---|---|
| Search Ad `/stats` spec | `id`, `statType`으로 predefined 통계를 조회할 수 있고 `NPLA_SCH_KEYWORD`가 존재한다. | 광고그룹 ID 기준 쇼핑검색어 성과 조회 요청을 추가했다. |
| 2016-10-17 release note | `NPLA_SCH_KEYWORD`는 쇼핑 캠페인 전용이며 최근 30일 검색어, 클릭, 직접 전환율, 광고비를 반환한다. | `ShoppingSearchAdPerformanceSnapshot`은 원문 행이 아니라 30일 집계 요약만 저장한다. |
| Product Group spec | `/ncc/product-groups`로 상품 그룹, 몰명, 상품 등록 유형을 조회할 수 있다. | 쇼핑검색광고 성과 스냅샷에 상품 그룹/몰 근거를 연결한다. |

## 구현

- `ProviderSyncReport.shoppingSearchAdPerformanceSnapshots`와 `ShoppingSearchAdPerformanceSnapshot`을 추가했다.
- Search Ad read-only 수집기에 `buildSearchAdShoppingKeywordStatsRequest`와 `statType=NPLA_SCH_KEYWORD` 조회를 붙였다.
- 쇼핑 캠페인 광고그룹을 제한된 개수로 자동 발견하고, 가능하면 `/ncc/product-groups`의 상품 그룹/몰 정보를 연결한다.
- 쇼핑검색어 직접 전환율 0% 또는 낮은 직접 전환율을 그로의 저성과 조정 근거로 판정한다.
- Gemini planner 입력, AI 판독 근거, AgentRun evidence, outcome evidence, `/data` 원천/저장 필드 명세에 쇼핑검색광고 성과를 포함했다.
- 화면 연동 근거 카드에는 `쇼핑검색광고 성과 N건`으로 별도 표시한다.
- 화면과 AI 입력 비용을 보호하기 위해 실제 응답 전체를 저장하지 않고, 직접전환 없음과 광고비/클릭 기준의 위험 우선순위 상위 스냅샷만 저장한다. 기본 저장 한도는 `MARKETCREW_SEARCH_AD_SHOPPING_STAT_MAX_SNAPSHOTS=500`이다.

## 안전 경계

- 모든 호출은 GET read-only다.
- 키워드, 입찰가, 예산, 상품 노출 조건 변경은 호출하지 않는다.
- 원천 검색어 전체 행을 LLM에 전달하지 않고, 집계 스냅샷과 근거 ID만 전달한다.

## 검증

- `npm run typecheck`
- `npm test -- --run tests/integrations/provider-read-only-sync.test.ts tests/application/ad-performance-diagnostics.test.ts tests/application/provider-signal-agenda.test.ts tests/components/provider-data-contract-panel.test.ts tests/application/ai-evidence-briefs.test.ts tests/llm/gemini-planner.test.ts`
- `npm test -- --run`
- `npm run build`
- `npm audit --omit=dev`
- `npm run test:e2e`
- 로컬 실제 read-only sync: Search Ad 키워드 수요 64건, 일반 검색광고 성과 41건, 쇼핑검색광고 원본 성과 8,181건 확인. 비용 보호 한도에 따라 `ShoppingSearchAdPerformanceSnapshot` 500건 저장.
- 로컬 실제 LLM 파일럿: Gemini `gemini-3.5-flash` 호출 성공, 쇼핑검색광고 스냅샷 ID 3건을 AI 판단 근거로 채택.

## 다음

실제 production Railway 환경에 새 코드가 배포된 뒤 `provider-sync`를 다시 실행해 운영 DB에도 같은 쇼핑검색광고 성과 스냅샷이 생성되는지 확인한다. 현재 작업 턴에서는 외부 쓰기와 광고 변경은 계속 제외한다.
