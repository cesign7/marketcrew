# ai-marketing-character-ops Analysis Report

> **Analysis Type**: PDCA Check / Final MVP Gap Review / Runtime Verification
>
> **Project**: marketcrew2
> **Version**: 0.1.0
> **Analyst**: Codex
> **Date**: 2026-05-22 KST
> **Plan Doc**: [ai-marketing-character-ops.plan.md](../01-plan/features/ai-marketing-character-ops.plan.md)
> **Design Doc**: [ai-marketing-character-ops.design.md](../02-design/features/ai-marketing-character-ops.design.md)
> **Do Doc**: [ai-marketing-character-ops.do.md](../03-do/ai-marketing-character-ops.do.md)
> **Latest Act Doc**: [ai-marketing-character-ops.iteration-11.md](../04-act/ai-marketing-character-ops.iteration-11.md)

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 대표가 먼저 지시하지 않아도 하위 AI 캐릭터들이 데이터 변화와 음력/양력 시즌 이벤트에서 위험/기회를 발견해 안건으로 상신하고, 승인된 변경은 안전 게이트를 거쳐 실행/성과 보고까지 이어지게 한다. |
| **WHO** | 스마트스토어, 네이버 광고, 자체 쇼핑몰을 함께 운영하며 매일 올라오는 마케팅 안건을 결재해야 하는 대표/마케팅 운영자. |
| **RISK** | 근거 부족 안건 과다 생성, 음력 이벤트 비교 오류, 시즌 키워드 광고 예산 과소통제, 승인 후 외부 write 오작동, 성과 측정 부재. |
| **SUCCESS** | 샘플과 read-only provider 근거만으로도 안건 발굴, 모아 종합, 변경 diff, 대표 승인, write gate 차단, 실행 결과, 성과 체크포인트, 저장된 outcome report 재조회가 브라우저에서 확인된다. |
| **SCOPE** | Phase 1은 bottom-up 안건/결재/모의 실행/성과 추적 MVP, Phase 2는 운영 DB 전환과 실제 write executor 준비, Phase 3은 owner command와 고위험 승인 정책 확장. |

## Strategic Alignment Check

PRD 문서는 `docs/00-pm/ai-marketing-character-ops.prd.md` 형태로 존재하지 않는다. 따라서 이번 Check는 Plan -> Design -> Do -> Act iteration 11 체인 기준으로 수행했다.

| Plan/Design Intent | Implementation Status | Evidence |
|--------------------|:---------------------:|----------|
| 하위 캐릭터가 먼저 안건을 상신한다. | Met | `runAgendaCycle`, `buildProviderSignalAgendaArtifacts`가 signal/report/approval loop를 만든다. |
| 음력 이벤트는 연도별 양력 환산일과 이벤트 윈도우로 비교한다. | Met | `src/lib/domain/calendar/marketing-calendar.ts`, `tests/domain/marketing-calendar.test.ts`. |
| 시즌 키워드 광고는 예산/입찰/중지 조건/제외 키워드를 가진다. | Met | `SeasonalKeywordAdPlan`, `tests/domain/seasonal-keyword-ad.test.ts`. |
| 대표 결재 후 preflight, write gate, mock execution, outcome으로 이어진다. | Met | `processOwnerDecision`, decision route, e2e smoke. |
| 실제 provider write는 기본 차단한다. | Met | `EXTERNAL_WRITE_ENABLED === "true"`일 때만 write 가능. e2e에서 `WRITE_GATE_CLOSED` 확인. |
| LLM은 raw row가 아니라 요약 후보와 근거 ID만 본다. | Met | `buildPlannerInputFromApprovals`, `rawRowsIncluded: false`. |
| 실제 provider readiness와 read-only sync 근거를 보여준다. | Met | `/api/operations/readiness`, `/api/operations/provider-sync`, provider evidence panels. |
| 상품별 키워드/마케팅/상품 발굴 후보를 만든다. | Met for MVP | `buildProductGrowthOpportunities`, `ProductGrowthOpportunityPanel`. |
| 승인된 내부 초안의 outcome을 provider snapshot 기준선과 연결한다. | Met | `buildProviderOutcomeAnalysis`, outcome evidence/source report IDs. |
| 저장된 outcome report를 다시 조회한다. | Met | `/api/approvals/[id]/outcomes`, `OutcomeReportHistoryPanel`. |
| 운영 DB/AgentRun/model-cost provenance까지 완료한다. | Partial | local file repository와 provider evidence는 있으나 DB schema, AgentRun, token/cost audit model은 아직 없다. |

