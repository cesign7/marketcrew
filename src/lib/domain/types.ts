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
export type PreflightStatus = "PASSED" | "BLOCKED";
export type PreflightCheckStatus = "PASS" | "WARN" | "BLOCK";
export type OutcomeState = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "INCONCLUSIVE";

export type ProviderSource = "sample" | "smartstore" | "search_ad" | "shop" | "calendar" | "datalab";
export type ProviderKey = "search_ad" | "datalab" | "smartstore" | "shop" | "llm";
export type ProviderReadinessStatus = "READY" | "READ_ONLY_READY" | "MISSING_CONFIG" | "WRITE_DISABLED" | "BLOCKED";
export type ProviderSyncStatus = "SKIPPED_MISSING_CONFIG" | "READY_READ_ONLY" | "SYNCED" | "FAILED";
export type HypothesisStatus = "WAITING_EVIDENCE" | "VERIFIED" | "REJECTED" | "PROMOTED";
export type EvidenceRequestStatus = "REQUESTED" | "COLLECTING" | "VERIFIED" | "INSUFFICIENT";
export type EvidenceSourceKind = "search_ad" | "smartstore" | "shop" | "datalab" | "internal";

export interface ProviderReadinessReport {
  provider: ProviderKey;
  label: string;
  status: ProviderReadinessStatus;
  canRead: boolean;
  canWrite: boolean;
  readScope: string;
  writeScope: string;
  missingEnvKeys: string[];
  checkedAt: string;
  sourceUrl: string;
  evidenceNotes: string[];
  requiredHeaders?: string[];
  disabledReason?: string;
}

export interface ProviderSyncReport {
  id: string;
  provider: Exclude<ProviderKey, "llm">;
  label: string;
  status: ProviderSyncStatus;
  readOnly: true;
  networkAttempted: boolean;
  writeAttempted: false;
  endpoint: string;
  sourceUrl: string;
  missingEnvKeys: string[];
  evidenceNotes: string[];
  checkedAt: string;
  httpStatus?: number;
  failureReason?: string;
  keywordDemandSnapshots?: KeywordDemandSnapshot[];
  searchTrendSnapshots?: SearchTrendSnapshot[];
  commerceAggregateSnapshot?: CommerceAggregateSnapshot;
  shopAggregateSnapshot?: ShopAggregateSnapshot;
  generatedSignal?: Signal;
  historyPolicy?: ProviderHistoryPolicy;
}

export interface ProviderHistoryPolicy {
  provider: Exclude<ProviderKey, "llm">;
  apiLimitLabel: string;
  requestWindowLabel: string;
  backfillLabel: string;
  dailySnapshotLabel: string;
  seasonalityLabel: string;
  storageLabel: string;
  costGuardLabel: string;
  baseScheduleLabel: string;
  intensiveScheduleLabel: string;
  manualRefreshLabel: string;
  freshnessLabel: string;
  dedupeKeyLabel: string;
  sourceUrl: string;
}

export interface CommerceAggregateSnapshot {
  id: string;
  provider: "naver_commerce";
  brandKey: string;
  windowDays: number;
  paidOrderCount: number;
  grossSales: number;
  topProductName?: string;
  dataSolutionAvailable: boolean;
  collectedAt: string;
  dataScope: "aggregate_only";
}

export interface ShopAggregateSnapshot {
  id: string;
  provider: "youngcart_bridge";
  brandKey: string;
  windowDays: number;
  orderCount: number;
  repeatCustomerCount: number;
  grossSales: number;
  averageOrderValue: number;
  collectedAt: string;
  dataScope: "aggregate_only";
}

export interface LlmPlannerInput {
  id: string;
  generatedAt: string;
  source: "signal_summary";
  rawRowsIncluded: false;
  candidateSummaries: Array<{
    approvalRequestId: string;
    title: string;
    owner: CharacterKey | "unknown";
    status: ApprovalRequest["status"];
    confidence: DataConfidence;
    riskLevel: RiskLevel;
    summary: string;
    evidenceIds: string[];
  }>;
  constraints: {
    privacy: "aggregate_only";
    maxCandidates: number;
    externalWriteAllowed: false;
  };
}

