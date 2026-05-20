# Search Ad Backfill Progress Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show 90-day performance backfill progress in the Search Ad settings page and run one live bounded backfill verification.

**Architecture:** Extend the existing backfill module with pure progress helpers that merge stored performance dates with successful backfill sync-run dates. Feed that progress into `getSearchAdSyncStatus`, render it on `/settings/search-ad`, then execute one 7-day backfill chunk and verify the resulting run/counts. Keep the Search Ad API scope read-only and use the existing StatReport flow only.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Vitest, Naver Search Ad StatReport API.

---

### Task 1: Progress Calculation

**Files:**
- Modify: `lib/integrations/naver-search-ad/backfill.ts`
- Modify: `lib/integrations/naver-search-ad/backfill.test.ts`

- [x] **Step 1: Write failing tests**

Add tests for:
- `collectCompletedBackfillStatDates` merging stored performance dates with successful backfill sync run `rawJson.statDates`
- failed runs and manual recent runs being ignored
- `buildPerformanceBackfillProgress` returning completed, missing, percent, next window, and completion state

- [x] **Step 2: Run targeted tests and confirm RED**

Run: `npm test -- lib/integrations/naver-search-ad/backfill.test.ts`

Expected: FAIL because the new helpers do not exist.

- [x] **Step 3: Implement helpers**

Export `collectCompletedBackfillStatDates` and `buildPerformanceBackfillProgress`. Update the existing DB completion lookup to include successful backfill/scheduled-backfill sync run dates so zero-row report dates do not get retried forever.

- [x] **Step 4: Run targeted tests and confirm GREEN**

Run: `npm test -- lib/integrations/naver-search-ad/backfill.test.ts`

Expected: PASS.

### Task 2: Status Data and UI

**Files:**
- Modify: `lib/integrations/naver-search-ad/status.ts`
- Modify: `app/settings/search-ad/page.tsx`

- [x] **Step 1: Attach progress to status**

Add `backfillProgress` to `getSearchAdSyncStatus`, using the current marketing account id when available.

- [x] **Step 2: Render progress**

Add a Search Ad settings section that shows:
- completed days out of 90
- percent progress
- remaining days
- lookback range
- next backfill date range and chunk size
- complete state when there is no next window

- [x] **Step 3: Run UI/build verification**

Run: `npm test`, `npm run lint`, `npx prisma validate`, `npm run build`, then verify `/settings/search-ad` in the in-app browser.

### Task 3: Live Backfill Verification

**Files:**
- No source changes expected after implementation unless live verification reveals a bug.

- [x] **Step 1: Capture baseline**

Query local DB counts for keyword performance rows, recent performance runs, and current progress.

- [x] **Step 2: Execute one live bounded backfill chunk**

Trigger the existing manual backfill once. Expected chunk size is at most 7 StatReport dates, using read-only `POST /stat-reports`, polling, and same-host download URLs.

- [x] **Step 3: Verify result**

Confirm the new run status, attempted stat dates, saved row count, and refreshed progress. If the run fails with a Search Ad API error, record the sanitized error and do not retry blindly.

- [x] **Step 4: Commit and push**

Commit code changes and push the branch after verification is complete.
