# ai-marketing-character-ops Act Iteration 5

> **PDCA Phase**: Act / Iteration 5
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Smartstore/Commerce + Youngcart read-only aggregate adapters
>
> **Completes**: `module-6E` / Smartstore-Commerce and Youngcart aggregate read-only adapter goal
>
> **Check Source**: `docs/03-analysis/ai-marketing-character-ops.analysis.md`

## Act Target

Check 단계의 G-2를 Search Ad/DataLab에서 스마트스토어/커머스와 자체 쇼핑몰/영카트까지 넓힌다. 실제 provider write는 열지 않고, 주문/매출/재구매 근거를 aggregate-only report와 내부 `Signal`로 남긴다.

## Source Verification

| Provider | Source | Reflected Contract |
|----------|--------|--------------------|
| 네이버 커머스 | `https://apicenter.commerce.naver.com/docs/auth`, `https://apicenter.commerce.naver.com/docs/commerce-api/current/주문-조회` | Client Credentials token, bcrypt 기반 `client_secret_sign`, Bearer token, 주문 변경 조회 + 주문 상세 조회. |
| 영카트 bridge | `integrations/youngcart-bridge/README.md` 계약과 이전 bridge path | `X-MarketCrew-Token` header, `action=aggregate`, aggregate-only JSON. 고객/주문 원문 row, DB 정보, token 저장 금지. |

## Implemented Change

| Area | Change |
|------|--------|
| 도메인 | `CommerceAggregateSnapshot`, `ShopAggregateSnapshot`을 추가하고 `ProviderSyncReport`가 `smartstore` / `shop` provider도 담을 수 있게 했다. |
| Commerce adapter | 네이버 커머스 토큰 요청, bcrypt `client_secret_sign`, 변경 주문 ID 조회, 주문 상세 조회, 주문/매출 aggregate 정규화를 추가했다. |
| Youngcart adapter | token-protected bridge `aggregate` 호출, 주문/재구매/매출 aggregate 정규화, bridge token/query 노출 방지 테스트를 추가했다. |
| Provider sync | `/api/operations/provider-sync`가 Search Ad, DataLab, Smartstore/Commerce, Youngcart 네 채널을 함께 실행하고 report를 저장한다. |
| Readiness | 커머스 서명/토큰 probe 승인 플래그와 영카트 PII 최소화 승인 플래그를 readiness gate에 포함했다. |
| 의존성 | 네이버 커머스 공식 서명 방식 때문에 `bcryptjs`를 런타임 의존성으로 추가했다. |

## Live Env Result

2026-05-22 KST에 로컬 `.env` 기준으로 실제 read-only sync를 실행했다. 비밀값, access token, bridge token, 주문번호 목록, raw order row는 출력하거나 저장하지 않았다.

| Provider | Result |
|----------|--------|
| Search Ad | `SYNCED`, HTTP 200, `KeywordDemandSnapshot` 64건 |
| DataLab | `SYNCED`, HTTP 200, `SearchTrendSnapshot` 2건 |
| Smartstore/Commerce | `SYNCED`, HTTP 200, 최근 주문 aggregate 100건, 매출 600,120원, `dataScope=aggregate_only` |
| Youngcart | `SYNCED`, HTTP 200, 주문 28건, 재구매 고객 4명, 매출 4,081,900원, `dataScope=aggregate_only` |
| Workflow state | `providerSyncReports=6`, 최근 report에 `smartstore` / `shop` 포함 |

## Safety Boundary

이번 iteration은 읽기 전용이다. 외부 상품 수정, 노출 변경, 주문 상태 변경, 광고 입찰/예산 변경, 메시지/쿠폰 발송은 호출하지 않는다. 커머스 token/signature와 영카트 bridge token은 report, signal, workflow store에 저장하지 않는다.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 12 files, 43 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| `GET /api/operations/provider-sync` | 200, four providers returned, all `writeAttempted=false`; Smartstore/Youngcart both `SYNCED` |

## Remaining Act Order

1. 커머스/영카트 aggregate `Signal`을 마루/프로/리피의 실제 안건 후보로 연결한다.
2. provider sync 결과와 snapshot/report 근거를 `/operations` 화면에서 대표가 볼 수 있게 노출한다.
3. 스마트스토어/자체몰 집계와 Search Ad 키워드 수요를 합쳐 상품별 키워드/마케팅 제안, 상품 발굴 후보를 만든다.
4. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

G-2는 주요 4개 read provider 기준으로 완화됐다. 이제 Search Ad/DataLab/Smartstore/Youngcart가 같은 provider-sync API에서 read-only report를 만들고, 커머스와 영카트는 aggregate-only 스냅샷과 내부 signal을 남긴다. 다음 iteration은 이 근거를 캐릭터 안건 생성과 대표 화면에 연결하는 것이다.
