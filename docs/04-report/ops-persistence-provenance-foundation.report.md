# ops-persistence-provenance-foundation Completion Report

> **Status**: Complete for 1차 MVP 운영 기반
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Author**: Codex
> **Completion Date**: 2026-05-22 KST
> **PDCA Cycle**: #2

---

## Executive Summary

### 1.1 Project Overview

| Item | Content |
|------|---------|
| Feature | `ops-persistence-provenance-foundation` |
| Start Date | 2026-05-22 KST |
| End Date | 2026-05-22 KST |
| Duration | 1 day |

### 1.2 Results Summary

```text
Completion Rate: 98%

Complete:        7 / 7 success criteria
Partial:         0 / 7 success criteria
Deferred:        0 / 7 success criteria
Critical Issues: 0
QA Verdict:      QA_PASS
```

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 1차 MVP는 결재 흐름을 증명했지만 local JSON store만으로는 운영 감사, 동시성, 백업, LLM 토큰/비용 추적, provider sync 실패 원인을 안정적으로 다루기 어려웠다. |
| **Solution** | workflow repository를 DB-backed runtime으로 전환할 수 있게 만들고, local JSON import, `AgentRun`, workflow link, model/token/cost/evidence provenance를 주요 흐름에 연결했다. |
| **Function/UX Effect** | `/operations`에서 AI 실행 감사 로그, token/cost, provider evidence, DB mode 상태를 보고, `/approvals/[id]`에서 결재별 AgentRun timeline, provider evidence, outcome history를 확인할 수 있다. |
| **Core Value** | 대표가 “누가, 어떤 데이터와 모델로, 얼마의 비용을 써서, 무슨 결재안을 만들었는가”를 확인할 수 있는 운영 감사 기반을 만들었다. 실제 provider write는 여전히 닫혀 있다. |

---

## 1.4 Success Criteria Final Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | DB-backed repository가 기존 local repository와 동일한 핵심 workflow query/action을 지원한다. | Met | `src/lib/persistence/postgres-repository.ts`, repository mode tests |
| SC-2 | local JSON import 후 approval/outcome/provider sync count가 유지된다. | Met | `scripts/import-workflow-store-to-postgres.mjs`, imported 137 records, live DB counts |
| SC-3 | 하나 이상의 안건/결재/outcome에서 linked `AgentRun` provenance를 조회할 수 있다. | Met | `AgentRunRecorder`, approval detail timeline, `agentRunWorkflowLinks=13` |
| SC-4 | `/operations`에서 model/token/cost/evidence summary가 보인다. | Met | `AgentRunSummaryPanel`, browser smoke |
| SC-5 | `/approvals/[id]`에서 linked run, provider evidence, 실패 원인 또는 fallback 상태가 보인다. | Met | `ApprovalAgentRunTimelinePanel`, Playwright e2e |
| SC-6 | 테스트, typecheck, build, browser smoke가 통과한다. | Met | Vitest, typecheck, build, audit, e2e, browser smoke |
| SC-7 | provider write gate가 여전히 닫혀 있고 외부 write 호출이 없다. | Met | readiness `canWrite=false`, execution `writeAttempted=false`, no write executor activation |

**Success Rate**: 7 Met / 0 Partial / 0 Deferred.
**Operating Foundation Rate**: 98%.

## 1.5 Decision Record Summary

| Source | Decision | Followed? | Outcome |
|--------|----------|:---------:|---------|
| Plan | local JSON MVP를 운영 DB와 provenance 기반으로 올린다. | Yes | DB-backed repository mode and import path implemented |
| Plan | 대표 화면에서 model/token/cost/evidence를 숨기지 않는다. | Yes | `/operations` and approval detail show provenance summaries |
| Design | repository-first rollout로 UI/API 흔들림을 줄인다. | Yes | file/memory/DB repositories share the same workflow contract |
| Design | raw provider row/secret 저장을 피하고 aggregate/evidence summary만 사용한다. | Yes | provider reports remain summarized and read-only |
| Safety | 실제 provider write는 이번 사이클에서도 열지 않는다. | Yes | write gates remain closed and e2e verifies blocked execution |
| Check | fully normalized schema는 후속 analytics need가 생길 때 추가한다. | Yes | Postgres JSONB mirror accepted as MVP operating foundation |