## Success Criteria Status

| # | Criteria | Status | Evidence |
|---|----------|:------:|----------|
| SC-1 | `/operations`에 오늘 올라온 안건 중심 업무 지휘실이 있다. | Met | `/operations` route, browser smoke. |
| SC-2 | 샘플과 provider read-only 데이터가 공통 signal/agenda로 변환된다. | Met | sample provider, provider signal agenda tests. |
| SC-3 | 하위 캐릭터가 안건 후보를 생성한다. | Met | `AgendaCandidate`, `CharacterReport`, `OpiSynthesisReport`. |
| SC-4 | triage 통과/탈락 이유가 기록된다. | Partial | 중복 제거와 근거 기준은 있으나 탈락 사유 UI는 아직 약하다. |
| SC-5 | 캐릭터 보고서와 모아 종합 보고서가 구분된다. | Met | domain/application flow and view model. |
| SC-6 | 결재 요청에 diff, 실행 작업, 위험, rollback이 포함된다. | Met | `ApprovalPreviewPanel`. |
| SC-7 | 대표가 6개 결정을 선택할 수 있다. | Met | `OwnerDecisionSubmitPanel`. |
| SC-8 | 승인 후 바로 반영은 preflight/executor/ExecutionResult를 만든다. | Met for safe MVP | write gate 닫힘 시 423, `NEEDS_MANUAL_ACTION`, `WRITE_GATE_CLOSED`. |
| SC-9 | 승인 작업은 checkpoint와 outcome으로 이어진다. | Met | `PerformanceCheckpoint`, `OutcomeReport`. |
| SC-10 | 대표 결정/실행/성과가 후속 업무로 내려간다. | Met for local MVP | `FollowUpInternalTask` 생성, outcome history에서 후속 업무 제목 표시. |
| SC-11 | 시즌 키워드 광고 안건은 생애주기/예산/입찰/중지/제외 키워드를 포함한다. | Met | seasonal keyword tests. |
| SC-12 | `KeywordDemandSnapshot`에 캐시/조회 시각이 있다. | Met | keyword demand snapshot tests. |
| SC-13 | 승인 없는 외부 쓰기는 차단된다. | Met | route tests/e2e smoke. |
| SC-14 | 최소 단위 테스트와 브라우저 smoke가 통과한다. | Met | 15 Vitest files / 53 tests, Playwright smoke 1. |
| SC-15 | 저장된 성과 보고를 다시 조회할 수 있다. | Met | approval outcomes API and detail history panel. |

**Success Rate**: 13 Met / 1 Partial / 0 Missed for first MVP contract.
**Operator MVP Rate**: 92%.

## Gap Analysis

### API Endpoints

| Need | Implementation | Status | Notes |
|------|----------------|:------:|-------|
| `/operations` page | `src/app/operations/page.tsx` | Met | 업무실 첫 화면. |
| `/approvals/[id]` page | `src/app/approvals/[id]/page.tsx` | Met | 상세/결재 입력/provider 근거/outcome history. |
| `POST /api/approvals/[id]/decision` | `src/app/api/approvals/[id]/decision/route.ts` | Met | 400/404/409/423/200 계약 존재. |
| `GET /api/approvals/[id]/outcomes` | `src/app/api/approvals/[id]/outcomes/route.ts` | Met | 저장된 outcome report 재조회. |
| `GET /api/operations/readiness` | `src/app/api/operations/readiness/route.ts` | Met | provider readiness + planner preview. |
| `GET /api/operations/provider-sync` | `src/app/api/operations/provider-sync/route.ts` | Met | read-only provider sync 저장. |
| `GET /api/operations/workflow-state` | `src/app/api/operations/workflow-state/route.ts` | Met | 저장 카운트/최근 ID 확인. |
| `GET /api/operations/agenda-room` | Not implemented | Deferred | 현재는 page view model 직접 생성. API 분리는 DB 전환 때 진행. |
| `POST /api/internal/keyword-demand/refresh` | Not implemented | Deferred | 실제 rate limit/backoff 운영 slice에서 진행. |

### Data Model

