# Search Ad StatReport Parser and Diagnostics Follow-up

## Goal

Fix the zero-saved-row StatReport sync by supporting the live headerless Naver Search Ad report download format, then rerun a bounded backfill and trigger the keyword diagnostics agent workflow.

## Root Cause Evidence

- The live `SHOPPINGKEYWORD_DETAIL` and `AD_DETAIL` downloads returned data rows without a header row.
- The first column was a `YYYYMMDD` date, followed by campaign/adgroup identifiers and metrics.
- The previous parser treated the first line as a header, so parsed rows and mapped rows were both zero even when the download contained thousands of rows.
- Parsed live rows used campaign/adgroup IDs that matched account snapshots, but many shopping search terms did not have a current `/ncc/keywords` snapshot row. These rows need report-fallback internal IDs instead of being discarded.

## Execution Plan

- [x] Confirm official Naver Search Ad API docs before code changes.
- [x] Gather sanitized evidence from existing StatReport jobs.
- [x] Add RED tests for headerless `SHOPPINGKEYWORD_DETAIL` parsing and adgroup+keyword mapping.
- [x] Add RED tests for report job `downloadedRows`, `parsedRows`, and `mappedRows` diagnostics.
- [x] Implement headerless fixed-column parsing.
- [x] Record report download, parse, and mapping counts in sync metadata.
- [x] Keep report keyword rows through stable internal `stat-report:*` IDs when no current keyword snapshot matches.
- [x] Aggregate duplicate report rows for the same report keyword and date.
- [x] Rerun a bounded backfill for the failed date chunk.
- [x] Run keyword diagnostics after performance rows exist.
- [x] Verify tests, lint, Prisma schema, build, and browser pages.

## Notes

- Search Ad write APIs remain out of scope.
- `POST /stat-reports` is still treated as read-only report job creation.
- Raw report downloads, customer IDs, signatures, API keys, and download URLs must not be surfaced in UI logs.
- The corrected rerun for `2026-02-19` through `2026-02-25` saved 5,544 additional daily performance rows.
- Keyword diagnostics reached `READY`, created 4 diagnostic reports, and produced 8 approval candidates.
