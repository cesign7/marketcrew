# ops-persistence-provenance-foundation Plan

> **Status**: Planning
>
> **Project**: marketcrew2
> **Feature**: `ops-persistence-provenance-foundation`
> **PDCA Cycle**: #2
> **Created**: 2026-05-22 KST

---

## Executive Summary

| Item | Content |
|------|---------|
| **Problem** | 1차 MVP는 local JSON repository와 deterministic planner로 결재 흐름을 증명했지만, 실제 운영에는 동시성, 감사 추적, 백업, 실행 이력, LLM 토큰/비용 가시성이 부족하다. |
| **Solution** | workflow entity 저장소를 운영 DB 기반으로 전환할 수 있는 repository contract와 schema를 만들고, `AgentRun`/model/token/cost/evidence provenance를 모든 주요 안건, 결재, provider sync, outcome에 연결한다. |
| **Function/UX Effect** | 대표는 `/operations`와 `/approvals/[id]`에서 안건의 출처, evidence count, 연결된 실행 run, 모델명, 토큰/비용 추정, 실패 원인을 바로 확인한다. |
| **Core Value** | 실제 provider write를 열지 않고도 “누가/어떤 데이터와 모델로/얼마의 비용을 써서/무슨 결재안을 만들었는가”를 운영 레벨로 감사할 수 있게 한다. |

## Context Anchor

| Dimension | Decision |
|-----------|----------|
| **WHY** | 1차 MVP를 실제 업무에 가까운 운영 기반으로 올리기 위한 첫 번째 인프라 사이클이다. |
| **WHO** | 대표/운영자는 결과만 보지 않고 근거, 실행 주체, 모델 사용량, 비용을 함께 확인해야 한다. |
| **RISK** | 데이터 마이그레이션 손실, raw provider row/PII 저장, 비용 추적 누락, provider write gate 오픈, schema 과설계가 가장 큰 위험이다. |
| **SUCCESS** | DB-backed repository에서도 기존 `/operations`와 `/approvals/[id]` 흐름이 유지되고, provenance/cost UI와 테스트가 통과하며, 외부 쓰기는 계속 차단된다. |
| **SCOPE** | schema/repository migration, `AgentRun` provenance domain, API/UI 노출, local JSON import path, QA 문서화까지 포함한다. |

## Goals

1. 1차 MVP의 `Signal -> AgendaCandidate -> CharacterReport -> MoaSynthesisReport -> ApprovalRequest -> ExecutionResult -> OutcomeReport` 흐름을 운영 DB로 옮길 수 있게 한다.
2. 모든 주요 결과물에 `AgentRun` 또는 provenance record를 연결한다.
3. provider/model/token/cost/status/error/evidence source를 대표 화면에서 숨기지 않는다.
4. 기존 local JSON store는 import/export 또는 fallback 경로로 보존한다.
5. 실제 provider write는 이번 사이클에서도 활성화하지 않는다.

## Non-Goals

| Item | Reason |
|------|--------|
| 실제 네이버 광고/커머스/자체몰 write executor 활성화 | write policy와 rollback proof가 별도 PDCA로 필요하다. |
| 대표 top-down command center | bottom-up 운영 기반과 audit trail이 먼저 안정화되어야 한다. |
| 멀티테넌트 권한/과금 체계 | 단일 운영자 MVP 이후 확장한다. |
| raw provider row 장기 저장 | privacy와 비용 관점에서 aggregate/evidence summary만 우선 저장한다. |

## Functional Requirements

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-01 | workflow entity를 담을 운영 DB schema를 설계한다. | `Signal`, `AgendaCandidate`, `CharacterReport`, `MoaSynthesisReport`, `ApprovalRequest`, `OwnerDecision`, `ExecutionResult`, `PerformanceCheckpoint`, `OutcomeReport`, `ProviderSyncReport`, `FollowUpInternalTask` 저장 경계가 문서화된다. |
| FR-02 | repository contract를 DB-backed 구현으로 교체 가능하게 정리한다. | 현재 local file repository 테스트가 깨지지 않고, DB repository가 같은 application query/action에서 동작한다. |
| FR-03 | local JSON store import 경로를 제공한다. | 기존 `.marketcrew/workflow-store.json`의 핵심 count와 approval/outcome 관계가 유지된다. |
| FR-04 | `AgentRun` provenance model을 추가한다. | provider, model, run type, status, prompt/input summary, output summary, evidence IDs, token usage, cost estimate, error가 저장된다. |
| FR-05 | 주요 workflow object와 `AgentRun`을 연결한다. | 안건, 모아 종합, 결재 요청, provider sync, outcome report에서 linked run을 조회할 수 있다. |
| FR-06 | `/operations`에 provenance summary를 노출한다. | 안건 카드나 evidence 영역에서 source count, linked run, model/token/cost 요약이 보인다. |
| FR-07 | `/approvals/[id]`에 감사 근거를 노출한다. | 결재 상세에서 provider evidence, AgentRun, model/token/cost, failure reason을 확인할 수 있다. |
| FR-08 | provider write gate는 계속 닫아 둔다. | `EXTERNAL_WRITE_ENABLED`, `SEARCH_AD_WRITE_ENABLED`는 false 기본값이며 테스트에서 write attempt가 발생하지 않는다. |

## Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Traceability | 대표가 결재한 결과물의 생성 근거를 API/UI에서 역추적할 수 있어야 한다. |
| Safety | raw credential, token, provider raw row, 불필요한 고객 식별정보를 저장하지 않는다. |
| Cost Control | 실제 LLM 호출이 없어도 deterministic/fallback run의 cost field는 `0` 또는 `estimated=false`로 명시한다. |
| Performance | `/operations` 첫 화면은 summary query로 충분히 렌더링되고, 상세 evidence는 필요 시 별도 조회할 수 있어야 한다. |
| Korean UX | operator-facing label은 한국어로 유지하고, 내부 ID/provider payload key는 그대로 둔다. |
| Testability | repository contract test, migration test, API smoke, browser smoke를 분리한다. |

## Implementation Modules

| Module | Target | Deliverable |
|--------|--------|-------------|
| module-1 | schema/repository design | design 문서, entity 관계, DB 선택 기준, migration plan |
| module-2 | DB-backed repository | repository implementation, contract tests, local JSON import |
| module-3 | AgentRun provenance domain | `AgentRun` type/schema, run recorder, planner/provider/decision linkage |
| module-4 | provenance API/UI | operations/approval detail model/token/cost/evidence panels |
| module-5 | QA and hardening | migration verification, Playwright smoke, final Check/Act docs |

## Data Model Draft

| Entity | Notes |
|--------|-------|
| `AgentRun` | LLM/deterministic/provider-planner 실행 단위. 비용/토큰/모델/상태의 기준 row다. |
| `EvidenceSource` | provider sync report, keyword snapshot, calendar event, shop aggregate 등 근거 단위의 summary record다. |
| `WorkflowLink` | `AgentRun`과 agenda/approval/outcome/provider sync를 연결하는 relation 또는 join table이다. |
| `CostUsage` | provider/model별 token input/output/total, estimated cost, currency, estimation flag를 보관한다. |
| `MigrationBatch` | local JSON import/export 실행 단위와 결과 count/error를 보관한다. |

## Safety Gates

| Gate | Rule |
|------|------|
| Provider write | 이번 PDCA에서는 구현/활성화하지 않는다. |
| Raw data | provider raw rows는 저장하지 않고 aggregate snapshot과 evidence summary만 저장한다. |
| Credentials | env secret, access token, signature material은 DB와 로그에 쓰지 않는다. |
| Migration | import는 idempotent하게 설계하고, destructive overwrite는 금지한다. |
| UI | 비용/모델 정보가 없으면 숨기지 말고 `미기록` 또는 `fallback`으로 표시한다. |

## Success Criteria

| # | Criteria |
|---|----------|
| SC-1 | DB-backed repository가 기존 local repository와 동일한 핵심 workflow query/action을 지원한다. |
| SC-2 | local JSON import 후 approval/outcome/provider sync count가 유지된다. |
| SC-3 | 하나 이상의 안건/결재/outcome에서 linked `AgentRun` provenance를 조회할 수 있다. |
| SC-4 | `/operations`에서 model/token/cost/evidence summary가 보인다. |
| SC-5 | `/approvals/[id]`에서 linked run, provider evidence, 실패 원인 또는 fallback 상태가 보인다. |
| SC-6 | 테스트, typecheck, build, browser smoke가 통과한다. |
| SC-7 | provider write gate가 여전히 닫혀 있고 외부 write 호출이 없다. |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| schema가 너무 커져 구현 속도가 느려짐 | 기존 workflow entity 중심으로 시작하고, analytics warehouse 성격의 테이블은 미룬다. |
| local JSON migration 중 관계 손실 | count/assertion 기반 migration test를 먼저 만든다. |
| 비용 추정이 부정확함 | 실제 값과 추정 값을 분리하고 `estimated` flag를 둔다. |
| UI가 감사 정보로 과밀해짐 | summary는 카드에, 상세 evidence는 펼침 또는 상세 화면에 둔다. |
| provider write가 우발적으로 열림 | env gate와 executor test에서 false 기본값을 확인한다. |

## Next Step

다음 단계는 design 문서 작성이다. 여기에서 DB 선택, repository interface, migration strategy, `AgentRun` relation, UI 노출 위치를 확정한 뒤 Do 단계로 넘어간다.
