# mvp-final-provenance-closeout Completion Report

> **Project**: marketcrew2
> **Feature**: `mvp-final-provenance-closeout`
> **Date**: 2026-05-22 KST
> **Status**: Complete
> **1차 MVP 대비 진행율**: 100%

## Summary

대표가 `/operations`에서 결재 미리보기 카드만 보고도 해당 안건의 근거 흐름을 확인할 수 있게 했다. 카드별로 데이터 근거, AI 실행 이력, 연동 수집 기록, 성과 체크포인트, 안전 조건을 한 화면에 묶어 표시한다.

## Completed

| Area | Result |
|------|--------|
| 안건별 근거 추적 | `카드별 근거 추적` UI 추가 |
| Provenance summary | 근거 수, 실행 이력 수, 연동 수집 수를 카드별로 표시 |
| Evidence categories | 내부 ID 대신 키워드 수요, 데이터 시그널, 스마트스토어 집계, 쇼핑몰 집계로 요약 |
| AgentRun linkage | 연결된 오피 계획/대표 결정/연동 수집 실행 이력을 카드에서 확인 |
| Safety copy | 원천 행 제외, 외부 반영 잠금, 데이터 신뢰도, 위험도를 카드별 안전 조건으로 표시 |
| E2E stability | 병렬 실행에서도 결재/후속 업무 smoke가 충돌하지 않도록 조정 |

## Verification

| Command / Check | Result |
|-----------------|--------|
| `npm run typecheck` | passed |
| `npm test -- --run` | passed, 21 files / 70 tests |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium` | passed, 3 tests |
| `localhost:3001` browser text scan | `/operations`, `/approvals/[id]`, `/follow-ups` all OK |

## MVP Boundary

1차 MVP는 완료로 본다. 실제 광고/쇼핑몰/CRM write executor와 실제 LLM adapter call은 후속 확장이다. MVP에서는 외부 반영 잠금과 비용 가드가 정상적으로 유지되는 것이 완료 조건이다.
