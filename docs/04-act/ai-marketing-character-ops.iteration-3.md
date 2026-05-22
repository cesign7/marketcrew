# ai-marketing-character-ops Act Iteration 3

> **PDCA Phase**: Act / Iteration 3
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Read-only provider sync slice + live env reflection
>
> **Completes**: `module-6C` / Search Ad and DataLab read-only provider sync goal
>
> **Check Source**: `docs/03-analysis/ai-marketing-character-ops.analysis.md`

## Act Target

Check 단계의 G-2를 줄인다. 실제 provider write는 열지 않고, 네이버 키워드광고와 네이버 데이터랩의 읽기 전용 동기화 계약을 failure-safe report로 만든다.

## Source Verification

| Provider | Official Source | Reflected Contract |
|----------|-----------------|--------------------|
| 네이버 검색광고 | `https://github.com/naver/searchad-apidoc`, `https://naver.github.io/searchad-apidoc/` | API license/secret/customer id 기반, `X-Timestamp`, `X-API-KEY`, `X-Customer`, `X-Signature` 헤더 조합. |
| 네이버 데이터랩 | `https://developers.naver.com/docs/serviceapi/datalab/search/search.md` | `POST https://openapi.naver.com/v1/datalab/search`, Client ID/Secret 헤더, keyword group 최대 5개, group별 keyword 최대 20개, ratio는 상대값. |

## Implemented Change

| Area | Change |
|------|--------|
| 도메인 | `ProviderSyncReport`와 `ProviderSyncStatus`를 추가하고, report에 `KeywordDemandSnapshot` / `SearchTrendSnapshot` payload를 붙일 수 있게 했다. |
| Search Ad | read-only sync report, keyword tool request builder, HMAC-SHA256 signature helper를 추가했다. 실제 env 이름은 `NAVER_SEARCH_AD_ACCESS_LICENSE`를 우선 사용하고 기존 `NAVER_SEARCH_AD_API_KEY`는 alias로 허용한다. |
| Search Ad keyword | 네이버 keyword tool의 `hintKeywords`는 공백 포함 한국어 문구에서 400을 반환할 수 있어, Search Ad 요청에 한해 내부 공백을 제거한다. DataLab 트렌드 키워드는 문구 그대로 유지한다. |
| DataLab | read-only sync report, request body limiter, `SearchTrendSnapshot` mapper를 추가했다. |
| API | `GET /api/operations/provider-sync`를 추가하고 `/api/operations/readiness`에도 sync report를 포함했다. |
| Persistence | live read-only sync 결과를 workflow store에 저장한다. `ProviderSyncReport`, generated `Signal`, `KeywordDemandSnapshot`, `SearchTrendSnapshot`을 재조회할 수 있다. |
| 안전 경계 | missing env면 네트워크 호출을 하지 않고 `SKIPPED_MISSING_CONFIG`와 내부 signal 후보만 반환한다. 모든 report는 `writeAttempted: false`다. |

## Live Env Result

2026-05-22 KST에 로컬 `.env` 기준으로 실제 read-only sync를 실행했다. 비밀값은 출력하지 않았고, 외부 write는 시도하지 않았다.

| Provider | Result |
|----------|--------|
| Search Ad | `SYNCED`, HTTP 200, `networkAttempted=true`, `writeAttempted=false`, `KeywordDemandSnapshot` 64건 저장 |
| DataLab | `SYNCED`, HTTP 200, `networkAttempted=true`, `writeAttempted=false`, `SearchTrendSnapshot` 2건 저장 |
| Readiness | Search Ad, DataLab, 스마트스토어/커머스, 자체 쇼핑몰/영카트, LLM 모두 `READ_ONLY_READY`, `canWrite=false` |

## Remaining Act Order

1. Browser regression slice: approval detail에서 버튼 클릭 후 status notice를 검증하는 Playwright smoke를 추가한다.
2. 스마트스토어/커머스와 자체 쇼핑몰/영카트도 Search Ad/DataLab처럼 실제 read-only sync adapter를 작은 slice로 추가한다.
3. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 12 files, 37 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed, `/api/operations/provider-sync` dynamic route included |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `GET /api/operations/provider-sync` | 200, Search Ad/DataLab both `SYNCED`, HTTP 200, `writeAttempted=false` |
| `GET /api/operations/readiness` | 200, Search Ad/DataLab/Smartstore/Shop/LLM all `READ_ONLY_READY`, `canWrite=false` |
| `GET /api/operations/workflow-state` | 200, `keywordDemandSnapshots=64`, `searchTrendSnapshots=2`, `providerSyncReports=2` |

## Act Decision

G-2는 Search Ad/DataLab 기준으로 완화됐다. 실제 네이버 읽기 동기화, 스냅샷 정규화, workflow store 저장까지 확인했다. 다만 스마트스토어/커머스와 자체 쇼핑몰/영카트는 아직 readiness까지만 반영되어 있으므로 다음 read-only adapter slice에서 이어간다.
