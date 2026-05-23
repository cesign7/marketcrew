# ai-marketing-character-ops Act Iteration 20

> **Module/Goal**: `module-13C 성장성과 상품 후보 상세 드릴다운`으로 상품 후보 카드에서 전체 상품명, 근거, 수집 기록, 다음 액션을 즉시 펼쳐본다.
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-19.md`
> **Date**: 2026-05-23
> **Status**: Done

## Context

운영 `/growth` 화면에는 실제 상품 후보 카드가 3개 노출된다. Iteration 19에서 카드 안의 긴 상품명은 짧게 표시하도록 안정화했지만, 대표가 전체 상품명과 판단 근거를 확인하려면 hover나 주변 근거를 따로 읽어야 했다.

## Changes

| Area | Result |
|------|--------|
| 카드 상호작용 | 상품 후보 카드마다 `근거 자세히 보기` 접힘 영역을 추가했다. |
| 전체 상품명 | 대상 상품명과 제안 제목은 자르지 않은 원문으로 드릴다운에 표시한다. |
| 근거 묶음 | 키워드 후보, 판단 근거, 수집 기록, 다음 액션, 외부 반영 잠금 문구를 한 곳에 묶었다. |
| 이미지 근거 | 드릴다운 안에도 대표 상품 이미지를 함께 보여준다. |
| 안전 경계 | 화면 표시만 확장하며 provider write와 실제 외부 반영은 계속 차단한다. |

## Read-Only Contract

이번 변경은 저장 데이터나 외부 API write 동작을 바꾸지 않는다. 이미 만들어진 `ProductGrowthOpportunityView`를 더 자세히 보여주는 UI 확장이다.

## Verification

| Check | Result |
|-------|--------|
| Live site observation | `https://marketcrew.app/growth`에서 상품 후보 카드 3개, 빈 상태 아님, 콘솔 오류 없음 확인 |
| Component test | `npm test -- tests/components/product-growth-opportunity-panel.test.ts` passed |
| Typecheck | `npm run typecheck` passed |
| Build | `npm run build` passed |
| Browser local interaction smoke | `/growth` 실제 DB 화면에서 상품 후보 카드 3개, 드릴다운 3개, `대상 상품/판단 근거/수집 기록` 확인 |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 MVP 이후 성장성과 화면에서 대표가 근거를 더 빠르게 확인하게 만드는 운영 UX 보강이다.

## Next

다음 안전한 순서는 실제 데이터 수집 결과와 LLM 판단 결과를 운영 화면에서 분리해 보여주는 것이다.
