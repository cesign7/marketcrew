# ops-persistence-provenance-foundation Iteration 6

> **Date**: 2026-05-22 KST
> **Module/Goal**: module-6 - provider 근거의 실제 운영 브랜드/채널 구분 표시
> **Status**: Complete

## Why

대표 결재 상세에서 Smartstore와 자체 쇼핑몰이 generic label로 보이면 실제 운영 주체가 흐려진다. 현재 운영 기준은 스마트스토어가 `스티커씨`, 쇼핑몰이 `커피프린트`이므로, 승인 전 근거 확인 화면도 이 기준을 직접 보여야 한다.

## Changed

| Area | Change |
|------|--------|
| View model | `ProviderSyncEvidenceView`에 provider key, channel key, channel label, brand label을 추가했다. |
| Labeling | Smartstore는 `스마트스토어(스티커씨)`, shop은 `쇼핑몰(커피프린트)`로 표시한다. |
| Snapshot | 주문/매출/재구매/상위상품 label에 `스티커씨`, `커피프린트`를 붙였다. |
| Approval detail | 연관 근거를 먼저 정렬하되 전체 provider report를 유지한다. |
| UI | `ProviderSyncEvidencePanel`에서 `전체 근거`와 `구분 보기`를 모두 제공한다. |
| Integration labels | readiness/read-only sync 기본 label도 실제 브랜드 기준으로 정리했다. |

## Verification

| Command | Result |
|---------|--------|
| `npm test -- --run tests/application/agenda-room-view-model.test.ts tests/application/approval-detail-view-model.test.ts` | passed, 2 files / 7 tests |
| `npm test -- --run` | passed, 18 files / 63 tests |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| in-app browser `http://localhost:3001/approvals/approval-agenda-season-plan-buddha-gift-card` | `전체 4건`, `스마트스토어(스티커씨)`, `쇼핑몰(커피프린트)`, `전체 근거`, `구분 보기`, 스티커씨/커피프린트 집계 label visible |

## Risk

- 표시 범위 변경으로 결재 상세의 provider 근거 수가 늘어난다. 대신 연관 provider를 먼저 정렬해 결재 맥락을 잃지 않게 했다.
- 외부 provider write는 계속 차단한다.

## Next

`ops-persistence-provenance-foundation`은 Check 단계로 넘길 수 있다. 다음 작업은 acceptance criteria 재점검, 문서/테스트 gap 확인, 필요 시 final hardening이다.
