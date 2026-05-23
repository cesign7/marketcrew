# AI Marketing Character Operations Design Document

> **Summary**: 하위 AI 캐릭터가 마케팅 데이터를 읽고 근거 있는 안건을 상신하면, 모아가 대표 결재용 실행 계획으로 묶고, 승인 후 mock/sandbox executor와 성과 추적까지 이어지는 bottom-up AI 마케팅 운영실 설계.
>
> **Project**: marketcrew2
> **Version**: 0.4
> **Author**: Codex
> **Date**: 2026-05-23 KST
> **Status**: Draft
> **Planning Doc**: [ai-marketing-character-ops.plan.md](../../01-plan/features/ai-marketing-character-ops.plan.md)

### Pipeline References

| Phase | Document | Status |
|-------|----------|--------|
| Phase 1 | [Schema Definition](../../01-plan/schema.md) | N/A |
| Phase 2 | [Coding Conventions](../../01-plan/conventions.md) | N/A |
| Phase 3 | Mockup | N/A |
| Phase 4 | API Spec | Embedded in this document |

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 대표가 먼저 지시하지 않아도 하위 AI 캐릭터들이 데이터 변화와 음력/양력 시즌 이벤트에서 위험/기회를 발견해 안건으로 상신하고, 승인된 변경은 실제 업무 채널에 바로 반영되게 한다. |
| **WHO** | 스마트스토어, 네이버 광고, 자체 쇼핑몰을 함께 운영하며 매일 올라오는 마케팅 안건을 결재해야 하는 대표/마케팅 운영자. |
| **RISK** | 하위 캐릭터가 근거 부족한 안건을 과다 생성하거나, 음력 이벤트 비교 기준을 잘못 잡거나, 시즌 키워드 광고가 예산/입찰 안전장치 없이 실행되거나, 승인 후 외부 채널 반영이 잘못 실행되거나, 성과 측정 없이 자동화만 누적될 수 있다. |
| **SUCCESS** | 샘플 데이터만으로도 음력 이벤트 기준 비교, 상품별 키워드/마케팅/상품 발굴 안건, 시즌 키워드 광고 운영안, 모아 종합, 변경 diff, 대표 승인, 실행 결과, 성과 추적 체크포인트까지 브라우저에서 확인할 수 있다. |
| **SCOPE** | Phase 1은 bottom-up 안건 발굴/이벤트 캘린더/시즌 키워드 광고 계획/결재/실행 미리보기/모의 반영/성과 추적 MVP, Phase 2는 실제 API write executor, Phase 3은 owner command와 고위험 승인 정책으로 확장. |

---

## 1. Overview

### 1.1 Design Goals

- 대표가 매일 볼 첫 화면을 `오늘 올라온 안건` 중심으로 만든다.
- 초기 구현은 샘플 데이터와 deterministic engine으로 재현 가능하게 만든다.
- LLM은 raw data processor가 아니라 `SignalSummary`와 상위 후보를 해석하는 planner로 제한한다.
- 외부 write는 기본 차단하고, 승인/위험등급/write gate/preflight/rollback snapshot을 통과한 작업만 executor로 넘긴다.
- 음력 이벤트와 시즌 키워드 광고는 별도 도메인 규칙으로 설계해 단순 7일/30일 비교 오판을 줄인다.

### 1.2 Design Principles

- **Evidence First**: 모든 안건은 evidence row id, source, collectedAt, confidence label을 가진다.
- **Human Approval Boundary**: 대표 승인 전에는 외부 채널의 입찰가, 예산, 상품, 메시지를 변경하지 않는다.
- **Deterministic Before LLM**: 집계, 기간 비교, score, 중복 제거는 코드가 먼저 수행한다.
- **MVP Cutline**: 대표가 오늘 결재할 수 있는 근거 있는 안건에 직접 필요한 기능만 Slice 1-4에 둔다.
- **Korean Operator UI**: 화면 라벨과 운영 문구는 한국어, internal id와 provider payload key는 영어를 유지한다.

---

## 2. Architecture Options

### 2.0 Architecture Comparison

| Criteria | Option A: Minimal | Option B: Clean | Option C: Pragmatic |
|----------|:-:|:-:|:-:|
| **Approach** | 단일 route와 mock data 중심 | domain/application/infrastructure 완전 분리 | domain core는 분리하고 UI/API는 Next.js 기본 패턴 사용 |
| **New Files** | 12-18 | 50+ | 30-40 |
| **Modified Files** | 2-4 | 10+ | 5-8 |
| **Complexity** | Low | High | Medium |
| **Maintainability** | Medium | High | High |
| **Effort** | Low | High | Medium |
| **Risk** | 빠르지만 확장 시 결합 증가 | 초기 과설계 가능 | MVP 속도와 이후 확장 균형 |
| **Recommendation** | 데모/프로토타입 | 장기 플랫폼 시작 | **Default choice** |

**Selected**: Option C: Pragmatic Balance.

Rationale: 저장소가 초기 상태이고 기능 범위가 넓기 때문에, 처음부터 Enterprise 수준으로 쪼개면 속도가 떨어진다. 대신 핵심 도메인 규칙, adapter/executor interface, UI surface를 분리해 Slice 1 정적 업무방에서 Slice 6 실제 provider executor까지 자연스럽게 확장한다.

### 2.1 Component Diagram

```text
Browser UI
  ├─ Operations Room
  ├─ Approval Detail
  └─ Outcome Timeline
        │
        ▼
Next.js Server Actions / Route Handlers
  ├─ AgendaRoomQuery
  ├─ OwnerDecisionAction
  ├─ MockExecutionAction
  └─ OutcomeQuery
        │
        ▼
Application Services
  ├─ SignalCollectionService
  ├─ CharacterWatcherService
  ├─ AgendaTriageService
  ├─ MoaSynthesisService
  ├─ ApprovalWorkflowService
  ├─ ExecutionWorkflowService
  └─ OutcomeTrackingService
        │
        ▼
Domain Core
  ├─ Character / Signal / MarketingCalendar
  ├─ KeywordDemandSnapshot / SearchTrendSnapshot
  ├─ AgendaCandidate / OpportunityCandidate
  ├─ SeasonalKeywordAdPlan
  ├─ ApprovalRequest / ExecutionPlan
  └─ PerformanceCheckpoint / OutcomeReport
        │
        ▼
Infrastructure
  ├─ SampleProviderAdapter
  ├─ SearchAdReadAdapter
  ├─ SmartstoreReadAdapter
  ├─ ShopReadBridgeAdapter
  ├─ LlmPlanner
  ├─ PersistenceRepository
  └─ MockProviderExecutor
```

