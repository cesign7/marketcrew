# Search Ad Persisted Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Naver Search Ad sync into a clear persisted sync flow that stores campaigns, adgroups, keywords, and recent sync run history.

**Architecture:** Keep the Naver integration read-only and reuse the existing sequential keyword fetcher. Add an adgroup snapshot model, persist it with campaign and keyword snapshots, and surface recent run history on `/settings/search-ad`.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7, PostgreSQL, Vitest.

**Status (2026-05-20 KST):** Completed and locally reverified. The live read-only list sync saved 6 campaigns, 56 adgroups, 2,879 keywords, and 2,941 total snapshots. Current UI labels the persisted sync action as `목록 동기화`. Approval-to-`KeywordRule` materialization was completed separately in `docs/superpowers/plans/2026-05-20-approval-keyword-rule-materialization.md`.

---

### Task 1: Snapshot Row Preparation

**Files:**
- Modify: `lib/integrations/naver-search-ad/snapshots.ts`
- Test: `lib/integrations/naver-search-ad/snapshots.test.ts`

- [x] Add tests for `toAdgroupSnapshotRows` that map adgroup id, campaign id, name, collectedAt, and raw JSON.
- [x] Run `npm test -- lib/integrations/naver-search-ad/snapshots.test.ts`.
- [x] Add `toCampaignSnapshotRows` and `toAdgroupSnapshotRows`, then keep `toKeywordSnapshotRows`.
- [x] Run the targeted test and confirm it passes.

### Task 2: Prisma Adgroup Snapshot Storage

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_adgroup_snapshots/migration.sql`
- Generated: `app/generated/prisma/**`

- [x] Add `AdAdgroupSnapshot` with `accountId`, `campaignId`, `adgroupId`, `adgroupName`, `brandKey`, `rawJson`, `collectedAt`.
- [x] Add `adgroupSnapshots` relation on `MarketingAccount`.
- [x] Generate a migration and Prisma client.
- [x] Run `npx prisma validate`.

### Task 3: Persisted Sync Flow

**Files:**
- Modify: `lib/integrations/naver-search-ad/sync.ts`
- Test: existing sync/snapshot tests

- [x] Rename the public action-facing flow to persisted sync while leaving a compatibility alias for previous callers if useful.
- [x] Store campaign snapshots through `toCampaignSnapshotRows`.
- [x] Store adgroup snapshots through `toAdgroupSnapshotRows`.
- [x] Keep keyword writes `skipDuplicates` by collected day and keyword id.
- [x] Record `rawJson.mode` as `persisted-read-only`.
- [x] Update agent report copy from dry-run to read-only sync.

### Task 4: Status and UI

**Files:**
- Modify: `lib/integrations/naver-search-ad/status.ts`
- Modify: `app/settings/search-ad/actions.ts`
- Modify: `app/settings/search-ad/page.tsx`

- [x] Return recent sync runs, campaign snapshot count, adgroup snapshot count, keyword snapshot count.
- [x] Change the button text to `목록 동기화`.
- [x] Show last run started/finished time and entity counts.
- [x] Add a recent sync history list with success/failure state, counts, and sanitized error message.
- [x] Keep UI Korean-only and read-only warning visible.

### Task 5: Verification

**Files:**
- All changed files

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npx prisma validate`.
- [x] Run `npm run build`.
- [x] Verify `/settings/search-ad` in the in-app browser.
- [x] Commit and push the implementation branch.
