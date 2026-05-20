# Keyword Diagnostics Agent Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first character-based AI workflow that checks Search Ad data quality, diagnoses keyword performance, creates safe approval proposals, and reports the result in the operations room.

**Architecture:** Keep the diagnosis engine pure and testable in `lib/domain`, then wrap it with a DB orchestration function that persists `AgentReport` and `ActionProposal` records. The operations page stays a Server Component and exposes a Server Action button to run the diagnosis manually.

**Tech Stack:** Next.js App Router Server Components/Server Actions, TypeScript, Prisma 7, PostgreSQL, Vitest.

---

### Task 1: Data Quality Gate

**Files:**
- Create: `lib/domain/performance-quality.ts`
- Create: `lib/domain/performance-quality.test.ts`

- [x] Add RED tests for `NO_KEYWORDS`, `NO_PERFORMANCE_ROWS`, `STALE_PERFORMANCE`, and `READY`.
- [x] Implement `evaluatePerformanceDataQuality` with stable Korean status copy.
- [x] Run targeted tests and confirm GREEN.

### Task 2: Character Profiles

**Files:**
- Create: `lib/domain/agent-profiles.ts`
- Create: `lib/domain/agent-profiles.test.ts`
- Modify: `lib/db/mappers.ts`
- Modify: `lib/db/mappers.test.ts`

- [x] Add RED tests for character profile lookup and mapper fallback.
- [x] Move agent names, roles, moods, and UI initials into one profile module.
- [x] Run mapper tests and confirm GREEN.

### Task 3: Keyword Diagnosis Engine

**Files:**
- Create: `lib/domain/keyword-diagnostics.ts`
- Create: `lib/domain/keyword-diagnostics.test.ts`

- [x] Add RED tests for data-insufficient reporting without proposals.
- [x] Add RED tests for brand defense, efficient 2-3 rank keep, and negative keyword candidates.
- [x] Implement diagnosis rules that only generate approval proposals when performance quality is `READY`.
- [x] Run targeted tests and confirm GREEN.

### Task 4: DB Orchestration and Server Action

**Files:**
- Create: `lib/db/keyword-diagnostics.ts`
- Create: `app/operations/actions.ts`
- Modify: `lib/db/marketing-operations.ts`
- Modify: `app/operations/page.tsx`

- [x] Load latest keyword snapshots and recent performance rows from Prisma.
- [x] Persist generated agent reports.
- [x] Insert pending proposals idempotently by title/status.
- [x] Add `runKeywordDiagnosticsAction` and revalidate `/operations`, `/approvals`, and `/keywords`.

### Task 5: Operations UI

**Files:**
- Modify: `components/marketing-room/AgentRoom.tsx`
- Modify: `components/marketing-room/AgentDesk.tsx`
- Modify: `components/marketing-room/TodayQuestList.tsx`

- [x] Add the manual “AI 진단 실행” form.
- [x] Show data-quality state and next action in the room header.
- [x] Replace broken Korean labels with readable Korean labels.
- [x] Keep the UI compact and game-like without adding unrelated pages.

### Task 6: Verification

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Verify `/operations` in the in-app browser.
- [x] Commit and push.
