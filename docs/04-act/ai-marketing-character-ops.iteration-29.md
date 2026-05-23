# Iteration 29 - 검색광고 실제 성과 스냅샷 수집기

## 완료한 목표

이전 iteration의 규칙 엔진이 샘플이 아니라 실제 네이버 검색광고 성과 집계를 읽을 수 있도록, read-only provider sync에 `/stats` 기반 성과 스냅샷 수집 경로를 연결했다.

## 공식 API 반영

| API | 확인한 계약 | 반영 |
|---|---|---|
| `/keywordstool` | 힌트 키워드는 최대 5개이며 키워드 수요 후보를 반환한다. | 기존 키워드 수요 수집 유지 |
| `/ncc/campaigns` | 캠페인 목록을 read-only로 조회한다. | 자동 대상 발견의 1단계 |
| `/ncc/adgroups` | 캠페인 기준 광고그룹 목록을 read-only로 조회한다. | 자동 대상 발견의 2단계 |
| `/ncc/keywords` | 광고그룹 기준 키워드 목록을 read-only로 조회한다. | 자동 대상 발견의 3단계 |
| `/stats` | `ids`, `fields`, `datePreset`, `timeIncrement`, `breakdown`으로 성과 집계를 조회한다. | 전체, PC/모바일, 시간대별 `SearchAdPerformanceSnapshot` 생성 |

## 반영 내역

| 영역 | 변경 |
|---|---|
| 수집기 | `syncSearchAdKeywordTool` 안에서 키워드 수요 수집 후 `/stats` 성과 수집을 같은 read-only report에 합친다. |
| 대상 발견 | `MARKETCREW_SEARCH_AD_STAT_IDS`가 있으면 직접 대상 ID로 수집하고, 없으면 캠페인 -> 광고그룹 -> 키워드 순서로 제한된 개수만 자동 발견한다. |
| 스냅샷 | 전체 성과, `pcMblTp` 기기 성과, `hh24` 시간대 성과를 `SearchAdPerformanceSnapshot`으로 정규화한다. |
| 브랜드 분리 | 캠페인/광고그룹/키워드명에서 스티커씨와 커피프린트를 추정하고, 모호하면 `MARKETCREW_SEARCH_AD_STAT_BRAND_KEY` 또는 스티커씨 기본값을 쓴다. |
| 화면 요약 | 연동 수집 카드에 `검색광고 성과 N건`을 표시해 규칙 엔진 입력이 실제로 들어왔는지 바로 확인하게 했다. |
| 안전 | 모든 호출은 GET read-only이며 키워드, 입찰, 예산 변경은 계속 호출하지 않는다. |
| 캐시 | `/api/cache/clear`가 다시 원격 캐시 삭제를 호출하지 않도록 막아 로컬/백엔드 자기 호출 반복을 끊었다. |

## 설정값

| 환경변수 | 용도 |
|---|---|
| `MARKETCREW_SEARCH_AD_STAT_IDS` | 자동 발견 대신 사용할 광고 키워드/광고그룹/캠페인 ID 목록 |
| `MARKETCREW_SEARCH_AD_STAT_TARGETS` | ID, 키워드명, 브랜드, 목표 CPA/ROAS를 JSON 배열로 직접 지정 |
| `MARKETCREW_SEARCH_AD_STAT_DISCOVERY_ENABLED` | 자동 발견 사용 여부. 기본값은 켜짐 |
| `MARKETCREW_SEARCH_AD_STAT_MAX_CAMPAIGNS` | 자동 발견 캠페인 최대 개수. 기본 5 |
| `MARKETCREW_SEARCH_AD_STAT_MAX_ADGROUPS` | 캠페인별 광고그룹 최대 개수. 기본 10 |
| `MARKETCREW_SEARCH_AD_STAT_MAX_KEYWORDS` | 성과 조회 키워드 최대 개수. 기본 50 |
| `MARKETCREW_SEARCH_AD_TARGET_CPA` | 높은 CPA 규칙의 기준값 |
| `MARKETCREW_SEARCH_AD_TRACKING_VERIFIED` | 수동 대상 지정 시 전환 추적 확인 여부 |

## 검증

- `npm run typecheck` - passed
- `npm test -- --run tests/integrations/provider-read-only-sync.test.ts tests/application/provider-signal-agenda.test.ts tests/components/provider-data-contract-panel.test.ts tests/persistence/backend-workflow-state.test.ts` - 4 files / 28 tests
- `npm test -- --run` - 52 files / 144 tests
- `npm run build` - passed
- `npm audit --omit=dev` - 0 vulnerabilities
- `npm run test:e2e` - 11 tests
- 로컬 실제 read-only sync - Search Ad 키워드 수요 64건, 성과 스냅샷 41건 정규화 확인. 캐시 삭제 반복 없이 `/api/operations/provider-sync` 4.4초 완료

## 남은 확인

- Railway 운영 환경에서 새 코드가 배포된 뒤 `/api/operations/provider-sync`를 다시 실행하면 `/data` 연동 수집 카드에 `검색광고 성과 N건`이 보여야 한다.
- 네이버 계정에 전환 추적이 꺼진 캠페인이 있으면 데이의 추적 확인 요청이 먼저 생성된다.