### 2.2 Data Flow

```text
Sample or read-only provider data
  -> SignalCollector
  -> deterministic rollups and comparisons
  -> SignalSummary[]
  -> CharacterWatcher[]
  -> AgendaCandidate[] + OpportunityCandidate[] + SeasonalKeywordAdPlan[]
  -> AgendaTriage
  -> CharacterReport[]
  -> MoaSynthesisReport
  -> ApprovalRequest + ExecutionPlan
  -> OwnerDecision
  -> PreflightCheck
  -> MockProviderExecutor
  -> ExecutionResult
  -> PerformanceCheckpoint[]
  -> OutcomeReport
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|------------|---------|
| `OperationsRoomPage` | `AgendaRoomQuery` | 대표 첫 화면 데이터 로드 |
| `AgendaRoomQuery` | repositories | 안건, 결재, 성과 상태 조합 |
| `SignalCollectionService` | `ProviderAdapter[]`, `MarketingCalendarProvider` | read-only data를 공통 signal로 변환 |
| `SeasonalKeywordService` | `KeywordDemandSnapshotRepository`, `SearchTrendSnapshotRepository`, `MarketingCalendarRepository` | 시즌 키워드 광고 후보 생성 |
| `AgendaTriageService` | domain rules only | 중복/근거/위험/우선순위 판정 |
| `MoaSynthesisService` | `LlmPlanner`, deterministic fallback | 하위 보고를 대표 결재 문서로 묶음 |
| `ApprovalWorkflowService` | `PreflightService`, `ProviderExecutor` | 대표 결정 처리와 실행 |
| `OutcomeTrackingService` | repositories, signal rollups | 승인 후 성과 checkpoint와 outcome 생성 |

---

## 3. Data Model

### 3.1 Core Types

```typescript
export type CharacterKey = "moa" | "gro" | "maru" | "day" | "copy" | "ripi" | "pro";

export type SignalType =
  | "daily_spike"
  | "weekly_trend"
  | "monthly_trend"
  | "seasonal_yoy"
  | "lunar_event_yoy"
  | "event_opportunity"
  | "seasonal_keyword_demand"
  | "target_gap";

export type DataConfidence =
  | "READY_TO_APPROVE"
  | "EVIDENCE_WEAK"
  | "SEASONAL_CONTEXT_REQUIRED"
  | "LUNAR_EVENT_CONTEXT_REQUIRED"
  | "KEYWORD_DEMAND_STALE"
  | "AD_TRACKING_UNVERIFIED"
  | "BUDGET_GUARD_MISSING"
  | "API_PARTIAL_FAILURE"
  | "INSUFFICIENT_HISTORY";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OwnerDecisionType =
  | "APPROVE_AND_APPLY"
  | "APPROVE_DRAFT_ONLY"
  | "REQUEST_REVISION"
  | "REQUEST_MORE_EVIDENCE"
  | "HOLD"
  | "REJECT";
```

### 3.2 Entity Definition

```typescript
export interface MarketingCalendarEvent {
  id: string;
  name: string;
  eventType: "solar" | "lunar";
  lunarMonth?: number;
  lunarDay?: number;
  solarMonth?: number;
  solarDay?: number;
  yearlySolarDate: string;
  windowStartOffsetDays: number;
  windowEndOffsetDays: number;
  tags: string[];
}

export interface Signal {
  id: string;
  source: "sample" | "smartstore" | "search_ad" | "shop" | "calendar" | "datalab";
  signalType: SignalType;
  entityType: "product" | "keyword" | "campaign" | "customer_segment" | "calendar_event";
  entityId: string;
  title: string;
  currentValue?: number;
  baselineValue?: number;
  deltaRate?: number;
  periodStart: string;
  periodEnd: string;
  baselineStart?: string;
  baselineEnd?: string;
  evidenceRowIds: string[];
  createdAt: string;
}

export interface KeywordDemandSnapshot {
  id: string;
  keyword: string;
  provider: "naver_keyword_tool" | "sample";
  monthlyPcSearches?: number;
  monthlyMobileSearches?: number;
  competitionIndex?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  averagePcCtr?: number;
  averageMobileCtr?: number;
  cachedUntil: string;
  collectedAt: string;
  rateLimitState: "OK" | "STALE" | "BACKOFF" | "FAILED";
}

export interface SearchTrendSnapshot {
  id: string;
  keywordGroupName: string;
  provider: "naver_datalab" | "sample";
  timeUnit: "date" | "week" | "month";
  startDate: string;
  endDate: string;
  ratios: Array<{ period: string; ratio: number }>;
  collectedAt: string;
  note: "relative_ratio_not_absolute_volume";
}

export interface SeasonalKeywordAdPlan {
  id: string;
  productId: string;
  eventId: string;
  owner: "gro";
  seasonStage: "DISCOVER" | "VALIDATE" | "TEST" | "SCALE" | "PEAK_GUARD" | "TAPER" | "REVIEW";
  keywordSet: {
    add: string[];
    expand: string[];
    pause: string[];
    negativeCandidates: Array<{ keyword: string; reason: string }>;
  };
  dailyBudgetCap?: number;
  bidCap?: number;
  stopConditions: Array<{ metric: "CPA" | "ROAS" | "SPEND" | "STOCK" | "MARGIN"; operator: ">" | "<"; value: number; durationDays?: number }>;
  landingReadiness: "READY" | "DRAFT" | "MISSING";
  confidence: DataConfidence;
  evidenceIds: string[];
}