export interface LlmPlannerResult {
  id: string;
  mode: "deterministic_fallback" | "llm_ready";
  title: string;
  summary: string;
  recommendedApprovalIds: string[];
  evidenceIds: string[];
  rawRowsIncluded: false;
  tokenEstimate: number;
  createdAt: string;
}

export interface LlmPlannerAuditRun {
  id: string;
  runnerKey: "moa_planner";
  plannerInputId: string;
  plannerResultId: string;
  mode: LlmPlannerResult["mode"];
  provider: string;
  model: string;
  tokenUsage: {
    inputEstimate: number;
    outputEstimate: number;
    totalEstimate: number;
    rawRowsIncluded: boolean;
  };
  billing: {
    state: "NOT_BILLED_FALLBACK" | "ESTIMATED_ONLY";
    estimatedCostKrw: number;
    basis: string;
  };
  sourceCounts: {
    candidateSummaries: number;
    selectedApprovals: number;
    evidenceIds: number;
    providerEvidenceNotes: number;
  };
  evidenceIds: string[];
  createdAt: string;
}

export type AgentRunType =
  | "moa_planner"
  | "provider_sync"
  | "provider_signal_agenda"
  | "evidence_request_review"
  | "owner_decision"
  | "mock_execution"
  | "outcome_analysis";

export type AgentRunMode = "deterministic_fallback" | "llm" | "provider_read_only" | "mock_execution";
export type AgentRunProvider = "deterministic" | "openai" | "gemini" | "naver" | "youngcart" | "sample" | "local";
export type AgentRunStatus = "SUCCEEDED" | "FAILED" | "SKIPPED";

export type WorkflowObjectType =
  | "signal"
  | "agenda_candidate"
  | "hypothesis_candidate"
  | "evidence_request"
  | "character_report"
  | "moa_synthesis_report"
  | "approval_request"
  | "owner_decision"
  | "preflight_check"
  | "execution_result"
  | "performance_checkpoint"
  | "outcome_report"
  | "provider_sync_report"
  | "follow_up_internal_task";

export type AgentRunWorkflowRelation = "generated" | "used_as_evidence" | "decided" | "executed" | "measured";

export interface AgentRunTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
  estimatedCostKrw: number;
  basis: string;
}

