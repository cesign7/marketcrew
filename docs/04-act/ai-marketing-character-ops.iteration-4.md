# ai-marketing-character-ops Act Iteration 4

> **PDCA Phase**: Act / Iteration 4
>
> **Date**: 2026-05-22 KST
>
> **Scope**: Approval detail browser regression slice
>
> **Completes**: `module-6D` / approval detail browser regression and write-gate proof goal
>
> **Check Source**: `docs/03-analysis/ai-marketing-character-ops.analysis.md`

## Act Target

Check 단계에서 남은 브라우저 회귀 위험을 줄인다. 대표가 결재 상세 화면에서 실제 버튼을 클릭했을 때 API 응답이 화면 상태 알림으로 보이고, 외부 write gate가 닫힌 상태에서는 안전하게 차단되어야 한다.

## Implemented Change

| Area | Change |
|------|--------|
| E2E runner | `@playwright/test`를 devDependency로 추가하고 `npm run test:e2e` script를 추가했다. |
| Playwright config | `playwright.config.ts`를 추가해 Next dev server를 3010 포트에서 테스트용 workflow store로 실행한다. |
| Browser smoke | `tests/e2e/approval-detail-smoke.spec.ts`가 결재 상세 페이지 진입, 메모 입력, `승인 후 바로 반영` 클릭, `WRITE_GATE_CLOSED` 알림, workflow-state 저장 카운트를 검증한다. |
| Next dev config | `next.config.mjs`에 `allowedDevOrigins: ["127.0.0.1"]`를 추가해 Playwright dev-server smoke의 HMR origin 경고를 줄였다. |

## Safety Boundary

이번 iteration은 실제 provider write를 열지 않는다. 테스트는 의도적으로 write gate가 닫힌 기본 상태를 검증하며, 성공 조건은 외부 반영이 아니라 `NEEDS_MANUAL_ACTION` / `WRITE_GATE_CLOSED`가 대표 화면에 보이는 것이다.

## Verification

| Check | Result |
|-------|--------|
| `npm test` | 12 files, 37 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed, approval detail click produced `WRITE_GATE_CLOSED` notice |

## Remaining Act Order

1. 스마트스토어/커머스 read-only adapter를 실제 env 기준 작은 slice로 추가한다.
2. 자체 쇼핑몰/영카트 read-only bridge adapter를 실제 env 기준 작은 slice로 추가한다.
3. provider read 결과를 하위 캐릭터 안건 생성 근거로 연결한다.
4. 실제 provider write는 계속 차단하고, 대표 승인 + write gate + preflight + rollback 조건이 모두 갖춰진 뒤 별도 Act로 연다.

## Act Decision

브라우저 회귀 위험은 local MVP 기준으로 완화됐다. 대표 결재 상세 화면은 API 연결, 상태 알림, write gate 차단 메시지를 실제 브라우저에서 확인했다. 다음 iteration은 readiness를 넘어서 스마트스토어/커머스와 영카트의 실제 read-only adapter를 구현한다.