export interface AgendaCandidate {
  id: string;
  character: CharacterKey;
  title: string;
  summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  sourceSignalIds: string[];
  opportunityIds: string[];
  dataConfidence: DataConfidence;
  duplicateKey: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  moaSynthesisReportId: string;
  evidenceSummary: string;
  dataConfidence: DataConfidence;
  riskLevel: RiskLevel;
  executionPlan: ExecutionPlan;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HELD" | "NEEDS_REVISION" | "NEEDS_EVIDENCE";
  createdAt: string;
}

export interface ExecutionPlan {
  id: string;
  workType: "INTERNAL_TASK" | "SEARCH_AD_KEYWORD" | "SEARCH_AD_BID_BUDGET" | "CREATIVE_DRAFT" | "PRODUCT_DRAFT" | "CRM_DRAFT";
  beforeState: unknown;
  afterState: unknown;
  diffSummary: string;
  rollbackPlan?: string;
  measurementPlan: MeasurementPlan;
  executorKey: string;
  requiresWriteGate: boolean;
  executionScopeProposal?: ExecutionScopeProposal;
}

export interface ExecutionScopeProposal {
  title: string;
  summary: string;
  fields: Array<{
    id: string;
    label: string;
    recommendedValue: string;
    options: string[];
    reason: string;
    required: boolean;
  }>;
  guardrails: string[];
}

export interface ExecutionScopeSelection {
  proposalTitle: string;
  selections: Array<{ fieldId: string; label: string; value: string }>;
}

