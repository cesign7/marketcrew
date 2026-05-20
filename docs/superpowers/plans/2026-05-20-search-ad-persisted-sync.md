# Search Ad Persisted Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Naver Search Ad sync into a clear persisted sync flow that stores campaigns, adgroups, keywords, and recent sync run history.

**Architecture:** Keep the Naver integration read-only and reuse the existing sequential keyword fetcher. Add an adgroup snapshot model, persist it with campaign and keyword snapshots, and surface recent run history on `/settings/search-ad`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Vitest.

---

### Task 1: Snapshot Row Preparation

**Files:**
- Modify: `lib/integrations/naver-search-ad/snapshots.ts`
- Test: `lib/integrations/naver-search-ad/snapshots.test.ts`

- [ ] Write a failing test for `toAdgroupSnapshotRows` that maps adgroup id, campaign id, name, collectedAt, and raw JSON.
- [ ] Run `npm test -- lib/integrations/naver-search-ad/snapshots.test.ts` and confirm the missing export failure.
- [ ] Add `toCampaignSnapshotRows` and `toAdgroupSnapshotRows`, then keep `toKeywordSnapshotRows`.
- [ ] Run the targeted test and confirm it passes.

### Task 2: Prisma Adgroup Snapshot Storage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_adgroup_snapshots/migration.sql`
- Generated: `app/generated/prisma/**`

- [ ] Add `AdAdgroupSnapshot` with `accountId`, `campaignId`, `adgroupId`, `adgroupName`, `brandKey`, `rawJson`, `collectedAt`.
- [ ] Add `adgroupSnapshots` relation on `MarketingAccount`.
- [ ] Generate a migration and Prisma client.
- [ ] Run `npx prisma validate`.

### Task 3: Persisted Sync Flow

**Files:**
- Modify: `lib/integrations/naver-search-ad/sync.ts`
- Test: existing sync/snapshot tests

- [ ] Rename the public action-facing flow to persisted sync while leaving a compatibility alias for previous callers if useful.
- [ ] Store campaign snapshots through `toCampaignSnapshotRows`.
- [ ] Store adgroup snapshots through `toAdgroupSnapshotRows`.
- [ ] Keep keyword writes `skipDuplicates` by collected day and keyword id.
- [ ] Record `rawJson.mode` as `persisted-read-only`.
- [ ] Update agent report copy from dry-run to read-only sync.

### Task 4: Status and UI

**Files:**
- Modify: `lib/integrations/naver-search-ad/status.ts`
- Modify: `app/settings/search-ad/actions.ts`
- Modify: `app/settings/search-ad/page.tsx`

- [ ] Return recent sync runs, campaign snapshot count, adgroup snapshot count, keyword snapshot count.
- [ ] Change the button text to `동기화 실행`.
- [ ] Show last run started/finished time and entity counts.
- [ ] Add a recent sync history list with success/failure state, counts, and sanitized error message.
- [ ] Keep UI Korean-only and read-only warning visible.

### Task 5: Verification

**Files:**
- All changed files

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npx prisma validate`.
- [ ] Run `npm run build`.
- [ ] Verify `/settings/search-ad` in the in-app browser.
- [ ] Commit and push the branch.
