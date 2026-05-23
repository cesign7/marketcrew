# ai-marketing-character-ops Act Iteration 13

> **PDCA Phase**: Act / Iteration 13
>
> **Date**: 2026-05-23 KST
>
> **Scope**: 데이터 연동 화면의 판단 근거 확장 순서
>
> **Completes**: `module-14` / provider evidence expansion roadmap
>
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-12.md`

## Act Target

대표가 “AI가 요약 근거만 읽고도 제대로 판단할 수 있는가”를 확인할 수 있도록, `/data` 화면에 다음에 보강할 provider 근거를 실제 판단 영향 순서대로 보여준다.

이번 iteration은 외부 API 호출 범위를 늘리지 않는다. 공식 API 문서 기준으로 추가 수집 후보와 판단 예시, 완료 기준을 정리하고, 이후 module이 순서대로 구현할 수 있는 작업 단위로 고정한다.

## Implemented Change

| Area | Change |
|------|--------|
| View model | `ProviderEvidenceExpansionPlanView`와 `providerEvidenceExpansionPlans`를 추가했다. |
| Plan source | `provider-evidence-expansion-plans.ts`가 5단계 근거 보강 순서를 제공한다. |
| Data page UI | `/data`에 `근거 보강 계획` 섹션을 추가해 순서, 우선순위, 추가할 근거, 판단 예시, 완료 기준, 공식 문서 출처를 보여준다. |
| Channel filter | 스티커씨/커피프린트 선택 시 채널별 근거만 줄이되, 검색광고와 데이터랩은 별도 채널이 아니라 공통 마케팅 근거로 유지했다. |
| Responsive layout | 긴 한국어 문장이 카드 밖으로 밀리지 않게 줄바꿈, 카드 폭, 모바일 1열 레이아웃을 고정했다. |
| Tests | 컴포넌트 테스트와 view model 테스트에 새 계획 섹션을 추가했다. |
| Docs | Plan, Design 문서와 이번 iteration 문서에 `module-14` 완료 목표와 후속 module 순서를 명시했다. |

## Evidence Expansion Order

| 순서 | 모듈 | 대상 | 판단 근거 |
|------|------|------|-----------|
| 1 | `module-14` | 광고그룹 실제 설정 | PC/모바일 집행 설정, 기기별 입찰 가중치, 예산, 상태, 요일/시간/지역/연령/성별 타겟 |
| 2 | `module-15` | 기기·시간대·요일 성과 | PC/모바일, 시간대, 요일별 노출/클릭/광고비/전환 성과 |
| 3 | `module-16` | 스마트스토어 순매출과 클레임 | 할인액, 배송비, 취소/반품/교환, 구매확정, 상품 코드 매핑 |
| 4 | `module-17` | 데이터랩 세그먼트 | 성별, 연령, 기기, 기간 단위별 상대 검색 추이 |
| 5 | `module-18` | 스마트스토어 데이터솔루션 | 판매 분석, 고객 분석, 유입/전환 분석 권한 확인 후 확장 |

## Verification

| Check | Result |
|-------|--------|
| TDD red check | `ProviderEvidenceExpansionPlanPanel` 미존재 상태에서 대상 컴포넌트 테스트 실패 확인 |
| 대상 컴포넌트/view model 테스트 | 3 files, 5 tests passed |
| 데이터 필터 테스트 | `data-filters` passed. 검색광고와 데이터랩은 공통 마케팅 근거로 유지된다. |
| 전체 단위 테스트 | 37 files, 103 tests passed |
| 타입체크 | `npm run typecheck` passed |
| Production build | `npm run build` passed |
| Local HTTP smoke | `GET /data` returned 200 and contained `판단 근거 확장 순서`, `광고그룹 실제 설정`, `스마트스토어 순매출과 클레임`, `데이터랩 세그먼트` |
| Mobile layout smoke | 390px viewport에서 document width가 390px로 유지되어 가로 스크롤이 생기지 않음 |

## MVP Progress

1차 MVP 대비 진행율은 **100%**로 유지한다. 이번 작업은 이미 닫힌 1차 MVP 위에 “판단 근거를 어떤 순서로 더 정교하게 만들 것인가”를 붙인 운영 보강이다. 실제 외부 write와 대량 LLM 입력은 여전히 1차 MVP 밖으로 둔다.

## Act Decision

`module-14`는 local MVP 기준으로 구현됐다. 다음 안전한 순서는 `module-15` 검색광고 광고그룹 실제 설정 스냅샷, 그다음 `module-16` 기기·시간대·요일 성과 분해다.
