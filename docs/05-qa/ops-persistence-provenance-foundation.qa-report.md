# QA Report: ops-persistence-provenance-foundation

> **Date**: 2026-05-22 KST
> **Verdict**: QA_PASS
> **Pass Rate**: 100% of executed checks
> **Critical Issues**: 0
> **Feature**: ops-persistence-provenance-foundation

---

## 1. Test Summary

| Level | Type | Status | Pass Rate | Failed |
|-------|------|:------:|:---------:|:------:|
| L1 | Unit / Application / Route / Persistence Tests | PASS | 100% | 0 |
| L2 | API / Runtime DB Smoke | PASS | 100% | 0 |
| L3 | E2E Test | PASS | 100% | 0 |
| L4 | UX Flow Smoke | PASS | 100% | 0 |
| L5 | Provenance / Safety Integrity | PASS | 100% | 0 |

## 2. Executed Checks

| Check | Result |
|-------|--------|
| `npm test -- --run` | 18 files, 63 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/approval-detail-smoke.spec.ts` | 1 chromium smoke passed |
| `GET /api/operations/workflow-state` on port 3001 | `repositoryMode=db`, `agentRuns=2`, `agentRunWorkflowLinks=13` |
| `GET /api/operations/readiness` on port 3001 | Search Ad, DataLab, Smartstore, Shop, LLM readiness returned; all write gates disabled |
| `GET /api/approvals/approval-agenda-season-plan-buddha-gift-card/outcomes` | 1 outcome report returned, first state `판단 보류` |
| Browser smoke `/operations` | `오늘 올라온 안건`, `AI 실행 감사 로그`, token/cost, provider evidence, 스티커씨/커피프린트 labels visible |
| Browser smoke `/approvals/[id]` | AgentRun timeline, provider evidence, outcome history, 전체/구분 provider evidence visible |

## 3. Failed Tests

No failed tests remain.

## 4. Critical Issues

No critical QA blocker found.

## 5. Debug Analysis

- During Check, Playwright e2e initially conflicted with the user-visible local dev server on port `3001`.
- `playwright.config.ts` was hardened so e2e runs against `next start` after build with `MARKETCREW_REPOSITORY_MODE=file`, while the operator browser can remain open on `http://localhost:3001/operations`.
- This was a QA infrastructure issue, not a product behavior failure.
- The live app remains DB-backed through `.env` with `MARKETCREW_REPOSITORY_MODE="db"`.

## 6. Metrics

| Metric | Value |
|--------|-------|
| QA Pass Rate | 100% of executed QA checks |
| L1 Test Coverage | 18 test files / 63 tests |
| E2E Coverage | 1 core approval-detail chromium scenario |
| Runtime Error Count | 0 blocking runtime errors |
| Provenance Integrity | PASS: AgentRun, workflow links, model/token/cost, provider evidence visible |
| Safety Boundary | PASS: `canWrite=false`, `writeAttempted=false`, provider write remains blocked |

## 7. L5 Provenance / Safety Evidence

| Flow | Evidence |
|------|----------|
| DB-backed repository -> Operations UI | `/api/operations/workflow-state` returned `repositoryMode=db` and DB-backed counts. |
| Provider sync -> evidence UI | `/operations` and `/approvals/[id]` render provider reports with `스마트스토어(스티커씨)` and `쇼핑몰(커피프린트)` labels. |
| AgentRun recorder -> Approval detail | Detail view renders linked run timeline, provider/model/mode, tokens, cost, evidence count, and relation links. |
| Owner decision -> outcome history | Decision route persisted deterministic owner-decision workflow links and outcomes; outcome API re-read succeeded. |
| Safety gate -> no external write | Readiness and execution results keep write disabled; actual provider write executor is not enabled in this cycle. |

## 8. Recommendations

1. Proceed to PDCA Report phase for cycle #2 completion.
2. Keep actual provider write disabled until a separate write-executor plan, rollback proof, and same-turn owner approval exist.
3. Treat the current Postgres JSONB mirror as the accepted MVP operating foundation; add normalized tables only when analytics/search/reporting queries require them.
4. Add a dedicated `FollowUpInternalTask` queue and per-card provenance drilldown as separate, smaller PDCA candidates.

## 9. Browser Status

- Codex in-app browser remains pointed at `http://localhost:3001/operations`.
- The local runtime on port `3001` is the operator-visible DB-backed app.
- E2E verification is isolated from the operator-visible dev server.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-05-22 | Initial QA report after Check 98% PASS state |
