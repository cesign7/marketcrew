# ops-persistence-provenance-foundation Design Document

> **Summary**: 1차 MVP의 local file workflow store를 운영 DB로 전환할 수 있는 저장소 경계와 `AgentRun` provenance 모델을 설계해, 대표가 안건/결재/outcome의 근거, 모델, 토큰, 비용, 실패 원인을 추적할 수 있게 한다.
>
> **Project**: marketcrew2
> **Version**: 0.1
> **Author**: Codex
> **Date**: 2026-05-22 KST
> **Status**: Draft
> **Planning Doc**: [ops-persistence-provenance-foundation.plan.md](../../01-plan/features/ops-persistence-provenance-foundation.plan.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 1차 MVP는 결재 흐름을 증명했지만 local JSON store만으로는 운영 감사, 동시성, 백업, LLM 비용 추적, provider sync 실패 추적을 안정적으로 다루기 어렵다. |
| **WHO** | 대표/운영자는 오늘 올라온 안건을 보면서 “이 결재안이 어떤 데이터와 모델 실행에서 나왔는지, 비용이 얼마인지, 실패 근거는 무엇인지”를 확인해야 한다. |
| **RISK** | DB 전환 중 기존 workflow 관계가 깨지거나, raw provider row/secret이 저장되거나, 모델 비용이 UI에서 숨겨지거나, provider write gate가 실수로 열릴 수 있다. |
| **SUCCESS** | 기존 `/operations`와 `/approvals/[id]` 흐름은 유지되고, DB-backed repository와 local JSON import, `AgentRun` provenance, model/token/cost UI가 테스트와 smoke를 통과한다. |
| **SCOPE** | repository contract 확장, relational schema, local import, `AgentRun` recorder, API/view model/UI summary, QA migration test. 실제 외부 write executor는 제외한다. |

## 1. Architecture Choice

### 1.1 Options

| Criteria | Option A: Extend File Store | Option B: Prisma Relational Store | Option C: Event Log First |
|----------|-----------------------------|-----------------------------------|---------------------------|
| Approach | JSON schema를 늘리고 UI만 보강 | relational schema와 DB-backed repository 추가 | append-only event table에서 projection 생성 |
| Speed | Fast | Medium | Slow |
| Auditability | Medium | High | Very High |
| Query UX | Low | High | Medium |
| Migration Risk | Low | Medium | High |
| Dependency Impact | None | Adds DB tooling | Adds DB plus projection complexity |
| Fit | prototype continuation | **operating MVP foundation** | later audit platform |

**Selected**: Option B, with a conservative repository-first rollout.

선택 이유는 명확하다. 지금 코드는 이미 `MarketingWorkflowRepository`를 통해 application layer가 저장소를 추상화하고 있다. 따라서 UI/API를 크게 흔들지 않고 DB-backed 구현을 붙일 수 있다. 단, Do 단계 첫 slice에서는 schema와 repository contract를 먼저 고정하고, DB driver/tooling 도입은 작은 diff로 분리한다.

### 1.2 Runtime Target

| Layer | Decision |
|-------|----------|
| Local MVP | SQLite-compatible local DB or test database behind repository contract |
| Production Direction | Postgres-compatible relational schema |
| Migration Source | `.marketcrew/workflow-store.json` |
| Existing Fallback | file repository remains available through env switch |
| External Writes | unchanged: provider write gates stay closed |

## 2. Component Diagram

```text
Browser UI
  ├─ /operations
  │   ├─ agenda cards
  │   ├─ evidence/provenance summary
  │   └─ model/token/cost chips
  └─ /approvals/[id]
      ├─ provider evidence
      ├─ linked AgentRun timeline
      └─ outcome provenance
        │
        ▼
Next.js Route Handlers / Server Components
  ├─ AgendaRoomViewModel
  ├─ ApprovalDetailViewModel
  └─ WorkflowStateSummary API
        │
        ▼
Application Layer
  ├─ AgendaCycle
  ├─ ApprovalWorkflow
  ├─ ProviderSyncPersistence
  ├─ OutcomeAnalysis
  └─ AgentRunRecorder
        │
        ▼
Repository Contract
  ├─ MarketingWorkflowRepository
  ├─ AgentRunRepository
  └─ MigrationRepository
        │
        ▼
Infrastructure
  ├─ FileMarketingWorkflowRepository
  ├─ DbMarketingWorkflowRepository
  ├─ WorkflowJsonImporter
  └─ DbSchema / Migration
```

## 3. Repository Design

### 3.1 Existing Boundary to Keep

`MarketingWorkflowRepository` remains the primary workflow boundary:

```typescript
export interface MarketingWorkflowRepository {
  saveSignals(signals: Signal[]): void;
  listSignals(): Signal[];
  saveApprovalRequests(requests: ApprovalRequest[]): void;
  listApprovalRequests(): ApprovalRequest[];
  saveOutcomeReports(reports: OutcomeReport[]): void;
  listOutcomeReports(): OutcomeReport[];
  saveProviderSyncReports(reports: ProviderSyncReport[]): void;
  listProviderSyncReports(): ProviderSyncReport[];
}
```

Do 단계에서는 기존 메서드를 제거하지 않는다. DB repository가 같은 contract를 만족해야 기존 tests/application과 tests/api가 새 저장소로 재사용된다.

### 3.2 New Contracts

```typescript
export interface AgentRunRepository {
  saveAgentRuns(runs: AgentRun[]): void;
  listAgentRuns(): AgentRun[];
  listAgentRunsForWorkflowObject(input: WorkflowObjectRef): AgentRun[];
  saveAgentRunLinks(links: AgentRunWorkflowLink[]): void;
  listAgentRunLinks(): AgentRunWorkflowLink[];
}

export interface WorkflowMigrationRepository {
  importWorkflowState(input: WorkflowStateImport): WorkflowMigrationResult;
  listMigrationBatches(): MigrationBatch[];
}
```

이 둘은 처음에는 `MarketingWorkflowRepository`와 별도 interface로 둔다. 이유는 1차 MVP contract를 한 번에 크게 흔들지 않고, DB 구현이 안정화되면 composite repository로 묶기 위해서다.

## 4. Data Model

### 4.1 Core Tables

| Table | Key Fields | Notes |
|-------|------------|-------|
| `workflow_signals` | `id`, `source`, `signal_type`, `entity_type`, `entity_id`, `period_start`, `period_end`, `payload_json` | signal type별 세부 값은 payload에 보관하되 query key는 column으로 둔다. |
| `agenda_candidates` | `id`, `owner_key`, `status`, `confidence`, `risk_level`, `payload_json` | 하위 캐릭터 상신 후보. |
| `character_reports` | `id`, `character_key`, `agenda_candidate_ids_json`, `payload_json` | 캐릭터별 보고서. |
| `opi_synthesis_reports` | `id`, `status`, `recommended_approval_ids_json`, `payload_json` | 오피 종합 보고서. |
| `approval_requests` | `id`, `status`, `owner_key`, `risk_level`, `created_at`, `payload_json` | 대표 결재 단위. |
| `owner_decisions` | `id`, `approval_request_id`, `decision_type`, `decided_at`, `payload_json` | 대표 결정 이력. |
| `execution_results` | `id`, `approval_request_id`, `status`, `write_attempted`, `created_at`, `payload_json` | mock/sandbox execution 결과. |
| `performance_checkpoints` | `id`, `approval_request_id`, `due_at`, `status`, `payload_json` | 성과 측정 일정. |
| `outcome_reports` | `id`, `approval_request_id`, `outcome_state`, `created_at`, `payload_json` | 저장된 성과 보고. |
| `provider_sync_reports` | `id`, `provider`, `status`, `read_only`, `write_attempted`, `checked_at`, `payload_json` | provider read-only sync 근거. |
| `follow_up_internal_tasks` | `id`, `approval_request_id`, `owner_key`, `status`, `payload_json` | 후속 내부 업무. |

`payload_json`은 기존 TypeScript domain object를 보존하기 위한 escape hatch다. 그러나 list/sort/filter에 필요한 필드는 column으로 승격한다.

### 4.2 Provenance Tables

| Table | Key Fields | Notes |
|-------|------------|-------|
| `agent_runs` | `id`, `runner_key`, `run_type`, `mode`, `provider`, `model`, `status`, `started_at`, `finished_at`, `error_code`, `payload_json` | LLM, deterministic fallback, provider planner 실행 단위. |
| `agent_run_usage` | `id`, `agent_run_id`, `input_tokens`, `output_tokens`, `total_tokens`, `estimated`, `estimated_cost_krw`, `currency`, `basis` | token/cost 추적. |
| `agent_run_evidence` | `id`, `agent_run_id`, `evidence_id`, `evidence_type`, `source`, `label` | UI에 보여줄 evidence link. |
| `agent_run_workflow_links` | `id`, `agent_run_id`, `object_type`, `object_id`, `relation` | agenda/approval/outcome/provider sync와 run 연결. |
| `migration_batches` | `id`, `source_path`, `status`, `started_at`, `finished_at`, `counts_json`, `error_message` | local JSON import 결과. |

### 4.3 Domain Types

```typescript
export type AgentRunType =
  | "opi_planner"
  | "provider_sync"
  | "provider_signal_agenda"
  | "owner_decision"
  | "outcome_analysis";

export interface AgentRun {
  id: string;
  runnerKey: string;
  runType: AgentRunType;
  mode: "deterministic_fallback" | "llm" | "provider_read_only" | "mock_execution";
  provider: "openai" | "gemini" | "naver" | "youngcart" | "sample" | "local";
  model: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  inputSummary: string;
  outputSummary: string;
  rawRowsIncluded: false;
  tokenUsage: AgentRunTokenUsage;
  evidenceIds: string[];
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface AgentRunTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
  estimatedCostKrw: number;
  basis: string;
}
```

기존 `LlmPlannerAuditRun`은 `AgentRun`으로 흡수하거나 adapter function으로 변환한다. Do 단계에서는 호환 함수를 두어 한 번에 타입을 깨지 않게 한다.

## 5. Data Flow

### 5.1 Planner Run

```text
AgendaRoomQuery
  -> build planner input summary
  -> LlmPlanner or deterministic fallback
  -> AgentRunRecorder.save(opi_planner)
  -> link run to OpiSynthesisReport and selected ApprovalRequests
  -> UI provenance summary
```

### 5.2 Provider Sync Run

```text
/api/operations/provider-sync
  -> read-only provider adapters
  -> ProviderSyncReport[]
  -> AgentRunRecorder.save(provider_sync)
  -> persistProviderSyncReports
  -> link run to provider sync reports and generated signals
```

### 5.3 Owner Decision Run

```text
/api/approvals/[id]/decision
  -> OwnerDecision
  -> PreflightCheck
  -> MockProviderExecutor
  -> ExecutionResult / OutcomeReport
  -> AgentRunRecorder.save(owner_decision or mock_execution)
  -> link run to approval, execution result, outcome
```

## 6. API and View Model Changes

| Surface | Change |
|---------|--------|
| `buildAgendaRoomViewModel` | `provenanceSummary` 추가: recent runs, source count, model/token/cost label. |
| `buildApprovalDetailViewModel` | `agentRunTimeline` 추가: provider sync, planner, decision, outcome run 순서. |
| `/api/operations/workflow-state` | repository mode, DB/file path, migration batch, agent run count를 추가. |
| `/api/operations/provider-sync` | sync 결과와 함께 provider_sync `AgentRun`을 저장. |
| `/api/approvals/[id]/decision` | decision/execution/outcome run을 저장하고 approval에 링크. |
| `/api/approvals/[id]/outcomes` | outcome provenance summary를 포함. |

## 7. UI Placement

| Page | Placement | Copy Direction |
|------|-----------|----------------|
| `/operations` | 각 안건 카드 하단 또는 evidence panel | `근거 4개 · opi_planner · fallback · 380 tokens 추정 · 0원` |
| `/operations` | workflow-state diagnostic strip | `저장소: DB 준비 중 / File fallback`, `AgentRun 5건` |
| `/approvals/[id]` | provider evidence 아래 | `이 결재안 생성 이력` timeline |
| `/approvals/[id]` | outcome history 옆 | `성과 보고 생성 근거` |

UI는 “캐릭터가 많이 보이는 화면”이 아니라 “대표가 결재 판단에 필요한 감사 근거를 빠르게 보는 화면”으로 유지한다.

## 8. Migration Strategy

1. 현재 `.marketcrew/workflow-store.json`을 `WorkflowRepositoryState`로 parse한다.
2. collection별로 idempotent upsert한다.
3. import 결과를 `migration_batches.counts_json`에 저장한다.
4. import 후 `buildWorkflowStateSummary` count를 비교한다.
5. 실패 시 DB write를 rollback하거나 failed batch로 남기고 file repository는 보존한다.

Destructive overwrite는 금지한다. 같은 ID가 이미 있으면 upsert하되, import batch에 updated count를 남긴다.

## 9. Safety Rules

| Rule | Enforcement |
|------|-------------|
| Provider write remains blocked | env gate tests and executor smoke keep `writeAttempted: false`. |
| No secrets in DB | adapter outputs are sanitized before persistence; token/password patterns are redacted. |
| No raw provider rows | aggregate snapshot and evidence summary only. |
| Cost labels visible | missing usage renders `미기록`, fallback renders `0원 / 추정`. |
| Migration reversible | file store is never deleted by importer. |

## 10. Test Plan

| Test | Purpose |
|------|---------|
| repository contract test | memory/file/db repositories return the same workflow counts and objects. |
| migration test | sample local JSON import preserves approval/outcome/provider sync relationships. |
| agent run recorder test | run, usage, evidence, workflow link are saved together. |
| view model test | operations/approval detail provenance labels render without raw rows. |
| API route test | provider sync and owner decision create linked runs. |
| browser smoke | `/operations` and `/approvals/[id]` show provenance/cost summary. |
| safety test | provider write gate remains closed and secrets are not serialized. |

## 11. Implementation Order

1. Extend domain types and repository interfaces with `AgentRun` and workflow links.
2. Add repository contract tests that can run against file/memory first.
3. Add DB schema and DB-backed repository behind env switch.
4. Add local JSON importer and migration summary API.
5. Record deterministic planner/provider sync/decision runs.
6. Add operations and approval detail provenance UI.
7. Run full verification and write Act/QA report.

## 12. Open Decisions for Do

| Decision | Default |
|----------|---------|
| DB tooling | Use the smallest repository-backed DB path compatible with local dev and future Postgres. |
| Env switch name | `MARKETCREW_REPOSITORY_MODE=file|db` |
| DB URL key | `MARKETCREW_DATABASE_URL` |
| Import command/API | Start with script or server-side helper, avoid destructive UI import in first slice. |
| Cost source | deterministic fallback `0원`, estimated LLM cost until real provider billing is integrated. |
