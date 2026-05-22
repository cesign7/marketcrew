# ai-marketing-character-ops Act Iteration 8

> **PDCA Phase**: Act / Iteration 8
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Product keyword, marketing, and discovery opportunity synthesis
>
> **Completes**: `module-9` / Search Ad demand + commerce/shop aggregate opportunity synthesis goal
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-7.md`

## Act Target

Iteration 7에서 provider sync report 근거를 대표 화면에 직접 노출했다. 이번 iteration은 같은 read-only 근거를 조합해 상품별 키워드 확장, 마케팅 문구/기획전 초안, 상품 발굴 후보를 만든다. LLM 비용을 줄이기 위해 원천 행은 보내지 않고, Search Ad 상위 `KeywordDemandSnapshot`과 Smartstore/Youngcart aggregate snapshot만 사용한다.

## Implemented Change

| Area | Change |
|------|--------|
| Application | `buildProductGrowthOpportunities`를 추가해 Search Ad keyword demand, Smartstore aggregate, Youngcart aggregate를 조합한다. |
| Opportunity types | `KEYWORD_EXPANSION`, `MARKETING_PROPOSAL`, `PRODUCT_DISCOVERY` 세 후보를 만든다. |
| Character mapping | 키워드 확장은 `그로`, 마케팅 초안은 `카피`, 상품 발굴은 `프로`가 담당한다. |
| Operations UI | `ProductGrowthOpportunityPanel`을 추가해 상품명, 키워드 후보, 근거 label, 다음 담당자 행동, write gate 경계를 보여준다. |
| Safety | 후보는 내부 초안이다. 광고 키워드 추가, 입찰/예산 변경, 상품 수정, 쿠폰/CRM 발송은 계속 차단한다. |

## Opportunity Contract

| Opportunity | Combined Evidence | Owner | Output |
|-------------|-------------------|-------|--------|
| Keyword expansion | Smartstore top product + Search Ad top keyword demand + DataLab trend note | `gro` | 검색광고 키워드/랜딩 초안 후보 |
| Marketing proposal | Smartstore top product + season/gift keyword demand | `copy` | 상품 메시지, 배너, 기획전 카피 초안 후보 |
| Product discovery | Smartstore sales + Youngcart repeat customers + keyword demand | `pro` | 시즌 선물형 묶음, 감사 카드, 재구매 제안 후보 |

## Verification

| Check | Result |
|-------|--------|
| `npm test -- --run` | 14 files, 48 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| `GET /api/operations/provider-sync` on `localhost:3001` | 200, four providers `SYNCED` |
| `GET /operations` on `localhost:3001` | 200, `키워드, 마케팅, 상품 발굴 후보`, `상품 키워드 확장 후보` rendered |

## Remaining Act Order

1. 승인된 내부 초안의 성과 분석 루프를 실제 provider read-only 데이터와 연결한다.
2. provider sync failure/report 근거를 결재 상세 화면에서도 직접 펼쳐볼 수 있게 한다.
3. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

`module-9`는 local MVP 기준으로 완료됐다. `/operations`는 이제 데이터 수집 결과를 보여주는 수준을 넘어, 상품별 키워드 확장, 마케팅 초안, 상품 발굴 후보를 담당 캐릭터별로 제안한다. 다음 iteration은 대표가 승인한 내부 초안이 이후 read-only 성과 비교와 outcome report로 이어지는 루프를 강화하는 것이다.
