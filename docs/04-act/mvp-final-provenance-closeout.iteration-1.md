# mvp-final-provenance-closeout Iteration 1

> **Project**: marketcrew2
> **Feature**: `mvp-final-provenance-closeout`
> **Date**: 2026-05-22 KST
> **Module/Goal**: 1차 MVP 마지막 0.5% / `/operations` 안건별 근거 드릴다운
> **Status**: Complete

## Goal

1차 MVP 99.5% 상태에서 남은 작업은 외부 쓰기 개방이 아니라, 대표가 `/operations`의 결재 카드 안에서 데이터 근거, AI 실행 이력, 연동 수집 기록, 안전 조건을 바로 확인하는 운영 완성도였다.

## Implemented

| Area | Result |
|------|--------|
| View model | `ApprovalPreviewView.provenance`를 추가해 카드별 근거 수, AI 실행 이력, 연동 수집 기록, 성과 체크포인트, 안전 조건을 계산한다. |
| UI | `ApprovalPreviewPanel`에 `카드별 근거 추적` 영역을 추가했다. |
| Korean operator copy | 대표 화면에는 내부 ID 대신 `키워드 수요`, `데이터 시그널`, `스마트스토어 집계`, `쇼핑몰 집계`, `AI 실행 이력`, `연동 수집`으로 표시한다. |
| Test stability | e2e가 같은 결재안을 병렬로 바꾸지 않도록 후속 업무 테스트 결재안을 분리하고 상태 카운트 검증을 병렬 실행에 안전하게 조정했다. |
| Safety | 실제 provider write와 실제 LLM call은 열지 않았다. 외부 반영 잠금은 유지한다. |

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS, 21 files / 70 tests |
| `npm run build` | PASS |
| `npm audit --omit=dev` | PASS, 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium` | PASS, 3 tests |
| Browser text scan on `localhost:3001` | PASS, `/operations`, `/approvals/[id]`, `/follow-ups` |

## Result

1차 MVP 대비 진행율은 100%로 닫는다. 다음 작업부터는 1차 MVP 후속 확장으로 분류한다.
