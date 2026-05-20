# Search Ad Performance Report Sync v2

## Goal

Fix keyword performance sync so the AI agents have real Naver Search Ad performance rows for bid and keyword diagnosis.

## Evidence

- Official `ncc-report.json` documents `GET /stats` as summary stats and `POST /stat-reports`, `GET /stat-reports`, `GET /stat-reports/{reportJobId}` as StatReport job endpoints.
- Official StatReport job responses include `reportJobId`, `reportTp`, `statDt`, `status`, and `downloadUrl`.
- The official Stat FAQ lists `AD_DETAIL` and `SHOPPINGKEYWORD_DETAIL` as 180-day detail report types.
- The current MVP calls `GET /stats` with keyword IDs, but the live sync completed with zero keyword performance rows.

## Scope

- Keep Search Ad mutation APIs blocked.
- Allow only the read-report job flow needed to build performance data:
  - `POST /stat-reports`
  - `GET /stat-reports`
  - `GET /stat-reports/{reportJobId}`
- Do not add bid changes, keyword edits, campaign edits, or delete calls.
- Store downloaded report rows into the existing `AdKeywordDailyPerformance` model where rows can be matched to synced keyword snapshots.
- Keep output sanitized: no keys, signatures, customer IDs, raw download URLs, or raw report dumps in UI/errors.

## Plan

- [x] Confirm official endpoints and report fields from Naver docs.
- [x] Add failing safety tests for the read-report job flow while keeping ad mutation POSTs blocked.
- [x] Add failing client tests for creating and polling StatReport jobs.
- [x] Add failing parser tests for CSV/TSV report downloads mapped to keyword performance fields.
- [x] Implement report job methods in `NaverSearchAdClient`.
- [x] Implement report download parsing and row mapping.
- [x] Update performance sync to prefer StatReport rows and keep `/stats` helper tested for summary/daily envelopes.
- [x] Update Search Ad settings copy/status labels to reflect StatReport v2.
- [x] Update the Search Ad official-doc checklist.
- [x] Run `npm test`, `npm run lint`, `npx prisma validate`, and `npm run build`.
- [x] Browser-check `/settings/search-ad` and `/operations`.

## Notes

- Historical backfill should not fire 90 report jobs from a foreground button without a queue. The first implementation should use a bounded recent window and leave 90-day backfill as a scheduled/background follow-up.
- StatReport generation is a POST, but it creates a read-only report job. The safety guard must allow only this exact POST path, not Search Ad mutation paths.
- Documentation catch-up on 2026-05-20 KST: credentials-configured browser checks covered `/settings/search-ad`, `/operations`, and `/approvals` during live Search Ad sync validation.
- Live verification saved list-sync snapshots for 6 campaigns, 56 adgroups, 2,879 keywords, and 2,941 total snapshots; recent performance sync handled 500 keywords and saved 103 performance rows; one bounded 7-day backfill chunk saved 5,544 rows for 2026-02-19 through 2026-02-25.
