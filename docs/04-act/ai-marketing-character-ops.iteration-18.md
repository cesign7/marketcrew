# ai-marketing-character-ops Act Iteration 18

> **Module/Goal**: `module-13A 스마트스토어 대표 상품 시각 근거`로 성장성과 카드가 주문 상세에 없는 상품 이미지를 원상품 조회 근거로 보강한다.
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-17.md`
> **Date**: 2026-05-23
> **Status**: Done

## Context

성장성과 화면은 상위 상품명을 줄이고 상품 이미지를 함께 보여주도록 개선됐다. 다만 실제 스마트스토어 주문 상세 구조는 상품명, 채널 상품 번호, 원상품 번호를 제공하지만 대표 이미지 URL은 주문 상세 필드로 고정돼 있지 않다. 따라서 주문 집계만으로 이미지를 기대하면 실제 연동에서 빈 이미지가 될 수 있다.

## Changes

| Area | Result |
|------|--------|
| Commerce adapter | 주문 상세의 `originalProductId`를 사용해 상위 상품의 원상품을 읽고, `originProduct.images.representativeImage.url`만 `CommerceAggregateSnapshot.topProductImageUrl`로 남긴다. |
| Fallback | 원상품 조회 실패, 대표 이미지 누락, 원상품 번호 누락은 동기화 실패로 처리하지 않고 화면 자동 썸네일 대체 근거를 남긴다. |
| Privacy boundary | 토큰, 주문번호, 원상품 번호, 주문 원문, 상품 원문은 저장하지 않고 집계 스냅샷과 대표 이미지 URL만 저장한다. |
| Data page contract | `/data` 스마트스토어 명세에 원상품 조회 응답과 대표 이미지 처리 기준을 추가했다. |
| Tests | 성공 경로와 이미지 조회 실패 경로를 통합 연동 테스트로 고정했다. |

## Read-Only Contract

| Step | Stored |
|------|--------|
| 최근 변경 주문 조회 | 저장 안 함. 상세 조회용 상품주문번호만 메모리에서 사용 |
| 주문 상세 조회 | 주문수, 매출, 상위 상품명만 집계 |
| 원상품 조회 | 대표 이미지 URL만 집계 스냅샷에 반영 |
| 실패/누락 | 집계는 유지하고 자동 썸네일 대체 근거를 표시 |

## Verification

| Check | Result |
|-------|--------|
| Targeted integration | `npm test -- tests/integrations/provider-read-only-sync.test.ts` 1 file / 16 tests passed |
| Typecheck | `npm run typecheck` passed |
| Full unit | `npm test` 46 files / 122 tests passed |
| Production build | `npm run build` passed |
| Diff whitespace check | `git diff --check` passed |
| Data page E2E | `npm run test:e2e -- tests/e2e/navigation-structure-smoke.spec.ts --grep "데이터 연동"` 1 Chromium test passed |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 MVP 이후 “실제 스마트스토어 데이터로 성장성과 화면을 더 믿을 수 있게 만드는 시각 근거 보강”이다.

## Next

다음 안전한 순서는 실제 운영 토큰으로 수동 수집을 실행할 수 있는 환경에서 `/data`의 스마트스토어 원상품 조회 근거와 `/growth`의 대표 상품 이미지가 같은 스냅샷에서 이어지는지 확인하는 것이다. 운영 토큰 없이도 코드는 read-only와 실패 fallback 기준까지 검증됐다.
