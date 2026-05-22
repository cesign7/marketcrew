# follow-up-task-queue-owner-learning Analysis Report

> **Analysis Type**: PDCA Check / Gap Analysis / Runtime Verification
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Analyst**: Codex
> **Date**: 2026-05-22 KST
> **Design Doc**: [follow-up-task-queue-owner-learning.design.md](../02-design/features/follow-up-task-queue-owner-learning.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 승인/보류/근거 요청/쓰기 차단 이후의 내부 일이 관리되지 않으면 대표는 다시 직접 기억하고 챙겨야 한다. |
| **WHO** | 대표와 오피는 결재 이후 내려간 업무를 담당 캐릭터별로 확인하고 닫아야 한다. |
| **RISK** | 후속 업무 큐가 실제 외부 실행처럼 보이거나, 완료 상태가 저장되지 않거나, 대표 메모가 다음 추천 기준으로 연결되지 않을 수 있다. |
| **SUCCESS** | `/follow-ups`에서 후속 업무, source approval, 최신 대표 결정, 차단 사유, outcome, owner learning 신호가 보이고 OPEN/DONE 상태 변경이 저장된다. |
| **SCOPE** | view model, `/follow-ups` UI, follow-up status API, tests, docs. 실제 provider write나 자동 실행은 제외한다. |

## Strategic Alignment Check

| Source | Expected | Check Result |
|--------|----------|--------------|
| Plan WHY | 대표 결정 이후 일을 다시 사람이 기억하지 않게 한다. | Met |
| Plan Safety | 후속 업무는 내부 책임 추적이며 실제 외부 write가 아니다. | Met |
| Design Choice | dedicated deterministic queue로 작고 검증 가능한 slice를 만든다. | Met |
| User UX | `/follow-ups`에서 담당 캐릭터별 후속 업무와 owner learning을 본다. | Met |

## Success Criteria Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | `/follow-ups`가 후속 업무 요약과 담당 캐릭터별 큐를 렌더링한다. | Met | `src/app/follow-ups/page.tsx`, browser smoke |
| SC-2 | 각 task는 source approval, latest decision, outcome, blocker, learning note를 가진다. | Met | `src/features/follow-ups/buildFollowUpQueueViewModel.ts`, unit tests |
| SC-3 | follow-up task를 `DONE`과 `OPEN`으로 바꾸면 저장소에 반영된다. | Met | `src/app/api/follow-ups/[id]/route.ts`, API test, e2e |
| SC-4 | owner learning signal이 대표 결정과 차단 사유에서 계산된다. | Met | owner learning 6 signals, `follow-up-queue-view-model.test.ts` |
| SC-5 | `/operations`에서 `/follow-ups`로 이동할 수 있다. | Met | `src/app/operations/page.tsx`, browser smoke |
| SC-6 | unit/API/typecheck/build/browser smoke가 통과한다. | Met | Vitest, typecheck, build, audit, Playwright, in-app browser smoke |
| SC-7 | 실제 외부 provider write는 열리지 않는다. | Met | API only calls `saveFollowUpInternalTasks`; no provider executor/write gate changes |

**Success Rate**: 7/7 criteria met

## Gap Analysis

### Structural Match

| Design Area | Implementation | Status | Notes |
|-------------|----------------|:------:|-------|
| View model | `src/features/follow-ups/buildFollowUpQueueViewModel.ts` | Met | repository data를 deterministic queue와 learning signal로 변환 |
| Types | `src/features/follow-ups/types.ts` | Met | task, character queue, owner learning view types |
| UI route | `src/app/follow-ups/page.tsx` | Met | summary, safety band, owner learning, character queue |
| Components | `FollowUpQueueBoard`, `OwnerLearningPanel`, `FollowUpTaskStatusButton` | Met | 표시와 status update를 분리 |
| API | `PATCH /api/follow-ups/[id]` | Met | `OPEN`/`DONE` 검증 후 저장 |
| Operations navigation | `/operations` topbar link | Met | 대표가 업무실에서 후속 큐로 이동 가능 |

### API Contract

| Endpoint | Design | Server | Runtime | Status |
|----------|:------:|:------:|:-------:|:------:|
| `PATCH /api/follow-ups/[id]` | Yes | Yes | e2e and API test pass | Pass |
| `GET /follow-ups` | Yes | Yes | 200 OK browser smoke | Pass |
| `/operations` link | Yes | Yes | in-app route navigation visible | Pass |

### Runtime Verification

| Layer | Check | Result |
|-------|-------|--------|
| Unit/Application | `npm test -- --run tests/application/follow-up-queue-view-model.test.ts tests/api/follow-up-route.test.ts` | 2 files / 4 tests passed |
| Unit/API Full | `npm test -- --run` | 20 files / 67 tests passed |
| Type | `npm run typecheck` | passed |
| Build | `npm run build` | passed, `/follow-ups` route included |
| Security | `npm audit --omit=dev` | 0 vulnerabilities |
| E2E | `npm run test:e2e -- --project=chromium tests/e2e/follow-ups-smoke.spec.ts` | 1 chromium test passed |
| Browser | in-app `/follow-ups` | title, Owner Learning, 후속 업무 큐, 완료 처리, 쓰기 게이트 차단 visible |

## Match Rate

| Axis | Rate | Basis |
|------|-----:|-------|
| Structural | 100% | Planned route, view model, API, components, tests exist. |
| Functional | 99% | MVP flow works; owner learning is deterministic summary, not yet LLM policy learning. |
| Contract | 100% | API and route contracts match design and tests. |
| Runtime | 100% | Unit, API, typecheck, build, audit, e2e, browser smoke passed. |

**Overall Match Rate**: 99%

Formula: `(Structural 100 * 0.15) + (Functional 99 * 0.25) + (Contract 100 * 0.25) + (Runtime 100 * 0.35) = 99.75`, rounded down to 99 to keep the remaining LLM-learning and notification work explicit.

## Findings

| Severity | Finding | Recommendation |
|----------|---------|----------------|
| Low | Owner learning is deterministic summary, not live LLM policy adaptation. | Keep for MVP. Add real LLM cost governance and evaluation before letting it affect recommendations automatically. |
| Low | Follow-up tasks only support `OPEN`/`DONE`; due date, priority edit, comments are absent. | Defer until task volume proves the need. |
| Low | `/follow-ups` uses DB/file repository state but no dedicated normalized task table. | Accepted under current Postgres JSONB mirror; normalize only when query/reporting needs appear. |
| Fixed During Check | `npm run typecheck` could pick up duplicated generated files such as `.next/types/routes.d 3.ts`, while `next build` automatically restores `.next/types` includes. | Added `tsconfig.typecheck.json` and pointed `npm run typecheck` at source/tests only; `next build` remains the generated route/type verification path. |

## Decision

`follow-up-task-queue-owner-learning` Check verdict is **PASS**.

- Critical gaps: 0
- Important gaps: 0
- Low-risk follow-ups: 3
- Recommended next phase: QA/report packaging
