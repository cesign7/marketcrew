# Search Ad Performance Backfill Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only performance backfill and scheduler entrypoint for Naver Search Ad keyword performance data.

**Architecture:** Keep the existing StatReport performance sync as the single data writer. Add a bounded backfill planner that converts a requested lookback window into safe day-by-day StatReport dates, then call the existing sync with those dates. Backfill and scheduler runs disable `/stats` fallback so multi-day summary data cannot be stored against the wrong date. Add a protected internal route for daily scheduling and a manual UI action for processing the next bounded 90-day backfill chunk.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Vitest, Naver Search Ad StatReport API.

---

### Task 1: Backfill Date Planner

**Files:**
- Create: `lib/integrations/naver-search-ad/backfill.ts`
- Test: `lib/integrations/naver-search-ad/backfill.test.ts`

- [x] **Step 1: Write failing tests for bounded windows**

```ts
import { describe, expect, it } from "vitest";
import { buildPerformanceBackfillWindow } from "./backfill";

describe("buildPerformanceBackfillWindow", () => {
  it("builds the first 7 missing days from a 90 day lookback", () => {
    expect(
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 90,
        maxDaysPerRun: 7,
      }),
    ).toMatchObject({
      requestedDays: 90,
      maxDaysPerRun: 7,
      since: "2026-02-19",
      until: "2026-02-25",
      statDates: [
        "20260219",
        "20260220",
        "20260221",
        "20260222",
        "20260223",
        "20260224",
        "20260225",
      ],
      remainingDays: 83,
    });
  });

  it("skips dates that are already stored", () => {
    expect(
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 5,
        maxDaysPerRun: 3,
        completedStatDates: ["20260515", "20260516"],
      }).statDates,
    ).toEqual(["20260517", "20260518", "20260519"]);
  });

  it("rejects lookbacks beyond the StatReport detail report limit", () => {
    expect(() =>
      buildPerformanceBackfillWindow({
        now: new Date("2026-05-20T04:00:00.000Z"),
        days: 181,
        maxDaysPerRun: 7,
      }),
    ).toThrow("180 days");
  });
});
```

- [x] **Step 2: Run the targeted test and confirm RED**

Run: `npm test -- lib/integrations/naver-search-ad/backfill.test.ts`

Expected: FAIL because `./backfill` does not exist.

- [x] **Step 3: Implement the date planner**

Create `buildPerformanceBackfillWindow`, constants for 90-day default, 7-day foreground chunks, and 180-day StatReport detail limit. Convert KST dates to `YYYY-MM-DD` and StatReport `YYYYMMDD`. Return an empty window when every date is already completed.

- [x] **Step 4: Run the targeted test and confirm GREEN**

Run: `npm test -- lib/integrations/naver-search-ad/backfill.test.ts`

Expected: PASS.

### Task 2: Backfill Sync Orchestrator

**Files:**
- Modify: `lib/integrations/naver-search-ad/performance.ts`
- Modify: `lib/integrations/naver-search-ad/performance.test.ts`
- Modify: `lib/integrations/naver-search-ad/backfill.ts`
- Modify: `lib/integrations/naver-search-ad/backfill.test.ts`

- [x] **Step 1: Write failing tests for sync metadata**

Add tests that `syncNaverSearchAdPerformance` accepts optional `rawJsonContext` and persists a `syncKind` such as `backfill` or `scheduled-daily` in `IntegrationSyncRun.rawJson`.

- [x] **Step 2: Run targeted tests and confirm RED**

Run: `npm test -- lib/integrations/naver-search-ad/performance.test.ts lib/integrations/naver-search-ad/backfill.test.ts`

Expected: FAIL because the new options do not exist.

- [x] **Step 3: Implement `syncNaverSearchAdPerformanceBackfill`**

Use `buildPerformanceBackfillWindow`, query existing `AdKeywordDailyPerformance` dates for the current account, skip completed dates, and call `syncNaverSearchAdPerformance` once with bounded `statDates`, `since`, `until`, `keywordLimit`, and metadata. Do not create any ad mutation API calls.

- [x] **Step 4: Run targeted tests and confirm GREEN**

Run: `npm test -- lib/integrations/naver-search-ad/performance.test.ts lib/integrations/naver-search-ad/backfill.test.ts`

Expected: PASS.

### Task 3: Protected Scheduler Route

**Files:**
- Create: `app/api/internal/search-ad/performance-sync/route.ts`
- Test: `lib/integrations/naver-search-ad/scheduler-auth.test.ts`
- Create: `lib/integrations/naver-search-ad/scheduler-auth.ts`

- [x] **Step 1: Write failing auth tests**

Test that a configured scheduler secret requires `Authorization: Bearer <secret>`, that local development without a secret is allowed, and that production without a secret is refused.

- [x] **Step 2: Run the auth test and confirm RED**

Run: `npm test -- lib/integrations/naver-search-ad/scheduler-auth.test.ts`

Expected: FAIL because `scheduler-auth.ts` does not exist.

- [x] **Step 3: Implement auth helper and route**

Add a `POST` route with `dynamic = "force-dynamic"`. For `mode: "daily"`, run one day. For `mode: "backfill"`, run a bounded backfill chunk. Return sanitized counts, date window, and status only.

- [x] **Step 4: Run targeted tests and confirm GREEN**

Run: `npm test -- lib/integrations/naver-search-ad/scheduler-auth.test.ts`

Expected: PASS.

### Task 4: Manual UI Action and Documentation

**Files:**
- Modify: `app/settings/search-ad/actions.ts`
- Modify: `app/settings/search-ad/page.tsx`
- Modify: `docs/integrations/naver-search-ad-review-checklist.md`

- [x] **Step 1: Add the server action**

Add `syncSearchAdPerformanceBackfillAction` that processes a 90-day requested window with a 7-day maximum chunk and revalidates settings, operations, and keywords pages.

- [x] **Step 2: Update the settings page**

Show three actions: list sync, recent performance sync, and 90-day backfill chunk. Use clear Korean labels and add a short scheduler note with the internal route path.

- [x] **Step 3: Update the review checklist**

Document that the scheduler route is internal, read-only, bounded, and must be protected with `MARKETCREW_SCHEDULER_SECRET` or `CRON_SECRET` before production.

- [x] **Step 4: Verify the full change**

Run: `npm test`, `npm run lint`, `npx prisma validate`, `npm run build`, then open `/settings/search-ad` in the in-app browser. Do not execute the live backfill unless the user explicitly asks, because it creates multiple StatReport jobs.