---

## 2. Related Documents

| Phase | Document | Status |
|-------|----------|--------|
| Plan | [ops-persistence-provenance-foundation.plan.md](../01-plan/features/ops-persistence-provenance-foundation.plan.md) | Complete |
| Design | [ops-persistence-provenance-foundation.design.md](../02-design/features/ops-persistence-provenance-foundation.design.md) | Complete |
| Do | [ops-persistence-provenance-foundation.do.md](../03-do/ops-persistence-provenance-foundation.do.md) | Complete |
| Act | [ops-persistence-provenance-foundation.iteration-6.md](../04-act/ops-persistence-provenance-foundation.iteration-6.md) | Complete |
| Check | [ops-persistence-provenance-foundation.analysis.md](../03-analysis/ops-persistence-provenance-foundation.analysis.md) | PASS |
| QA | [ops-persistence-provenance-foundation.qa-report.md](../05-qa/ops-persistence-provenance-foundation.qa-report.md) | QA_PASS |

---

## 3. Completed Items

### 3.1 Functional Requirements

| Area | Status | Notes |
|------|--------|-------|
| AgentRun domain | Complete | run type, mode, provider/model, token/cost, evidence, workflow links |
| Repository contract | Complete | memory, file, and DB-backed paths share workflow access patterns |
| Local JSON import | Complete | `.marketcrew/workflow-store.json` imported into fresh Postgres DB |
| Runtime DB mode | Complete | `.env` local runtime reads/writes `marketcrew` Postgres DB |
| Operations provenance UI | Complete | AgentRun summary, token/cost, provider evidence, DB workflow state |
| Approval detail provenance UI | Complete | linked run timeline, provider evidence, outcome history |
| Brand/channel evidence | Complete | `스마트스토어(스티커씨)` and `쇼핑몰(커피프린트)` shown together and separately |
| E2E isolation | Complete | Playwright uses build + `next start` so port 3001 can stay operator-visible |

### 3.2 Non-Functional Requirements

| Item | Target | Achieved | Status |
|------|--------|----------|--------|
| Traceability | linked run and evidence visible | AgentRun timeline and workflow links shown | Complete |
| Safety | no unapproved external write | `canWrite=false`, `writeAttempted=false` | Complete |
| Cost visibility | model/token/cost visible | deterministic and provider runs expose usage fields | Complete |
| DB readiness | local Postgres runtime | DB mode workflow state returns live counts | Complete |
| Korean UX | operator-facing labels Korean | provider labels and evidence copy localized | Complete |
| Testability | repository/API/e2e/browser smoke | QA_PASS | Complete |

---

## 4. Incomplete Items

### 4.1 Carried Over to Next Cycles

| Item | Reason | Priority | Suggested Scope |
|------|--------|----------|-----------------|
| Follow-up internal task queue | follow-up tasks exist but are not yet a dedicated work queue | High | Owner learning and next-action queue |
| Per-card operations provenance drilldown | global run summary exists; approval detail is the strongest detail view | Medium | Add only if 대표 화면 stays readable |
| Normalized analytics schema | current DB is an accepted JSONB mirror for MVP | Medium | Add when query/reporting needs become concrete |
| Real LLM provider cost governance | provenance fields exist; live provider routing/cost budgets need policy | Medium | LLM budgets, fallback, alerting |
| Actual provider write executor | unsafe without separate policy, rollback proof, and explicit owner approval | Gated | Separate PDCA, explicit same-turn approval required |

### 4.2 Cancelled/On Hold Items

| Item | Reason | Alternative |
|------|--------|-------------|
| Fully normalized schema in this cycle | Would slow the operating foundation before query needs are proven | Keep JSONB mirror and normalize selectively later |
| Provider write activation | Requires stronger safety policy and rollback proof | Keep read-only plus mock/draft execution |
| More decorative character UI | Does not improve auditability or owner decision speed | Keep characters as responsibility labels |

---

## 5. Quality Metrics

### 5.1 Final Analysis Results

| Metric | Target | Final | Result |
|--------|--------|-------|--------|
| Overall Match Rate | 90% | 98% | Pass |
| Structural Match | 90% | 96% | Pass |
| Functional Match | 90% | 98% | Pass |
| API Contract | 90% | 100% | Pass |
| Runtime Evidence | 90% | 100% | Pass |
| Safety Boundary | 95% | 100% | Pass |