export interface ExecutionResult {
  id: string;
  approvalRequestId: string;
  state: "APPLIED" | "PARTIALLY_APPLIED" | "FAILED" | "NEEDS_MANUAL_ACTION" | "ROLLED_BACK";
  appliedOperations: string[];
  failedOperations: Array<{ operation: string; reason: string; retryable: boolean }>;
  createdAt: string;
}
```

### 3.3 Entity Relationships

```text
MarketingCalendarEvent 1 ──── N Signal
KeywordDemandSnapshot N ──── N SeasonalKeywordAdPlan
SearchTrendSnapshot N ──── N SeasonalKeywordAdPlan
Signal N ──── N AgendaCandidate
AgendaCandidate N ──── 1 CharacterReport
CharacterReport N ──── 1 MoaSynthesisReport
MoaSynthesisReport 1 ──── N ApprovalRequest
ApprovalRequest 1 ──── 1 ExecutionPlan
ApprovalRequest 1 ──── N OwnerDecision
OwnerDecision 0..1 ──── 1 ExecutionResult
ExecutionResult 1 ──── N PerformanceCheckpoint
PerformanceCheckpoint N ──── 0..1 OutcomeReport
OutcomeReport 0..1 ──── N FollowUpInternalTask
```

### 3.4 Provider History Policy

외부 API의 과거 조회 한계는 안건 신뢰도와 비용을 직접 좌우하므로 `ProviderSyncReport.historyPolicy`에 함께 저장한다.

| Provider | API 조회 한계 | 기본 수집/강화 수집 | 수동 갱신과 중복 방지 |
|----------|---------------|----------------------|--------------------------|
| 네이버 키워드광고 | 쇼핑 검색어 성과는 최근 30일 중심으로 보고, breakdown 성격의 세부 통계는 유형별 7~90일 제약을 기준으로 보수적으로 다룬다. | 매일 07:05 전체 광고/키워드 요약을 저장하고, 광고 집행 중에는 07:05/15:05 2회 점검한다. | 입찰/예산/소재 변경 직후와 결재 직전 즉시 갱신한다. `provider+channel+date+keywordGroup+windowKind` 기준 최신 스냅샷으로 갱신하고 실행 이력은 별도 보관한다. |
| 네이버 데이터랩 | 2016-01-01 이후 검색 추이를 상대 ratio로 조회하며 하루 호출 한도 1,000회를 기준으로 한다. | 매일 07:20 시즌 감시 키워드만 저장하고, 시즌 D-30부터 이벤트별 D-기간 추이를 매일 저장한다. | 새 시즌 키워드/상품 후보 결재 직전에 갱신한다. `provider+keywordGroup+timeUnit+startDate+endDate+segment` 기준 최신 ratio로 갱신한다. |
| 스마트스토어(스티커씨) | 변경 주문은 24시간 창 기준으로 조회하고 1회 최대 300건과 more 페이징을 사용한다. | 매일 07:10 변경 주문과 상품/매출 집계를 저장하고, 시즌 D-30부터 강화하며 D-7~D+3은 07:10/15:10 2회 점검한다. | 상품/가격/프로모션 변경 직후와 결재 직전 갱신한다. `provider+brand+date+windowDays+sourceKind` 기준 일별 집계만 갱신하고 주문 원문은 저장하지 않는다. |
| 쇼핑몰(커피프린트) | 자체 영카트 DB와 브리지 보존 정책이 기준이다. | 매일 07:15 최근 30일 주문/재구매 집계를 저장하고, 시즌 D-30 또는 CRM/랜딩 캠페인 중에는 오전/오후 2회까지 허용한다. | 랜딩/쿠폰/CRM 변경 직후와 결재 직전 갱신한다. `provider+brand+date+windowDays+aggregateType` 기준 최신 집계로 갱신한다. |

운영 기준은 자동 스케줄과 수동 연동 수집을 병행한다. 자동 스케줄은 기준 데이터를 빠짐없이 쌓기 위한 것이고, 수동 수집은 방금 바뀐 광고/상품/CRM 또는 결재 직전 최신 근거를 보강하기 위한 것이다. 같은 브랜드/연동처/날짜/기간/시즌 이벤트의 데이터는 최신 스냅샷으로 갱신하되, 수집 성공/실패 이력은 별도 보관한다.

메뉴와 필터의 최상위 기준은 브랜드다. `스티커씨`와 `커피프린트`는 서로 비교하지 않고 분리 판단한다. 스마트스토어, 자체 쇼핑몰, 향후 커피프린트 스마트스토어는 각 브랜드 안의 판매채널이며, 네이버 키워드광고와 데이터랩은 브랜드별 해석에 붙는 근거 소스다. 전체 보기에서는 한 화면에 나열하되 AI 판독 근거와 결재 안건은 브랜드별로 생성한다.

Design decisions:

- LLM에는 원천 행, 주문번호, 고객 식별정보, 토큰, 시크릿을 전달하지 않는다.
- 30일 집계를 반복해서 LLM에 넣지 않고, 코드가 일별 집계/전년동기/음력 이벤트 윈도우를 먼저 계산한 뒤 요약만 보낸다.
- API로 다시 가져올 수 없는 기간은 `INSUFFICIENT_HISTORY` 또는 추가 백필 필요로 표시한다.
- 결재 근거는 광고/주문 데이터 기준 2시간 이내를 권장하고 24시간을 넘기면 수동 갱신 필요로 표시한다.

#### 공급자 판단 근거 확장 순서

`/data`는 현재 원천/저장 필드 계약과 함께 다음 보강 순서를 보여준다. 이 순서는 실제 코드 구현 순서의 기준이며, 먼저 결재 판단 품질을 크게 올리는 근거부터 수집한다.

| 순서 | 모듈 | 공급자 | 화면 이름 | 구현 계약 |
|------|------|--------|-----------|-----------|
| 1 | `module-14` | 네이버 키워드광고 | 광고그룹 실제 설정 | PC/모바일 집행 설정, 입찰 가중치, 예산, ON/OFF, 요일/시간/지역/연령/성별 타겟을 읽어 `AdGroupSettingSnapshot` 후보로 정규화한다. |
| 2 | `module-15` | 네이버 키워드광고 | 기기·시간대·요일 성과 | 기기, 시간대, 요일별 성과와 전환 데이터를 `AdPerformanceBreakdownSnapshot` 후보로 정규화한다. |
| 3 | `module-16` | 스마트스토어(스티커씨) | 스마트스토어 순매출과 클레임 | 할인액, 배송비, 취소, 반품, 교환, 구매확정 상태를 `CommerceQualitySnapshot` 후보로 정규화한다. |
| 4 | `module-17` | 네이버 데이터랩 | 데이터랩 세그먼트 | 성별, 연령, 기기, 기간 단위 상대 추이를 `SearchTrendSegmentSnapshot` 후보로 정규화한다. |
| 5 | `module-18` | 스마트스토어 데이터솔루션 | 스마트스토어 데이터솔루션 | 판매 분석, 고객 분석, 유입/전환 분석 권한이 확인된 범위만 `CommerceAnalyticsSnapshot` 후보로 정규화한다. |

다섯 모듈은 write gate, 배포 안전장치, rollback 근거가 명시적으로 열리기 전까지 모두 read-only로 유지한다. 화면 문구는 한국어로 쓰되, 원천 필드 상세 안의 provider 필드명과 API 식별자는 정확성을 위해 원문을 유지한다.

#### 검색광고 성과 규칙 엔진

`module-30`은 `module-16`의 성과 분해 수집을 실제 LLM 판단 전에 사용할 수 있는 규칙 엔진 계약으로 고정한다. 네이버 검색광고 `/stats` 계열 집계는 원천 행이 아니라 아래 요약 타입으로 저장한다.

```ts
type SearchAdPerformanceSnapshot = {
  id: string;
  provider: "naver_search_ad";
  brandKey: string;
  campaignName: string;
  adGroupName: string;
  keyword: string;
  device: "PC" | "MOBILE" | "ALL";
  timeSlot?: string;
  windowDays: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  targetCpa?: number;
  targetRoas?: number;
  trackingVerified: boolean;
  dataScope: "aggregate_only";
};
```

판정 순서는 deterministic rules first, LLM second다.

| 규칙 | 담당 | 안건화 |
|---|---|---|
| `TRACKING_UNVERIFIED` | 데이 | 전환 추적/주문 연결 근거 확인 요청 |
| `CLICKS_NO_ORDER` | 그로 | 일시중지, 입찰 하향, 제외 키워드, 랜딩 점검 안건 |
| `LOW_CVR` | 그로 | 입찰 하향 또는 문구/랜딩 점검 안건 |
| `HIGH_CPA` | 그로 | 예산 축소, 전환 좋은 키워드로 이동 안건 |
| `DEVICE_GAP` | 그로 | PC/모바일 가중치 조정 또는 분리 집행 안건 |
| `TIME_SLOT_GAP` | 그로 | 저성과 시간대 제외 또는 예산 집중 시간대 조정 안건 |

Gemini planner prompt에는 `SearchAdPerformanceSnapshot`의 집계 요약과 근거 ID만 포함한다. provider sync AgentRun, AI 판독 근거, Outcome 기준선은 같은 snapshot ID를 추적한다.

### 3.5 LLM 자유 탐색과 근거 요청 루프

정형 `SignalSummary`는 LLM 입력 비용을 통제하기 위한 기본 입력이다. 다만 캐릭터는 이 요약만 해석하는 수동 보고자가 아니라, 정해진 신호 밖의 조합을 `HypothesisCandidate`로 제안하고 필요한 근거를 `EvidenceRequest`로 요청할 수 있어야 한다.

```ts
type HypothesisCandidate = {
  id: string;
  character: CharacterKey;
  title: string;
  hypothesis: string;
  reasonFromKnownSignals: string[];
  requestedEvidenceIds: string[];
  status: "WAITING_EVIDENCE" | "VERIFIED" | "REJECTED" | "PROMOTED";
  promotedAgendaCandidateId?: string;
  createdAt: string;
  updatedAt: string;
};

