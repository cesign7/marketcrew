# ops-persistence-provenance-foundation Iteration 3

> **완성 대상 모듈/목표**: module-3 fresh Postgres reset, workflow mirror schema, local JSON import.
>
> **Status**: Complete for DB reset/import foundation
> **Date**: 2026-05-22 KST

---

## What Changed

| Area | Result |
|------|--------|
| Docker DB | `marketcrew-postgres` 안의 기존 `marketcrew` DB를 백업 후 drop/create했다. |
| Backup | `.marketcrew/db-backups/marketcrew-before-reset-20260522-132554.sql` 덤프를 남겼다. |
| Schema | `workflow_records`, `workflow_migration_batches` 테이블을 만드는 SQL을 추가했다. |
| Import | `.marketcrew/workflow-store.json`을 Postgres JSONB records로 import하는 script를 추가했다. |
| Package | `pg`, `@types/pg`, `db:import-workflow-store` script를 추가했다. |
| Verification | 새 DB에 137개 workflow record가 들어간 것을 `pg` query로 확인했다. |

## DB State After Import

| Collection | Count |
|------------|------:|
| signals | 4 |
| seasonalKeywordAdPlans | 2 |
| keywordDemandSnapshots | 64 |
| searchTrendSnapshots | 2 |
| agendaCandidates | 5 |
| characterReports | 5 |
| opiSynthesisReports | 1 |
| approvalRequests | 5 |
| ownerDecisions | 2 |
| preflightChecks | 1 |
| executionResults | 1 |
| performanceCheckpoints | 18 |
| outcomeReports | 1 |
| followUpInternalTasks | 2 |
| providerSyncReports | 18 |
| agentRuns | 1 |
| agentRunWorkflowLinks | 5 |

## Decisions

- DB reset was explicitly requested by the owner.
- The existing DB was dumped before drop/create.
- Runtime app storage remains on file fallback for this iteration.
- Postgres currently acts as imported workflow mirror and migration target.
- External provider write remains blocked.

## Verification Evidence

```text
docker exec marketcrew-postgres psql -U marketcrew -d marketcrew ...
marketcrew / marketcrew / user_tables=0 before import

npm run db:import-workflow-store
status: IMPORTED
totalRecords: 137

Node pg count query
collections matched local JSON counts
```

## Next Iteration

Add the runtime DB-backed repository path. The likely shape is:

```text
MARKETCREW_REPOSITORY_MODE=file|db
MARKETCREW_DATABASE_URL or DATABASE_URL
```

Because the current `MarketingWorkflowRepository` is synchronous and `pg` is async, the next slice should decide whether to add an async repository boundary or a server-only DB read/write adapter around route/page entry points.
