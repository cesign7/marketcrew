# Test Plan: ai-marketing-character-ops

> **Date**: 2026-05-22 KST
> **Feature**: ai-marketing-character-ops
> **Design Doc**: docs/02-design/features/ai-marketing-character-ops.design.md
> **Check Doc**: docs/03-analysis/ai-marketing-character-ops.analysis.md

---

## 1. Test Scope

### In Scope

- 음력/양력 시즌 이벤트, 키워드 수요, 시즌 키워드 광고 guardrail.
- bottom-up `Signal -> AgendaCandidate -> CharacterReport -> OpiSynthesisReport -> ApprovalRequest` 흐름.
- provider readiness와 read-only provider sync 근거 표시.
- 대표 결재 API, preflight, write gate 차단, mock execution, outcome 생성.
- 결재 상세 화면에서 provider 근거와 저장된 outcome report 재조회.
- `/operations`와 `/approvals/[id]`의 브라우저 가시성.

### Out of Scope

- 실제 provider write executor.
- 실제 운영 DB schema/migration.
- AgentRun/model/token/cost provenance table.
- top-down owner command center.
- 부하 테스트와 보안 침투 테스트.

## 2. Test Items

### L1: Unit Tests

| ID | Target | Description | Priority | Test Data |
|----|--------|-------------|----------|-----------|
| L1-001 | MarketingCalendar | 음력 이벤트가 연도별 양력 날짜와 비교 윈도우를 만든다. | High | 부처님오신날 fixture |
| L1-002 | SeasonalKeywordAdPlan | 예산/입찰/중지 조건이 없는 시즌 광고안을 차단한다. | High | seasonal keyword fixture |
| L1-003 | AgendaCycle | 하위 캐릭터 안건, 모아 종합, 결재 요청을 생성한다. | High | SampleProviderAdapter |
| L1-004 | ApprovalWorkflow | `APPROVE_AND_APPLY`가 write gate 닫힘을 안전하게 기록한다. | High | mock executor |
| L1-005 | ProviderOutcomeAnalysis | outcome report가 provider evidence/source report ID를 보존한다. | High | provider sync reports |
| L1-006 | ApprovalDetailViewModel | 결재 상세에 provider evidence와 outcome history를 모은다. | High | memory repository |
| L1-007 | FileRepository | owner decision/execution/outcome/follow-up을 local file store에 저장/재조회한다. | Medium | temp JSON store |

### L2: API Tests

| ID | Endpoint | Method | Description | Priority |
|----|----------|--------|-------------|----------|
| L2-001 | `/api/operations/readiness` | GET | provider readiness와 planner preview를 반환한다. | High |
| L2-002 | `/api/operations/provider-sync` | GET | read-only provider sync report를 저장/반환한다. | High |
| L2-003 | `/api/operations/workflow-state` | GET | 저장된 workflow count와 recent IDs를 반환한다. | High |
| L2-004 | `/api/approvals/[id]/decision` | POST | 대표 결정을 저장하고 write gate 닫힘은 423으로 반환한다. | High |
| L2-005 | `/api/approvals/[id]/outcomes` | GET | 결재별 저장 outcome report를 반환한다. | High |

### L3: E2E Tests

| ID | Scenario | Steps | Expected Result | Priority |
|----|----------|-------|-----------------|----------|
| L3-001 | Approval detail write gate block | 결재 상세 열기 -> 메모 입력 -> `승인 후 바로 반영` 클릭 -> reload | `WRITE_GATE_CLOSED` 알림, workflow count, 저장된 성과 보고가 보인다. | High |

### L4: UX Flow Tests

| ID | User Journey | Steps | Expected Result | Priority |
|----|-------------|-------|-----------------|----------|
| L4-001 | Operations room scan | `/operations` 접속 | 오늘 안건, provider sync, 상품 성장 후보, 결재 링크가 보인다. | High |
| L4-002 | Approval detail scan | `/approvals/[id]` 접속 | 대표 결정 입력, provider 근거, 저장된 성과 보고가 보인다. | High |

### L5: Data Flow Tests

| ID | Direction | Steps | Validation | Priority |
|----|-----------|-------|------------|----------|
| L5-001 | UI->API->Store | Playwright decision submit | ownerDecision/executionResult/outcomeReport count가 증가한다. | High |
| L5-002 | Store->API->UI | outcomes API와 detail page 재조회 | outcomeReports 1개와 `판단 보류` 상태가 보인다. | High |

## 3. Test Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:-------------:|---------------------|
| `MarketingCalendarEvent` | 4 | 설날, 추석, 부처님오신날, 스승의날 |
| `Signal` | 4 | event, keyword, provider aggregate signal |
| `KeywordDemandSnapshot` | 2 | keyword, monthlySearchCount, collectedAt |
| `ProviderSyncReport` | 4 | status, readOnly, writeAttempted, evidenceNotes, snapshots |
| `ApprovalRequest` | 2 | diff, executionPlan, rollbackPlan, measurementPlan |
| `OutcomeReport` | 1 | state, baselineSummary, checkpointSummary, evidenceLabels |

## 4. Dependencies

- Node.js/npm local runtime.
- Next.js dev server.
- Vitest.
- Playwright.
- Local file repository under `.marketcrew/`.
- Provider write gates remain closed.

## 5. Coverage Target

| Level | Target |
|-------|--------|
| L1 | Critical domain/application/API paths pass |
| L2 | MVP API endpoints return expected status and shape |
| L3 | Core approval-to-outcome scenario passes |
| L4 | Core operator screens are browser-visible |
| L5 | Decision/outcome persistence and re-read path works |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-05-22 | Initial QA test plan from Check 92% state |