### 5.2 QA Results

| Check | Result |
|-------|--------|
| `npm test -- --run` | 18 files, 63 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e -- --project=chromium tests/e2e/approval-detail-smoke.spec.ts` | 1 chromium smoke passed |
| `/api/operations/workflow-state` | DB mode counts returned, `agentRuns=2`, `agentRunWorkflowLinks=13` |
| `/api/operations/readiness` | all providers read-only ready, write disabled |
| Browser smoke | `/operations` and approval detail provenance visible |

### 5.3 Resolved Issues

| Issue | Resolution | Result |
|-------|------------|--------|
| Local JSON only persistence | Added DB-backed repository mode and import bridge | Resolved for MVP |
| Missing model/token/cost provenance | Added AgentRun recorder and UI panels | Resolved for MVP |
| Weak approval-level audit trail | Added approval AgentRun timeline and outcome history | Resolved |
| Provider evidence label ambiguity | Added brand/channel labels and total/separate views | Resolved |
| E2E conflict with visible dev server | Changed Playwright server to build + `next start` in isolated file mode | Resolved |

---

## 6. Lessons Learned & Retrospective

### 6.1 What Went Well

- Repository-first migration let the app move to DB mode without rewriting the operations and approvals UI.
- `AgentRun` works as the right audit unit because it covers deterministic fallback, provider read-only sync, and owner-decision workflows.
- Keeping provider writes closed made it possible to verify real decision/outcome persistence without risking external systems.
- Brand/channel labeling made provider evidence much easier to trust from the approval screen.

### 6.2 What Needs Improvement

- The current DB mirror is intentionally conservative; analytics/reporting will eventually need indexed relational projections.
- Follow-up internal tasks are still data records, not yet a proper day-to-day queue.
- `/operations` has summary-level provenance; deeper per-card drilldown should be added carefully to avoid a crowded operator screen.

### 6.3 What to Try Next

- Build a dedicated `FollowUpInternalTask` queue so approved decisions become visible internal assignments.
- Add owner-learning fields to connect decisions, outcome reports, and future recommendation confidence.
- Add per-card provenance drilldown only after queue UX is stable.
- Start real LLM cost governance before live LLM-heavy operation.

---

## 7. Next Steps

### 7.1 Immediate

- Keep the local app visible at `http://localhost:3001/operations`.
- Keep `MARKETCREW_REPOSITORY_MODE="db"` for local runtime.
- Do not enable actual provider write.

### 7.2 Next PDCA Cycle Candidates

| Candidate | Priority | Why |
|-----------|----------|-----|
| Follow-up internal task queue and owner learning | High | Approved decisions should become a manageable work queue and improve future recommendations. |
| Real LLM provider cost governance | Medium | Provenance fields exist; now cost budgets, model fallback, and live-call limits need policy. |
| Operations per-card provenance drilldown | Medium | Useful once the screen can stay readable with more detail. |
| Normalized analytics schema | Medium | Add only for concrete query/reporting needs. |
| Actual provider write executor | Gated | Requires explicit separate PDCA, rollback proof, and same-turn owner approval. |

---

## 8. Changelog

### v0.1.0 (2026-05-22)

**Added:**

- DB-backed workflow repository runtime mode.
- Local JSON to Postgres import path.
- `AgentRun` domain, recorder, workflow links, token/cost/evidence fields.
- Operations AgentRun summary and provider evidence panels.
- Approval detail AgentRun timeline, provider evidence, and outcome history.
- Brand/channel provider evidence labels for `스마트스토어(스티커씨)` and `쇼핑몰(커피프린트)`.

**Changed:**

- Local runtime can use `MARKETCREW_REPOSITORY_MODE="db"`.
- Playwright e2e server is isolated from the user-visible dev server.

**Kept Blocked:**

- Actual external provider writes.
- Unapproved Search Ad, Smartstore, or shopping mall mutations.

---

## 9. Final Status

`ops-persistence-provenance-foundation` is complete for the 1차 MVP operating foundation.

- Check verdict: PASS
- QA verdict: QA_PASS
- Completion rate: 98%
- Critical blockers: 0
- Provider write status: blocked
