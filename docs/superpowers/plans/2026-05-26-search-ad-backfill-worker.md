# Search Ad Backfill Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a Search Ad report backfill worker that plans and safely processes historical `stat-reports` by report type and date.

**Architecture:** Keep report retention rules and date planning in a pure server module, then layer a side-effecting runner over existing Search Ad report APIs and `saveDownloadedReport`. Expose a guarded API route with `dryRun` as the default so operators can inspect the backfill plan before creating report jobs or downloading data.

**Tech Stack:** Next.js route handlers, TypeScript, Vitest, existing Search Ad API client/repository.

---

### Task 1: Backfill Planning Domain

**Files:**
- Create: `src/server/search-ad/reportBackfill.ts`
- Test: `tests/search-ad/reportBackfill.test.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildSearchAdReportBackfillPlan } from "@/server/search-ad/reportBackfill";

describe("buildSearchAdReportBackfillPlan", () => {
  it("uses report-type retention windows when dates are omitted", () => {
    const plan = buildSearchAdReportBackfillPlan({
      todayKst: "2026-05-26",
      reportTypes: ["AD", "SHOPPINGKEYWORD_DETAIL", "SHOPPINGKEYWORD_CONVERSION_DETAIL"],
    });

    expect(plan.fromDate).toBe("2025-05-26");
    expect(plan.toDate).toBe("2026-05-25");
    expect(plan.items.filter((item) => item.reportType === "AD")).toHaveLength(365);
    expect(plan.items.filter((item) => item.reportType === "SHOPPINGKEYWORD_DETAIL")).toHaveLength(180);
    expect(plan.items.filter((item) => item.reportType === "SHOPPINGKEYWORD_CONVERSION_DETAIL")).toHaveLength(45);
    expect(plan.items[0]).toEqual({ reportType: "AD", statDate: "2025-05-26" });
  });

  it("respects explicit from/to dates and maxDates", () => {
    const plan = buildSearchAdReportBackfillPlan({
      todayKst: "2026-05-26",
      fromDate: "2026-05-20",
      toDate: "2026-05-25",
      maxDates: 2,
      reportTypes: ["AD", "EXPKEYWORD"],
    });

    expect(plan.items).toEqual([
      { reportType: "AD", statDate: "2026-05-20" },
      { reportType: "EXPKEYWORD", statDate: "2026-05-20" },
      { reportType: "AD", statDate: "2026-05-21" },
      { reportType: "EXPKEYWORD", statDate: "2026-05-21" },
    ]);
  });
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/search-ad/reportBackfill.test.ts`

Expected: FAIL because `@/server/search-ad/reportBackfill` does not exist.

- [x] **Step 3: Implement the pure planner**

Create `SEARCH_AD_REPORT_RETENTION_DAYS`, `DEFAULT_BACKFILL_REPORT_TYPES`, date helpers, and `buildSearchAdReportBackfillPlan()`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/search-ad/reportBackfill.test.ts`

Expected: PASS.

### Task 2: Backfill Runner

**Files:**
- Modify: `src/server/search-ad/reportBackfill.ts`
- Test: `tests/search-ad/reportBackfill.test.ts`

- [x] **Step 1: Add failing runner tests**

```ts
it("dry run classifies existing, missing, and downloadable jobs without side effects", async () => {
  const result = await runSearchAdReportBackfill({
    todayKst: "2026-05-26",
    fromDate: "2026-05-25",
    toDate: "2026-05-25",
    reportTypes: ["AD", "EXPKEYWORD"],
    dryRun: true,
    dependencies: {
      credentialsReady: () => true,
      databaseReady: () => true,
      listJobs: async () => [{ reportJobId: "job-ad", reportTp: "AD", statDt: "20260525", status: "BUILT", downloadUrl: "/report-download?authtoken=a" }],
      createJob: async () => { throw new Error("should not create during dry run"); },
      downloadReport: async () => { throw new Error("should not download during dry run"); },
      saveReport: async () => undefined,
      rebuildRules: async () => ({ saved: 0 }),
    },
  });

  expect(result.ok).toBe(true);
  expect(result.data.summary).toMatchObject({ planned: 2, downloadable: 1, missing: 1, created: 0, downloaded: 0 });
});
```

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/search-ad/reportBackfill.test.ts`

Expected: FAIL because `runSearchAdReportBackfill` is not implemented.

- [x] **Step 3: Implement the runner with injected dependencies**

The runner should check credentials/DB, list existing jobs once, classify by `reportType + statDate`, optionally create missing jobs when `createMissing=true` and `dryRun=false`, download only `BUILT` jobs with `downloadUrl`, parse with existing parser, save through existing repository, and rebuild rules only when at least one report was parsed.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/search-ad/reportBackfill.test.ts`

Expected: PASS.

### Task 3: API Route

**Files:**
- Create: `src/app/api/search-ad/reports/backfill/route.ts`
- Test: covered by typecheck and service tests

- [x] **Step 1: Add route handler**

Implement `POST /api/search-ad/reports/backfill` with `dryRun=true` by default, `createMissing=false` by default, validated `reportTypes`, optional `fromDate`, `toDate`, `maxDates`, and `maxDownloads`.

- [x] **Step 2: Verify typecheck**

Run: `npm run typecheck`

Expected: PASS.

### Task 4: Documentation

**Files:**
- Modify: `docs/03-do/search-ad-operations-foundation.do.md`

- [x] **Step 1: Document the backfill operating contract**

Add a short section naming the API route, default dry-run behavior, report retention windows, and safe first-run request body.

- [x] **Step 2: Run final verification**

Run:

```bash
npm test -- tests/search-ad/reportBackfill.test.ts tests/search-ad/reportSyncDate.test.ts
npm run typecheck
```

Expected: PASS.