| Model | Status | Notes |
|-------|:------:|-------|
| MarketingCalendar / DateWindow / EventComparisonWindow | Met | 음력/양력 이벤트 윈도우 구현. |
| Signal / KeywordDemandSnapshot / SearchTrendSnapshot | Met | sample + Search Ad/DataLab read-only snapshot. |
| AgendaCandidate / CharacterReport / OpiSynthesisReport | Met | bottom-up 보고 루프 구현. |
| ApprovalRequest / ExecutionPlan / OwnerDecision / PreflightCheck | Met | 대표 결정과 preflight 구현. |
| ExecutionResult / PerformanceCheckpoint / OutcomeReport | Met | mock execution + provider evidence 기반 outcome. |
| FollowUpInternalTask | Met for local MVP | 생성/저장/성과 이력 노출. 전용 업무 큐는 후속. |
| ProviderSyncReport | Met | provider status, missing env, failure reason, snapshot summary. |
| Local file persistence | Met for local MVP | `.marketcrew/workflow-store.json` 기반 repository. |
| Operating DB schema | Deferred | Prisma/Postgres 또는 SQLite schema 미구현. |
| AgentRun / model/token/cost provenance | Deferred | deterministic planner preview는 있으나 LLM 실행 감사 모델은 후속. |

### UI Coverage

| Page/Panel | Status | Notes |
|------------|:------:|-------|
| Operations Room | Met | 안건, 버킷, 캐릭터, provider readiness/sync, 상품 성장 후보, 성과 흐름 표시. |
| Approval Detail | Met | 결재 미리보기, provider 근거, 대표 결정, 저장된 성과 보고, 실행/체크포인트 표시. |
| Outcome History | Met | 상세 화면에서 저장된 outcome report 재조회. |
| Separate Outcome Route | Deferred | 독립 outcome detail page는 아직 없음. 상세 화면 내 history로 MVP 충족. |
| Follow-up Task Queue | Partial | 후속 업무는 생성/표시되지만 별도 큐 화면은 없음. |

## Runtime Verification Results

| Check | Result |
|-------|--------|
| `npm test -- --run` | 15 files, 53 tests passed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm run test:e2e` | 1 chromium smoke passed |
| Browser smoke on approval detail | `저장된 성과 보고`, `provider write gate`, outcome card 1 확인 |

## Match Rate Summary

```text
Strategic Alignment: 94%
Functional Depth:    92%
API Contract:        91%
Runtime Evidence:    95%
Safety Boundary:     96%
Overall Match Rate:  92%

Critical blockers:   0
Important gaps:      3
Accepted deferrals:  4
```

## Findings

### Important Gaps

| ID | Severity | Gap | Why It Matters | Recommended Next |
|----|----------|-----|----------------|------------------|
| G-1 | High | 운영 DB schema가 없다. | local JSON 저장소는 MVP 검증에는 충분하지만 운영 감사/동시성/백업에는 약하다. | `Signal`부터 `OutcomeReport`까지 DB schema와 migration 설계. |
| G-2 | Medium | AgentRun/model/token/cost provenance가 아직 없다. | LLM 비용과 판단 근거를 대표가 감사하려면 모델 실행 로그가 필요하다. | planner run/audit table, token estimate, UI provenance panel. |
| G-3 | Medium | 후속 내부 업무 큐가 얕다. | outcome 이후 모아가 아래 캐릭터에게 내리는 일을 계속 추적해야 한다. | `FollowUpInternalTask` 목록/상태 변경 UI. |

### Accepted MVP Deferrals

| Item | Reason |
|------|--------|
| 실제 provider write executor | 명시 승인 전까지 계속 차단하는 것이 현재 제품 안전 경계다. |
| top-down owner command center | 첫 MVP는 bottom-up 상신형 흐름을 먼저 증명한다. |
| separate outcome detail route | 결재 상세 내 outcome history로 첫 MVP는 충분하다. |
| full keyword refresh scheduler | 실제 API 호출 제한과 비용 정책을 DB 전환 뒤 묶어서 다룬다. |

## Check Decision

현재 구현은 1차 MVP 기준으로 **통과 가능**하다. 대표는 `/operations`에서 올라온 안건을 보고, `/approvals/[id]`에서 근거와 diff를 확인하고, 승인 버튼을 눌렀을 때 외부 write가 차단되는 것과 저장된 성과 보고가 남는 것을 확인할 수 있다.

다음 단계는 새 도메인 기능 추가보다 **QA/report 또는 운영 DB 전환 설계**다. 실제 provider write는 계속 차단한다.
