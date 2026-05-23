# ai-marketing-character-ops Act Iteration 19

> **Module/Goal**: `module-13B 성장성과 상품명 표시 가드`로 상품명, 대상 상품, 키워드 후보가 카드 레이아웃을 밀지 않게 화면 표시 길이를 제한한다.
> **Check Source**: `docs/04-act/ai-marketing-character-ops.iteration-18.md`
> **Date**: 2026-05-23
> **Status**: Done

## Context

성장성과 화면은 스마트스토어 대표 상품 이미지까지 보여주도록 보강됐지만, 실제 상품명은 운영 데이터에서 매우 길어질 수 있다. 상품명이 카드 제목, 대상 상품 라벨, 키워드 후보 칩에 그대로 노출되면 한눈에 보는 화면이 깨지고 모바일에서 줄바꿈이 과해진다.

## Changes

| Area | Result |
|------|--------|
| 상품 카드 제목 | 화면 표시 문자열은 28자까지 보이고 `...`를 붙인다. |
| 대상 상품 라벨 | 화면 표시 문자열은 16자까지 보이고 `...`를 붙인다. |
| 키워드 후보 칩 | 화면 표시 문자열은 18자까지 보이고 `...`를 붙인다. |
| 근거 라벨 | `대표 상품 ...`처럼 상품명이 섞인 근거 라벨은 24자까지 보이고 `...`를 붙인다. |
| 원문 보존 | 상품명, 대상 상품명, 키워드, 근거 라벨 원문은 데이터와 `title` hover 정보로 보존한다. |
| CSS guard | 칩과 라벨은 `text-overflow: ellipsis`로 추가 안전장치를 둔다. |

## Read-Only Contract

이번 변경은 화면 표시만 줄인다. provider 원천 데이터, 저장 집계, 판단 근거, 후속 안건 데이터는 자르지 않는다.

## Verification

| Check | Result |
|-------|--------|
| Component test | `npm test -- tests/components/product-growth-opportunity-panel.test.ts` passed |
| Typecheck | `npm run typecheck` passed |
| Production build | `npm run build` passed |
| Diff whitespace check | `git diff --check` passed |
| Browser smoke | `/growth`가 로컬 브라우저에서 열리고 콘솔 오류가 없음을 확인했다. 로컬 데이터에는 상품 후보 카드가 없어 실제 카드 렌더는 component test로 고정했다. |

## MVP Progress

1차 MVP 대비 진행율은 **100% 유지**다. 이번 작업은 MVP 이후 성장성과 화면의 운영 가독성을 높이는 표시 안정화다.

## Next

다음 안전한 순서는 운영 데이터에 실제 상품 후보가 쌓인 상태에서 `/growth`의 상품 이미지, 짧은 상품명, hover 원문 노출을 웹사이트 주소 기준으로 한 번 더 확인하는 것이다.