type EvidenceRequest = {
  id: string;
  hypothesisId: string;
  requestedBy: CharacterKey;
  verifier: "day";
  neededSource: "search_ad" | "smartstore" | "shop" | "datalab" | "internal";
  neededFields: string[];
  comparisonWindow: string;
  reason: string;
  status: "REQUESTED" | "COLLECTING" | "VERIFIED" | "INSUFFICIENT";
  verificationNote?: string;
  verifiedEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

Promotion guard:

- `HypothesisCandidate.status`가 `VERIFIED`가 되기 전에는 `ApprovalRequest`로 승격하지 않는다.
- 데이는 원천 필드/집계 기준/비교 기간을 확인하고, 부족하면 연결된 `EvidenceRequest`를 `REQUESTED`, `COLLECTING`, `INSUFFICIENT` 중 하나로 유지한다.
- 모아는 가설과 연결된 모든 근거 요청이 `VERIFIED`일 때만 `AgendaCandidate`로 승격한다.
- 데이의 상태 변경은 `PATCH /api/evidence-requests/[id]`로 저장하고, `evidence_request_review` AgentRun이 `evidence_request`, `hypothesis_candidate`, 승격된 `agenda_candidate`를 연결한다.
- `/people` 인사과 화면은 이 정책을 캐릭터 롤모델과 판단 방식 카드로 보여준다.
- `/operations` 업무실은 이 정책을 `근거 요청 큐` 패널로 보여주며, 검증 전 가설은 `WAITING_EVIDENCE` bucket에 포함하고 `수집 시작`, `근거 충분`, `근거 부족` 액션을 제공한다.

### 3.6 Persistence Shape

For MVP, a repository interface should support an in-memory/sample implementation first, then Prisma/Postgres.

```sql
CREATE TABLE work_items (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evidence_rows (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_entity_id TEXT,
  collected_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL
);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  character_key TEXT NOT NULL,
  run_type TEXT NOT NULL,
  model_name TEXT,
  input_summary_json JSONB,
  output_json JSONB,
  token_usage_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. API Specification

### 4.1 Endpoint List

Initial implementation may use server actions, but route handlers should keep these contracts stable for tests.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/operations/agenda-room` | Operations Room aggregate data | Required later, local MVP optional |
| GET | `/api/operations/readiness` | Provider readiness와 LLM planner preview 조회 | Local MVP optional |
| GET | `/api/operations/llm-dry-run-queue` | 실제 LLM 호출 전 AI 실행 큐와 planner audit 조회 | Required before live adapter |
| POST | `/api/operations/generate-sample` | Generate sample signals, reports, approvals, outcomes | Local only |
| GET | `/api/approvals` | List approval requests | Required later |
| GET | `/api/approvals/:id` | Approval detail with evidence and execution preview | Required later |
| POST | `/api/approvals/:id/decision` | Apply owner decision | Required later |
| GET/POST | `/api/operations/execution-scope-backfill` | Preview/apply execution scope backfill for saved approvals | Internal ops |
| GET | `/api/outcomes` | List active checkpoints and outcome reports | Required later |
| POST | `/api/internal/keyword-demand/refresh` | Refresh keyword demand snapshot behind gate | Server only |

### 4.2 `GET /api/operations/agenda-room`

**Response:**

```json
{
  "generatedAt": "2026-05-22T09:00:00+09:00",
  "inboxBuckets": {
    "TODAY_APPROVAL": [],
    "SEASONAL_KEYWORD_REVIEW": [],
    "TRACKING_OUTCOME": [],
    "WAITING_EVIDENCE": [],
    "AUTO_HOLD": [],
    "FAILED_EXECUTION": []
  },
  "characters": [],
  "approvalRequests": [],
  "executionResults": [],
  "performanceCheckpoints": []
}
```

### 4.3 `POST /api/approvals/:id/decision`

**Request:**

```json
{
  "decision": "APPROVE_AND_APPLY",
  "memo": "테스트 예산 상한 내에서 진행",
  "executionScopeSelection": {
    "proposalTitle": "부처님오신날 키워드 테스트 실행 범위",
    "selections": [
      { "fieldId": "device", "label": "기기/매체", "value": "모바일 우선 + PC 소액 병행" },
      { "fieldId": "time-window", "label": "시간대", "value": "전체 시간 소액 테스트" }
    ]
  },
  "secondConfirmation": false
}
```

**Behavior:**

- `APPROVE_AND_APPLY` calls `PreflightService`.
- `CRITICAL` risk requires `secondConfirmation=true`.
- If present, `executionScopeSelection` is stored with the owner decision and appended to the decision memo for auditability.
- External writes remain blocked unless `EXTERNAL_WRITE_ENABLED=true` and provider gate is true.
- MVP uses `MockProviderExecutor` and records an `ExecutionResult`.

**Error Responses:**

- `400 VALIDATION_ERROR`: decision shape invalid.
- `409 PREFLIGHT_BLOCKED`: missing rollback, write gate, budget guard, tracking status, or stale keyword demand.
- `423 WRITE_GATE_CLOSED`: approval is valid but real provider write is disabled.

---

## 5. UI/UX Design

### 5.1 Screen Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ 상단: MarketCrew 운영실 / 오늘 날짜 / 데이터 신뢰도 / 동기화 │
├─────────────────────────────────────────────────────────────┤
│ 좌측: 캐릭터 상태             │ 우측: 오늘 올라온 안건        │
│ 모아/그로/마루/데이/카피/... │ TODAY_APPROVAL cards         │
├─────────────────────────────────────────────────────────────┤
│ 시즌/명절 기회                │ 승인하면 바로 반영될 작업     │
│ 이벤트 윈도우, 키워드 계획    │ Execution preview list        │
├─────────────────────────────────────────────────────────────┤
│ 성과 추적 중                  │ 추가 근거 대기 / 실패 실행    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 User Flow

```text
Operations Room
  -> 오늘 올라온 안건 확인
  -> Approval Detail에서 근거, diff, risk, rollback, measurement 확인
  -> APPROVE_AND_APPLY 또는 다른 결정 선택
  -> ExecutionResult 표시
  -> PerformanceCheckpoint 생성
  -> OutcomeReport 확인
```

### 5.3 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `OperationsRoomPage` | `src/app/operations/page.tsx` | 첫 화면 route |
| `CharacterStatusRail` | `src/components/character-room/` | 캐릭터별 감지/보고/대기 상태 |
| `InboxBucketTabs` | `src/components/agenda/` | 우선순위 bucket 전환 |
| `AgendaCard` | `src/components/agenda/` | 안건 요약, 근거 수, confidence, risk |
| `SeasonalKeywordPlanCard` | `src/components/opportunity/` | 시즌 키워드 생애주기와 광고 안전장치 표시 |
| `ApprovalPreviewPanel` | `src/components/agenda-room/` | before/after diff, AI 제안 실행 범위, rollback, measurement |
| `OwnerDecisionSubmitPanel` | `src/components/agenda-room/` | 승인/초안확정/반려/수정/근거요청/보류, 대표 실행 범위 수정 |
| `ExecutionResultTimeline` | `src/components/execution/` | 실행 결과, 부분 실패, 재시도 필요 표시 |
| `OutcomeCheckpointList` | `src/components/outcome/` | 성과 체크포인트와 결과 상태 |

### 5.4 Page UI Checklist

#### Operations Room

- [x] Header: `MarketCrew 운영실`, KST 기준 집계 시각, provider readiness summary.
- [ ] Button: `샘플 안건 생성`, local MVP only.
- [ ] Button: `데이터 다시 수집`, disabled when provider credentials are missing.
- [ ] Rail: 7 characters with Korean names, status badge, latest report count.
- [ ] Tabs: `오늘 결재`, `시즌 키워드`, `성과 추적`, `근거 대기`, `실패 실행`, `자동 보류`.
- [ ] Card: Agenda title, owner character, severity, confidence label, evidence count.
- [ ] Card: Seasonal keyword stage, event window, keyword add/negative counts, budget cap, bid cap.
- [ ] Card: Approval preview summary, risk level, expected impact, rollback availability.
- [ ] Empty State: 안건 없음, 근거 대기 없음, 실패 없음 states in Korean.

#### Approval Detail

- [ ] Section: 모아 종합 보고.
- [ ] Section: 하위 캐릭터 보고 list with evidence references.
- [ ] Section: 변경 전/후 diff.
- [ ] Section: 실행 대상 operations.
- [ ] Section: risk level and write gate state.
- [ ] Section: rollback plan.
- [ ] Section: measurement checkpoints.
- [x] Buttons: `승인 후 바로 반영`, `초안 확정`, `수정 요청`, `추가 근거 요청`, `보류`, `반려`.
- [ ] Guard: disabled `승인 후 바로 반영` when confidence is not `READY_TO_APPROVE`.

#### Outcome View

- [ ] List: active performance checkpoints by due date.
- [ ] Badge: `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `INCONCLUSIVE`.
- [ ] Detail: baseline, checkpoint value, delta, interpretation, follow-up agenda link.

---

## 6. Error Handling

### 6.1 Error Code Definition

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| `VALIDATION_ERROR` | 입력값이 올바르지 않습니다. | malformed request | field errors 표시 |
| `PROVIDER_NOT_READY` | 연동 준비가 필요합니다. | missing credentials or read-only approval | readiness card 표시 |
| `KEYWORD_DEMAND_STALE` | 키워드 수요 데이터가 오래됐습니다. | cache expired or 429 backoff | 추가 근거 대기로 이동 |
| `PREFLIGHT_BLOCKED` | 실행 전 점검을 통과하지 못했습니다. | missing rollback, budget cap, tracking | 승인 버튼 비활성화 및 이유 표시 |
| `WRITE_GATE_CLOSED` | 외부 반영 게이트가 닫혀 있습니다. | env gate false | mock/draft only 안내 |
| `PARTIAL_EXECUTION_FAILURE` | 일부 작업만 반영되었습니다. | executor partial failure | 실패 operation과 재시도 표시 |

### 6.2 Error Response Format

```json
{
  "error": {
    "code": "PREFLIGHT_BLOCKED",
    "message": "예산 상한 또는 중지 조건이 없어 즉시 반영할 수 없습니다.",
    "details": {
      "missing": ["dailyBudgetCap", "stopConditions"]
    }
  }
}
```

---

## 7. Security Considerations

- [x] Provider credentials are server-only environment variables.
- [ ] `EXTERNAL_WRITE_ENABLED=false` by default.
- [x] Provider-specific write gates are false until separately approved.
- [ ] PII is excluded from LLM input; customer segment summaries use aggregate counts.
- [x] LLM input snapshots store row IDs and summaries, not raw full tables.
- [ ] Owner decisions are audit logged with actor, timestamp, memo, and resulting state.
- [ ] `CRITICAL` risk actions require second confirmation and cannot be one-click applied.
- [ ] Keyword demand refresh route is server-only and rate-limited.

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Phase |
|------|--------|------|-------|
| L1: Domain/API Tests | signal generation, triage, approval, preflight, mock execution | Vitest / route tests | Do |
| L2: UI Action Tests | Operations Room, Approval Detail, Outcome View | Playwright | Do |
| L3: E2E Scenario Tests | bottom-up agenda to approval to execution to outcome | Playwright | Do |

### 8.2 L1: API and Domain Test Scenarios

| # | Target | Test Description | Expected |
|---|--------|------------------|----------|
| 1 | `MarketingCalendar` | 부처님오신날 음력 이벤트가 연도별 양력 날짜와 D-n window를 가진다. | valid event window |
| 2 | `SignalEngine` | `lunar_event_yoy` compares same lunar event windows, not same solar dates. | correct baseline range |
| 3 | `SeasonalKeywordService` | `SeasonalKeywordAdPlan` without budget cap or stop condition is not approvable. | `BUDGET_GUARD_MISSING` |
| 4 | `KeywordDemandRepository` | stale cache returns stale label and avoids raw LLM expansion. | `KEYWORD_DEMAND_STALE` |
| 5 | `AgendaTriageService` | duplicate agenda candidates are collapsed by duplicate key. | one promoted candidate |
| 6 | `ApprovalWorkflowService` | `APPROVE_AND_APPLY` with closed write gate records draft/mock state, not real provider write. | no external write call |
| 7 | `OutcomeTrackingService` | approved execution creates checkpoints and outcome placeholders. | checkpoint records created |
| 8 | `ProviderSyncReport` | provider별 조회 한계, 백필, 일별 저장, AI 입력 제한 정책이 view model로 전달된다. | `historyPolicy` visible |

### 8.3 L2: UI Action Test Scenarios

| # | Page | Action | Expected Result | Data Verification |
|---|------|--------|----------------|-------------------|
| 1 | Operations Room | Load page with sample data | all checklist sections visible | agenda cards count > 0 |
| 2 | Operations Room | Click `시즌 키워드` tab | seasonal keyword cards visible | plan stage and budget guards shown |
| 3 | Approval Detail | Open approval card | diff, risk, rollback, measurement visible | approval id matches route |
| 4 | Approval Detail | Approval blocked by missing guard | `승인 후 바로 반영` disabled | reason includes `BUDGET_GUARD_MISSING` |
| 5 | Approval Detail | Approve valid mock execution | execution result timeline appears | `ExecutionResult.state` visible |
| 6 | Outcome View | Open tracking bucket | checkpoints visible by due date | outcome state badge visible |
| 7 | Data Integration | Change channel/period filter | provider-specific API limit and storage policy visible | policy text matches selected channel |

### 8.4 L3: E2E Scenario Test Scenarios

| # | Scenario | Steps | Success Criteria |
|---|----------|-------|-----------------|
| 1 | Bottom-up agenda loop | Generate sample data -> open Operations -> open approval | 모아 종합과 하위 보고가 보인다. |
| 2 | Seasonal keyword guarded approval | Open seasonal keyword approval -> inspect guard fields -> approve draft | budget/bid/stop conditions visible and draft result recorded. |
| 3 | Block unsafe execution | Remove budget guard in fixture -> try approve/apply | preflight blocks execution and shows reason. |
| 4 | Outcome loop | Approve mock execution -> open outcome tracking | checkpoint and outcome placeholder created. |

### 8.5 Seed Data Requirements

| Entity | Minimum Count | Key Fields Required |
|--------|:-------------:|---------------------|
| `MarketingCalendarEvent` | 4 | 설날, 추석, 부처님오신날, 어버이날 |
| `Product` | 4 | 선물카드, 시즌상품, 일반상품, 재고부족상품 |
| `Signal` | 8 | mixed signal types and evidence ids |
| `KeywordDemandSnapshot` | 8 | add and negative keyword candidates |
| `AgendaCandidate` | 6 | at least one per major character except moa |
| `ApprovalRequest` | 3 | ready, blocked, draft-only examples |
| `ExecutionResult` | 2 | applied and partial failure examples |

---

## 9. Clean Architecture

### 9.1 Layer Structure

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Presentation | pages, visual components, client interactions | `src/app/`, `src/components/` |
| Application | use cases, workflow orchestration, server actions | `src/features/*/`, `src/lib/application/` |
| Domain | pure types, policy functions, deterministic rules | `src/lib/domain/` |
| Infrastructure | provider adapters, executor adapters, persistence, LLM clients | `src/lib/integrations/`, `src/lib/persistence/`, `src/lib/llm/` |

### 9.2 Dependency Rules

```text
Presentation -> Application -> Domain
Application -> Infrastructure -> Domain
Domain -> no Presentation, no Infrastructure, no provider SDK
```

### 9.3 File Import Rules

| From | Can Import | Cannot Import |
|------|------------|---------------|
| Presentation | Application query/action wrappers, Domain display types | provider adapters directly |
| Application | Domain, Infrastructure interfaces | React components |
| Domain | local pure helpers only | DB, fetch, env, LLM, provider SDK |
| Infrastructure | Domain types | Presentation |

### 9.4 This Feature's Layer Assignment

| Component | Layer | Location |
|-----------|-------|----------|
| `OperationsRoomPage` | Presentation | `src/app/operations/page.tsx` |
| `AgendaCard` | Presentation | `src/components/agenda/AgendaCard.tsx` |
| `buildAgendaRoomViewModel` | Application | `src/features/agenda-room/buildAgendaRoomViewModel.ts` |
| `runAgendaCycle` | Application | `src/lib/application/agenda-cycle.ts` |
| `triageAgendaCandidates` | Domain | `src/lib/domain/agenda/triage.ts` |
| `buildSeasonalKeywordAdPlan` | Domain | `src/lib/domain/opportunities/seasonal-keyword-ad.ts` |
| `SampleProviderAdapter` | Infrastructure | `src/lib/integrations/sample/provider.ts` |
| `MockProviderExecutor` | Infrastructure | `src/lib/integrations/executors/mock-provider-executor.ts` |

---

## 10. Coding Convention Reference

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Components | PascalCase | `SeasonalKeywordPlanCard` |
| Functions | camelCase verb phrase | `buildSeasonalKeywordAdPlan()` |
| Domain files | kebab-case | `seasonal-keyword-ad.ts` |
| Internal IDs | English lower snake or lower camel by context | `READY_TO_APPROVE`, `seasonal_keyword_demand` |
| UI labels | Korean | `오늘 결재`, `시즌 키워드` |

### 10.2 Import Order

```typescript
// 1. Framework
import { Suspense } from "react";

// 2. External libraries
import { z } from "zod";

// 3. Internal absolute imports
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";

// 4. Relative imports
import { AgendaCard } from "./AgendaCard";

// 5. Type imports
import type { ApprovalRequest } from "@/lib/domain/approvals/types";
```

### 10.3 Environment Variables

| Prefix/Key | Purpose | Scope |
|------------|---------|-------|
| `AI_LLM_*` | LLM provider and model config | Server |
| `NAVER_SEARCH_AD_*` | Search Ad read/write integration | Server |
| `NAVER_DATALAB_*` | DataLab trend integration | Server |
| `*_WRITE_ENABLED` | write gate flags | Server |
| `NEXT_PUBLIC_*` | only non-secret UI config | Browser |

### 10.4 This Feature's Conventions

| Item | Convention Applied |
|------|--------------------|
| State management | server-loaded view model plus small local UI state |
| Error handling | typed error code with Korean UI message |
| Tests | domain tests first, then Playwright smoke |
| Data storage | repository interface first, DB implementation later |

---

## 11. Implementation Guide

### 11.1 File Structure

```text
src/
  app/
    operations/
      page.tsx
    approvals/
      [id]/
        page.tsx
    api/
      operations/
        agenda-room/route.ts
        generate-sample/route.ts
      approvals/
        [id]/decision/route.ts
  components/
    character-room/
    agenda/
    approval/
    execution/
    opportunity/
    outcome/
  features/
    agenda-room/
      buildAgendaRoomViewModel.ts
      actions.ts
    approvals/
      actions.ts
      buildApprovalDetailViewModel.ts
  lib/
    application/
      agenda-cycle.ts
      approval-workflow.ts
      outcome-tracking.ts
    domain/
      characters/
      signals/
      calendar/
      agenda/
      opportunities/
      approvals/
      execution/
      outcomes/
    integrations/
      sample/
      calendar/
      search-ad/
      datalab/
      smartstore/
      shop/
      executors/
    persistence/
      repositories.ts
      memory-repository.ts
    llm/
      planner.ts
  tests/
    domain/
    e2e/
```

### 11.2 Implementation Order

1. [x] Scaffold Next.js + TypeScript + test tooling.
2. [x] Create domain type files and sample fixtures.
3. [x] Implement `MarketingCalendar`, signal comparison, and seasonal keyword guard domain tests.
4. [x] Implement in-memory repositories and `runAgendaCycle`.
5. [x] Build Operations Room UI with sample generated data, inbox buckets, and approval preview.
6. [x] Build Approval Detail UI and owner decision actions.
7. [x] Add mock executor and outcome checkpoints.
8. [x] Add LLM planner interface behind deterministic fallback.
9. [x] Add real provider readiness probes, still read-only.
10. [x] Add AI 실행 큐 모의 실행과 `llm_dry_run` 감사 기록.

### 11.3 Session Guide

#### Module Map

| Module | Scope Key | Description | Estimated Turns |
|--------|-----------|-------------|:---------------:|
| Project scaffold and UI shell | `module-1` | Next.js scaffold, layout, Korean UI shell, basic routes | 25-35 |
| Domain core | `module-2` | calendar, signals, opportunities, seasonal keyword policy, approval/execution types | 35-50 |
| Sample workflow | `module-3` | sample adapters, in-memory repository, agenda cycle, mock executor | 35-45 |
| Operations Room UI | `module-4` | cards, buckets, character rail, approval preview | 35-45 |
| Approval and outcome loop | `module-5` | owner decisions, preflight, execution result, checkpoints, outcome UI | 35-45 |
| LLM/provider readiness | `module-6` | LLM interface, readiness cards, Search Ad/DataLab read adapters | 40-60 |
| 판단 근거 확장 로드맵 | `module-14` | `/data` 판단 근거 확장 순서와 공식 문서 출처 표시 | 10-15 |
| 광고 설정 스냅샷 | `module-15` | 검색광고 광고그룹 설정, PC/모바일, 예산, 타겟 스냅샷 | 25-35 |
| 광고 성과 분해 | `module-16` | 기기, 시간대, 요일별 광고 성과와 전환 근거 | 25-35 |
| 커머스 품질 스냅샷 | `module-17` | 스마트스토어 순매출, 취소/반품/교환, 구매확정 근거 | 25-35 |
| 검색/커머스 분석 확장 | `module-18` | 데이터랩 세그먼트와 스마트스토어 데이터솔루션 권한 기반 확장 | 30-40 |
| 자유 탐색 정책 UI | `module-19` | 인사과 판단 방식 카드와 캐릭터별 자유 탐색/근거 요청 롤모델 | 8-12 |
| 근거 요청 큐와 승격 가드 | `module-20` | `HypothesisCandidate`, `EvidenceRequest`, 데이 검증, 모아 승격 제한 | Done in iteration 15 |
| 근거 요청 처리 API | `module-21` | 데이 상태 변경, AgentRun 감사 이력, 검증 후 `AgendaCandidate` 승격 | Done in iteration 16 |
| AI 실행 큐 모의 실행 | `module-22` | 비용 가드 안에서 실제 호출 전 입력 범위, 토큰, 근거, 감사 기록을 큐로 고정 | Done in iteration 17 |
| 결재 실행 범위 선택 | `module-26` | AI가 검색광고 실행 범위를 제안하고 대표가 그대로 확정하거나 수정값을 저장 | Done in iteration 24 |
| 실행 범위 소급 적용 | `module-27` | 기존 저장 결재안과 대표 결정에 실행 범위 제안/선택값을 백필 | Done in iteration 25 |
| 검색광고 성과 규칙 엔진 | `module-30` | 낮은 전환율, 주문 없는 클릭, 높은 CPA, 기기/시간대 차이, 전환 추적 미확인을 LLM 전 규칙으로 판정하고 그로/데이에 배정 | Done in iteration 28 |

#### Recommended Session Plan

| Session | Phase | Scope | Turns |
|---------|-------|-------|:-----:|
| Session 1 | Do | `--scope module-1` | 25-35 |
| Session 2 | Do | `--scope module-2` | 35-50 |
| Session 3 | Do | `--scope module-3` | 35-45 |
| Session 4 | Do | `--scope module-4` | 35-45 |
| Session 5 | Do | `--scope module-5` | 35-45 |
| Session 6 | Do | `--scope module-6` | 40-60 |
| Session 7 | Check/Act | all MVP modules | 30-40 |
| Session 8 | Act | `--scope module-14` | 10-15 |
| Session 9 | Act | `--scope module-15` | 25-35 |
| Session 10 | Act | `--scope module-16` | 25-35 |
| Session 11 | Act | `--scope module-17` | 25-35 |
| Session 12 | Act | `--scope module-18` | 30-40 |
| Session 13 | Act | `--scope module-22` | Done |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-05-22 | Initial PDCA design document from v0.5 plan, selected Pragmatic Balance architecture, defined domain/API/UI/test/session contracts | Codex |
| 0.2 | 2026-05-23 | Added provider evidence expansion order and module map for ad settings, performance breakdown, commerce quality, DataLab segments, and commerce analytics | Codex |
| 0.3 | 2026-05-23 | Added LLM free exploration, evidence request, verified promotion guard, and people-office role model UI module | Codex |
| 0.4 | 2026-05-23 | Added AI execution queue dry-run contract, API, and AgentRun audit boundary before live LLM adapter | Codex |
| 0.5 | 2026-05-23 | Added owner-editable AI execution scope proposal contract for search ad approvals | Codex |
| 0.6 | 2026-05-23 | Added execution scope backfill API for saved approvals and decisions | Codex |
| 0.7 | 2026-05-23 | Added Search Ad performance rule engine contract and character assignment before LLM judgment | Codex |
