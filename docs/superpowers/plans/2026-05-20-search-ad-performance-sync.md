# Search Ad Performance Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Naver Search Ad performance sync that stores keyword-level metrics for analysis.

**Architecture:** Use the official `GET /stats` API, signed the same way as existing read-only endpoints. Pull metrics for the latest synced keyword IDs, normalize the response into keyword performance rows, store rows with a date/entity unique key, and show a separate performance sync status in the Search Ad settings page.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Vitest, Naver Search Ad API.

---

### Task 1: Stat API Request Shape

**Files:**
- Modify: `lib/integrations/naver-search-ad/safety.ts`
- Modify: `lib/integrations/naver-search-ad/safety.test.ts`
- Modify: `lib/integrations/naver-search-ad/client.ts`
- Modify: `lib/integrations/naver-search-ad/client.test.ts`

- [x] Add a failing safety test that allows `GET /stats` and still blocks write methods.
- [x] Add a failing client test for `getStatsByIds` to verify `fields` and `timeRange` are JSON strings in query params and the signed URI is `/stats`.
- [x] Run targeted tests and confirm RED.
- [x] Implement `getStatsByIds` as a read-only `GET /stats` method.
- [x] Run targeted tests and confirm GREEN.

### Task 2: Performance Normalization

**Files:**
- Modify: `lib/integrations/naver-search-ad/normalize.ts`
- Modify: `lib/integrations/naver-search-ad/normalize.test.ts`
- Modify: `lib/integrations/naver-search-ad/snapshots.ts`
- Modify: `lib/integrations/naver-search-ad/snapshots.test.ts`

- [x] Add failing tests for stat row normalization and DB row conversion.
- [x] Normalize metrics: impressions, clicks, cost, ctr, avgCpc, conversions, conversionRate, conversionSales, roas, costPerConversion, avgRank.
- [x] Preserve raw JSON and tolerate missing metrics as zero or null.
- [x] Run targeted tests and confirm GREEN.

### Task 3: Prisma Performance Storage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_keyword_daily_performance/migration.sql`
- Modify: `prisma/seed.ts`

- [x] Add `AdKeywordDailyPerformance` keyed by `accountId`, `keywordId`, `date`.
- [x] Include campaign/adgroup/keyword text and numeric metrics.
- [x] Add relation to `MarketingAccount`.
- [x] Generate migration and Prisma client.

### Task 4: Performance Sync Flow

**Files:**
- Create: `lib/integrations/naver-search-ad/performance.ts`
- Test: `lib/integrations/naver-search-ad/performance.test.ts`
- Modify: `app/settings/search-ad/actions.ts`
- Modify: `lib/integrations/naver-search-ad/status.ts`

- [x] Build a small sync function that selects latest keyword IDs from DB.
- [x] Fetch `GET /stats` in batches to avoid overlong URLs.
- [x] Store rows with `skipDuplicates`.
- [x] Create an `IntegrationSyncRun` with mode `performance-read-only`.
- [x] Sanitize and persist failures.
- [x] Add a server action for performance sync.

### Task 5: UI and Verification

**Files:**
- Modify: `app/settings/search-ad/page.tsx`
- Modify: `docs/integrations/naver-search-ad-review-checklist.md`

- [x] Split buttons into `목록 동기화` and `성과 동기화`.
- [x] Show performance row count and recent performance sync runs.
- [x] Update checklist allowed read endpoints with `GET /stats`.
- [x] Run `npm test`, `npm run lint`, `npx prisma validate`, and `npm run build`.
- [x] Verify `/settings/search-ad` in the in-app browser.
- [x] Commit and push.