export interface AgentRun {
  id: string;
  runnerKey: string;
  runType: AgentRunType;
  mode: AgentRunMode;
  provider: AgentRunProvider;
  model: string;
  status: AgentRunStatus;
  inputSummary: string;
  outputSummary: string;
  rawRowsIncluded: false;
  tokenUsage: AgentRunTokenUsage;
  evidenceIds: string[];
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface AiBudgetSettings {
  monthlyBudgetKrw: number;
  dailyBudgetKrw: number;
  runBudgetKrw: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
  krwPerUsd: number;
  memo: string;
  updatedAt: string;
}

export interface AiCharacterProfileSettings {
  id: CharacterKey;
  name: string;
  departmentRole: string;
  provider: AgentRunProvider;
  model: string;
  roleModel: string;
  responsibility: string;
  outputContract: string;
  monthlyReviewRule: string;
  updatedAt: string;
}

export interface AiOperationsSettings {
  id: "default";
  budget: AiBudgetSettings;
  characterProfiles: AiCharacterProfileSettings[];
  updatedAt: string;
}

export interface WorkflowObjectRef {
  objectType: WorkflowObjectType;
  objectId: string;
}

export interface AgentRunWorkflowLink extends WorkflowObjectRef {
  id: string;
  agentRunId: string;
  relation: AgentRunWorkflowRelation;
  createdAt: string;
}

export interface MarketingCalendarEvent {
  id: string;
  name: string;
  eventType: "solar" | "lunar";
  lunarMonth?: number;
  lunarDay?: number;
  solarMonth?: number;
  solarDay?: number;
  yearlySolarDate?: string;
  yearlySolarDates?: Record<number, string>;
  windowStartOffsetDays: number;
  windowEndOffsetDays: number;
  tags: string[];
}

export interface DateWindow {
  startDate: string;
  endDate: string;
  anchorDate: string;
}

export interface EventComparisonWindow {
  eventId: string;
  eventName: string;
  eventType: MarketingCalendarEvent["eventType"];
  currentYear: number;
  baselineYear: number;
  current: DateWindow;
  baseline: DateWindow;
}

export interface Signal {
  id: string;
  source: ProviderSource;
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
  stopConditions: Array<{
    metric: "CPA" | "ROAS" | "SPEND" | "STOCK" | "MARGIN";
    operator: ">" | "<";
    value: number;
    durationDays?: number;
  }>;
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

export interface HypothesisCandidate {
  id: string;
  character: CharacterKey;
  title: string;
  hypothesis: string;
  reasonFromKnownSignals: string[];
  requestedEvidenceIds: string[];
  status: HypothesisStatus;
  promotedAgendaCandidateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceRequest {
  id: string;
  hypothesisId: string;
  requestedBy: CharacterKey;
  verifier: "day";
  neededSource: EvidenceSourceKind;
  neededFields: string[];
  comparisonWindow: string;
  reason: string;
  status: EvidenceRequestStatus;
  verificationNote?: string;
  verifiedEvidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterReport {
  id: string;
  character: CharacterKey;
  title: string;
  summary: string;
  agendaCandidateIds: string[];
  evidenceIds: string[];
  createdAt: string;
}

export interface MoaSynthesisReport {
  id: string;
  title: string;
  summary: string;
  characterReportIds: string[];
  approvalRequestIds: string[];
  createdAt: string;
}

export interface MeasurementPlan {
  baselineWindow: DateWindow;
  checkpoints: Array<{ label: string; dueDate: string }>;
  metrics: Array<"CTR" | "CVR" | "CPA" | "ROAS" | "SPEND" | "SALES" | "MARGIN" | "STOCK">;
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
}

export interface ApprovalRequest {
  id: string;
  title: string;
  moaSynthesisReportId: string;
  evidenceSummary: string;
  evidenceIds: string[];
  dataConfidence: DataConfidence;
  riskLevel: RiskLevel;
  executionPlan: ExecutionPlan;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HELD" | "NEEDS_REVISION" | "NEEDS_EVIDENCE";
  createdAt: string;
}

export interface OwnerDecision {
  id: string;
  approvalRequestId: string;
  decision: OwnerDecisionType;
  memo: string;
  actor: "owner";
  decidedAt: string;
}

export interface PreflightCheck {
  id: string;
  approvalRequestId: string;
  status: PreflightStatus;
  checks: Array<{
    code:
      | "APPROVAL_PENDING"
      | "DATA_CONFIDENCE"
      | "ROLLBACK_READY"
      | "MEASUREMENT_READY"
      | "SECOND_CONFIRMATION"
      | "WRITE_GATE";
    label: string;
    status: PreflightCheckStatus;
    message: string;
  }>;
  blockingReasons: string[];
  warnings: string[];
  checkedAt: string;
}

export interface ExecutionResult {
  id: string;
  approvalRequestId: string;
  state: "APPLIED" | "PARTIALLY_APPLIED" | "FAILED" | "NEEDS_MANUAL_ACTION" | "ROLLED_BACK";
  appliedOperations: string[];
  failedOperations: Array<{ operation: string; reason: string; retryable: boolean }>;
  createdAt: string;
}

export interface PerformanceCheckpoint {
  id: string;
  approvalRequestId: string;
  title: string;
  dueDate: string;
  metrics: MeasurementPlan["metrics"];
  status: "PENDING" | "READY_TO_REVIEW" | "COMPLETED";
  createdAt: string;
}

export interface OutcomeReport {
  id: string;
  approvalRequestId: string;
  executionResultId?: string;
  state: OutcomeState;
  summary: string;
  baselineSummary: string;
  checkpointSummary: string;
  evidenceIds?: string[];
  evidenceLabels?: string[];
  sourceReportIds?: string[];
  followUpAgendaTitle?: string;
  createdAt: string;
}

export interface FollowUpInternalTask {
  id: string;
  sourceApprovalRequestId: string;
  assignedCharacter: CharacterKey;
  title: string;
  status: "OPEN" | "DONE";
  createdAt: string;
}
