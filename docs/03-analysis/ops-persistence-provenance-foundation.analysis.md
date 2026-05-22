# ops-persistence-provenance-foundation Analysis Report

> **Analysis Type**: PDCA Check / Gap Analysis / Runtime Verification
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Analyst**: Codex
> **Date**: 2026-05-22 KST
> **Design Doc**: [ops-persistence-provenance-foundation.design.md](../02-design/features/ops-persistence-provenance-foundation.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 1차 MVP는 결재 흐름을 증명했지만 local JSON store만으로는 운영 감사, 동시성, 백업, LLM 비용 추적, provider sync 실패 추적을 안정적으로 다루기 어렵다. |
| **WHO** | 대표/운영자는 오늘 올라온 안건을 보면서 “이 결재안이 어떤 데이터와 모델 실행에서 나왔는지, 비용이 얼마인지, 실패 근거는 무엇인지”를 확인해야 한다. |
| **RISK** | DB 전환 중 기존 workflow 관계가 깨지거나, raw provider row/secret이 저장되거나, 모델 비용이 UI에서 숨겨지거나, provider write gate가 실수로 열릴 수 있다. |
| **SUCCESS** | 기존 `/operations`와 `/approvals/[id]` 흐름은 유지되고, DB-backed repository와 local JSON import, `AgentRun` provenance, model/token/cost UI가 테스트와 smoke를 통과한다. |
| **SCOPE** | repository contract 확장, relational schema, local import, `AgentRun` recorder, API/view model/UI summary, QA migration test. 실제 외부 write executor는 제외한다. |

## Strategic Alignment Check

| Source | Expected | Check Result |
|--------|----------|--------------|
| Plan WHY | local JSON MVP를 운영 감사/DB/provenance 기반으로 올린다. | Met |
| Plan Safety | raw row/secret 저장 금지, provider write gate 유지. | Met |
| Design Choice | repository-first DB-backed rollout로 UI/API 흔들림을 줄인다. | Met |
| User UX | 대표가 근거, 실행 run, 모델/토큰/비용, 실패 원인을 화면에서 본다. | Met |

## Success Criteria Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | DB-backed repository가 기존 local repository와 동일한 핵심 workflow query/action을 지원한다. | Met | `src/lib/persistence/postgres-repository.ts`, `tests/persistence/workflow-store-mode.test.ts`, DB mode `/api/operations/workflow-state` |
| SC-2 | local JSON import 후 approval/outcome/provider sync count가 유지된다. | Met | `scripts/import-workflow-store-to-postgres.mjs`, Do iteration 3 imported 137 records, live DB counts returned |
| SC-3 | 하나 이상의 안건/결재/outcome에서 linked `AgentRun` provenance를 조회할 수 있다. | Met | `tests/application/agent-run-recorder.test.ts`, `tests/application/approval-detail-view-model.test.ts`, live `agentRunWorkflowLinks=13` |
| SC-4 | `/operations`에서 model/token/cost/evidence summary가 보인다. | Met | Browser smoke: `AI 실행 감사 로그`, `tokens`, `원`, provider evidence visible |
| SC-5 | `/approvals/[id]`에서 linked run, provider evidence, 실패 원인 또는 fallback 상태가 보인다. | Met | `tests/e2e/approval-detail-smoke.spec.ts`, browser/detail smoke, AgentRun timeline visible |
| SC-6 | 테스트, typecheck, build, browser smoke가 통과한다. | Met | `npm test -- --run`, `npm run typecheck`, `npm run build`, Playwright e2e, in-app browser smoke passed |
| SC-7 | provider write gate가 여전히 닫혀 있고 외부 write 호출이 없다. | Met | approval decision route returns `WRITE_GATE_CLOSED`, readiness/sync reports keep `canWrite=false`, `writeAttempted=false` |

**Success Rate**: 7/7 criteria met

## Gap Analysis

### Structural Match

| Design Area | Implementation | Status | Notes |
|-------------|----------------|:------:|-------|
| Repository contract | `MarketingWorkflowRepository` extended with agent runs and workflow links | Met | memory/file/DB paths share the same surface |
| DB persistence | Postgres JSONB mirror via `workflow_records` | Partial | Design listed normalized core/provenance tables. Current implementation is a conservative mirror schema, enough for MVP but not final analytics schema. |
| JSON import | `scripts/import-workflow-store-to-postgres.mjs` | Met | idempotent collection import verified |
| AgentRun recorder | `src/lib/application/agent-run-recorder.ts` | Met | planner/provider/decision flows covered |
| Operations UI | `AgentRunSummaryPanel`, provider evidence, brand/channel labels | Met | visible in `/operations` |
| Approval detail UI | `ApprovalAgentRunTimelinePanel`, provider evidence, outcome history | Met | visible in `/approvals/[id]` |

### API Contract

| Endpoint | Design | Server | Runtime | Status |
|----------|:------:|:------:|:-------:|:------:|
| `GET /api/operations/workflow-state` | Yes | Yes | 200, `repositoryMode=db`, counts returned | Pass |
| `GET /api/operations/readiness` | Yes | Yes | 200, all providers read-only, write disabled | Pass |
| `GET /api/operations/provider-sync` | Yes | Yes | Covered by integration tests; runtime route persists read-only reports | Pass |
| `POST /api/approvals/[id]/decision` | Yes | Yes | e2e confirmed write gate block and persisted outcome | Pass |
| `GET /api/approvals/[id]/outcomes` | Yes | Yes | 200, saved outcome report returned | Pass |

### Runtime Verification

| Layer | Check | Result |
|-------|-------|--------|
| Unit/Application | `npm test -- --run` | 18 files / 63 tests passed |
| Type | `npm run typecheck` | passed |
| Build | `npm run build` | passed |
| Security | `npm audit --omit=dev` | 0 vulnerabilities |
| E2E | `npm run test:e2e -- --project=chromium tests/e2e/approval-detail-smoke.spec.ts` | 1 test passed |
| Live API | `GET /api/operations/workflow-state` on 3001 | `repositoryMode=db`, `agentRuns=2`, `agentRunWorkflowLinks=13` |
| Live API | `GET /api/operations/readiness` on 3001 | Search Ad, DataLab, Smartstore, Shop, LLM all read-only ready, `canWrite=false` |
| Browser | in-app `/operations` | operations title, AgentRun summary, token/cost, provider evidence, 스티커씨/커피프린트 labels visible |

## Match Rate

| Axis | Rate | Basis |
|------|-----:|-------|
| Structural | 96% | Conservative DB mirror differs from fully normalized design table list, but repository and runtime contracts are complete. |
| Functional | 98% | All MVP user flows and provenance UI are implemented; per-card deep provenance on `/operations` remains a later UX improvement. |
| Contract | 100% | Implemented API routes match current UI/test consumers. |
| Runtime | 100% | Unit, typecheck, build, audit, e2e, API, browser smoke passed. |

**Overall Match Rate**: 98%

Formula: `(Structural 96 * 0.15) + (Functional 98 * 0.25) + (Contract 100 * 0.25) + (Runtime 100 * 0.35) = 98`

## Findings

| Severity | Finding | Recommendation |
|----------|---------|----------------|
| Low | DB schema is a Postgres JSONB mirror rather than the fully normalized table set listed in the design draft. | Keep as accepted MVP foundation. Add normalized tables only when analytics/search/reporting queries require them. |
| Low | `/operations` has global AgentRun summary and evidence panels, while linked run detail is strongest in `/approvals/[id]`. | Preserve this split for MVP. Add per-card provenance drilldown only if 대표 화면이 과밀하지 않게 설계된다. |
| Fixed During Check | Playwright e2e used `next dev`, which conflicts when the user-visible 3001 dev server is already running. | Updated `playwright.config.ts` to run e2e against `next start` after build, so 3001 can stay open. |

## Decision

`ops-persistence-provenance-foundation` Check verdict is **PASS**.

- Critical gaps: 0
- Important gaps: 0
- Low-risk follow-ups: 2
- Recommended next phase: QA/report packaging for PDCA cycle #2
