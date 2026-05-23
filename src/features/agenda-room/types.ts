import type { CharacterKey, EvidenceRequestStatus } from "@/lib/domain";
import type { LlmDryRunQueue } from "@/lib/application/llm-dry-run-queue";
import type { CharacterAvailability } from "@/features/characters/keyword-pilot";

export type CharacterTone = "coordinator" | "growth" | "product" | "copy" | "crm" | "finance" | "data";

export type CharacterStatus = {
  id: CharacterKey;
  name: string;
  role: string;
  tone: CharacterTone;
  status: string;
  availability: CharacterAvailability;
  availabilityLabel: string;
  workloadFormulaLabel: string;
  workload: number;
  queueCount: number;
};

export type AgendaStatus = "승인 대기" | "근거 보강" | "실패 확인" | "성과 관찰";
export type InboxBucketTone = "approval" | "season" | "tracking" | "evidence" | "hold" | "failure";

export type InboxBucketView = {
  id:
    | "TODAY_APPROVAL"
    | "SEASONAL_KEYWORD_REVIEW"
    | "TRACKING_OUTCOME"
    | "WAITING_EVIDENCE"
    | "AUTO_HOLD"
    | "FAILED_EXECUTION";
  label: string;
  description: string;
  count: number;
  tone: InboxBucketTone;
};

export type AgendaCardView = {
  id: string;
  owner: string;
  status: AgendaStatus;
  title: string;
  source: string;
  signal: string;
  decision: string;
  expectedImpact: string;
  risk: string;
  applyScope: string;
  evidenceCount: number;
  createdAt: string;
};

export type SeasonalKeywordPlanView = {
  id: string;
  eventName: string;
  calendarBasis: "양력" | "음력";
  comparisonWindow: string;
  keywords: string[];
  proposal: string;
  budgetGuardrail: string;
  nextAction: string;
};

export type ExecutionResultView = {
  id: string;
  title: string;
  state: "대기" | "실행됨" | "내부 초안" | "차단됨";
  note: string;
};

export type OutcomeCheckpointView = {
  id: string;
  title: string;
  metric: string;
  status: "준비" | "관찰 중" | "판단 예정";
};

export type ExecutionScopeProposalView = {
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
  guardrailLabels: string[];
};

export type ApprovalPreviewView = {
  id: string;
  title: string;
  statusLabel: string;
  confidenceLabel: string;
  riskLabel: string;
  evidenceSummary: string;
  diffSummary: string;
  beforeItems: string[];
  afterItems: string[];
  rollbackPlan: string;
  measurementLabels: string[];
  executorLabel: string;
  writeGateLabel: string;
  primaryActionLabel: string;
  secondaryActions: string[];
  disabledReason?: string;
  executionScopeProposal?: ExecutionScopeProposalView;
  provenance: {
    summaryLabel: string;
    evidenceLabels: string[];
    agentRunLabels: string[];
    providerEvidenceLabels: string[];
    checkpointLabels: string[];
    safetyLabels: string[];
  };
};

export type WorkDeskCardView = {
  id: string;
  ownerId: CharacterKey;
  ownerName: string;
  parentTitle: string;
  title: string;
  brandLabel: string;
  domainLabel: string;
  statusLabel: string;
  priorityLabel: string;
  routeLabel: string;
  keywordLabel: string;
  contextLabels: string[];
  metricLabels: string[];
  diagnosisLabel: string;
  recommendedActionLabel: string;
  reasonLabel: string;
  evidenceLabels: string[];
  detailHref?: string;
  delegation: {
    state: "OWNER_FIRST_APPROVAL_REQUIRED" | "MOA_DELEGATION_CANDIDATE" | "MOA_REPORT_ONLY" | "NEEDS_DATA_REVIEW";
    label: string;
    summary: string;
    ruleHint: string;
    reportLabel: string;
  };
};

export type KeywordPerformanceRowTone = "good" | "warning" | "danger" | "neutral";

export type KeywordPerformanceRowView = {
  id: string;
  keyword: string;
  brandLabel: string;
  scopeLabel: string;
  conversionRateLabel: string;
  clicksLabel: string;
  ordersLabel: string;
  costLabel: string;
  cpaLabel: string;
  roasLabel: string;
  noteLabel: string;
  tone: KeywordPerformanceRowTone;
  evidenceLabels: string[];
};

export type KeywordPerformanceSegmentView = {
  id: string;
  keyword: string;
  brandLabel: string;
  segmentLabel: string;
  conversionRateLabel: string;
  clicksLabel: string;
  ordersLabel: string;
  costLabel: string;
  cpaLabel: string;
  noteLabel: string;
  tone: KeywordPerformanceRowTone;
};

export type ShoppingSearchTermView = {
  id: string;
  searchKeyword: string;
  brandLabel: string;
  productName: string;
  productImageUrl: string;
  productImageAlt: string;
  campaignLabel: string;
  directConversionRateLabel: string;
  clicksLabel: string;
  costLabel: string;
  landingFitLabel: string;
  noteLabel: string;
  tone: KeywordPerformanceRowTone;
};

export type KeywordRecommendationEvidenceView = {
  id: string;
  title: string;
  sourceLabel: string;
  summary: string;
  evidenceLabels: string[];
  sourceDetailLabel?: string;
};

export type KeywordRecommendationCandidateView = {
  id: string;
  keyword: string;
  brandLabel: string;
  sourceLabel: string;
  reasonLabel: string;
  evidenceLabels: string[];
};

export type KeywordPerformanceDashboardView = {
  title: string;
  summaryLabel: string;
  sourceLabel: string;
  updatedAtLabel: string;
  qualityGuardLabel: string;
  minimumCriteriaLabels: string[];
  topConversionKeywords: KeywordPerformanceRowView[];
  lowConversionKeywords: KeywordPerformanceRowView[];
  wasteKeywords: KeywordPerformanceRowView[];
  deviceSegments: KeywordPerformanceSegmentView[];
  timeSegments: KeywordPerformanceSegmentView[];
  shoppingSearchTerms: ShoppingSearchTermView[];
  recommendationKeywords: KeywordRecommendationCandidateView[];
  recommendationEvidence: KeywordRecommendationEvidenceView[];
};

export type OwnerDecisionFlowView = {
  id: string;
  title: string;
  decisionLabel: string;
  memo: string;
  preflightStatusLabel: string;
  preflightChecks: Array<{
    label: string;
    status: "통과" | "주의" | "차단";
    message: string;
  }>;
  executionStateLabel: "실행됨" | "내부 초안 기록됨" | "수동 처리 필요" | "차단됨" | "대기";
  executionNote: string;
  outcomeStateLabel: string;
  outcomeSummary: string;
  outcomeEvidenceLabels: string[];
  followUpTasks: string[];
};

export type ProviderReadinessView = {
  id: string;
  label: string;
  statusLabel: string;
  tone: "ready" | "warning" | "blocked";
  canReadLabel: string;
  canWriteLabel: string;
  readScope: string;
  writeScope: string;
  missingEnvKeys: string[];
  notes: string[];
  sourceUrl: string;
};

export type ProviderSyncEvidenceView = {
  id: string;
  label: string;
  providerKey: "search_ad" | "datalab" | "smartstore" | "shop";
  providerGroup: "ad" | "trend" | "commerce";
  channelKey: string;
  channelLabel: string;
  brandLabel?: string;
  providerLabel: string;
  statusLabel: string;
  tone: "ready" | "warning" | "blocked";
  checkedAt: string;
  endpointLabel: string;
  httpStatusLabel: string;
  readOnlyLabel: string;
  networkLabel: string;
  writeLabel: string;
  evidenceCountLabel: string;
  snapshotLabels: string[];
  missingEnvKeys: string[];
  notes: string[];
  failureReason?: string;
  sourceUrl: string;
  historyPolicy: {
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
  };
};

export type ProviderDataContractView = {
  providerKey: ProviderSyncEvidenceView["providerKey"];
  providerLabel: string;
  channelKey: string;
  channelLabel: string;
  brandLabel?: string;
  sourceUrl: string;
  incoming: ProviderDataContractDatasetView;
  stored: ProviderDataContractDatasetView;
};

export type ProviderDataContractDatasetView = {
  id: string;
  title: string;
  description: string;
  safetyNote: string;
  columns: Array<{
    key: string;
    label: string;
    description: string;
    sample: string;
  }>;
  sampleRows: Array<{
    id: string;
    values: Array<{
      key: string;
      label: string;
      value: string;
    }>;
  }>;
  sourceFieldGroups?: Array<{
    id: string;
    title: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      handling: string;
    }>;
  }>;
};

export type ProviderEvidenceExpansionPlanView = {
  id: string;
  phaseLabel: string;
  priorityLabel: string;
  providerKeys: ProviderDataContractView["providerKey"][];
  title: string;
  summary: string;
  evidenceToAdd: string[];
  judgmentExamples: string[];
  acceptanceChecks: string[];
  sourceLabel: string;
  sourceUrl: string;
};

export type PlannerPreviewView = {
  title: string;
  modeLabel: string;
  summary: string;
  selectedAgendaIds: string[];
  evidenceIds: string[];
  tokenEstimateLabel: string;
  rawRowsLabel: string;
  constraints: string[];
  audit: {
    runId: string;
    inputId: string;
    resultId: string;
    providerLabel: string;
    modelLabel: string;
    tokenUsageLabel: string;
    billingLabel: string;
    sourceCountLabels: string[];
    evidenceTraceLabel: string;
  };
};

export type LlmCostGovernanceView = {
  statusLabel: string;
  tone: "ready" | "warning" | "blocked";
  liveCallAllowed: boolean;
  providerLabel: string;
  modelLabel: string;
  credentialLabel: string;
  modeLabel: string;
  estimatedRunCostLabel: string;
  dailySpentLabel: string;
  dailyBudgetLabel: string;
  dailyRemainingLabel: string;
  monthlySpentLabel: string;
  monthlyBudgetLabel: string;
  monthlyRemainingLabel: string;
  runBudgetLabel: string;
  rateBasisLabel: string;
  officialPricingSourceLabel: string;
  pricingFormulaLabel: string;
  officialPricingRows: Array<{
    modelKey: string;
    modelLabel: string;
    roleLabel: string;
    tierLabel: string;
    inputPriceLabel: string;
    outputPriceLabel: string;
    cachePriceLabel: string;
    sourceLabel: string;
    sourceUrl: string;
    tone: "active" | "reference" | "missing";
    note: string;
  }>;
  plannedTokenLabels: string[];
  decisionSummary: string;
  gateChecks: Array<{
    id: string;
    label: string;
    statusLabel: string;
    tone: "ready" | "warning" | "blocked";
    message: string;
  }>;
};

export type LlmDryRunQueueView = LlmDryRunQueue;

export type AiPilotInsightView = {
  title: string;
  statusLabel: string;
  tone: "ready" | "waiting" | "blocked";
  summary: string;
  modelLabel: string;
  tokenCostLabel: string;
  evidenceLabel: string;
  finishedAtLabel: string;
  inputPolicyLabels: string[];
  recommendedApprovalLabels: string[];
  evidenceCategoryLabels: string[];
};

export type ProductGrowthOpportunityView = {
  id: string;
  owner: string;
  kindLabel: string;
  confidenceLabel: string;
  title: string;
  targetLabel: string;
  productImageUrl: string;
  productImageAlt: string;
  summary: string;
  keywords: string[];
  evidenceLabels: string[];
  nextAction: string;
  guardrail: string;
  sourceReportIds: string[];
};

export type AiEvidenceBriefView = {
  id: string;
  providerKey: "search_ad" | "datalab" | "smartstore" | "shop";
  channelLabel: string;
  title: string;
  decisionLabel: string;
  tone: "ready" | "warning" | "blocked";
  summary: string;
  allowedUseCases: string[];
  blockedUseCases: string[];
  evidenceIds: string[];
  sourceReportIds: string[];
  checkedAt: string;
  rawDataPolicyLabel: string;
};

export type EvidenceRequestQueueView = {
  title: string;
  summaryLabel: string;
  guardrailLabel: string;
  openRequestCount: number;
  verifiedHypothesisCount: number;
  items: Array<{
    id: string;
    requestStatus?: EvidenceRequestStatus;
    title: string;
    ownerName: string;
    verifierName: string;
    statusLabel: string;
    tone: "waiting" | "ready" | "blocked";
    hypothesis: string;
    requestedFields: string[];
    comparisonWindow: string;
    reason: string;
    promotionLabel: string;
    evidenceLabels: string[];
  }>;
};

export type AgentRunSummaryView = {
  totalRuns: number;
  totalTokensLabel: string;
  estimatedCostLabel: string;
  statusCountLabels: string[];
  recentRuns: Array<{
    id: string;
    runnerLabel: string;
    statusLabel: string;
    modelLabel: string;
    tokenLabel: string;
    costLabel: string;
    evidenceLabel: string;
    finishedAt: string;
  }>;
};

export type AgendaRoomViewModel = {
  generatedAt: string;
  moaReport: {
    title: string;
    summary: string;
    reportCount: number;
  };
  summary: {
    waitingApproval: number;
    waitingEvidence: number;
    readyToApply: number;
    failedExecutions: number;
  };
  inboxBuckets: InboxBucketView[];
  characters: CharacterStatus[];
  workDeskCards: WorkDeskCardView[];
  keywordPerformanceDashboard: KeywordPerformanceDashboardView;
  agendaCards: AgendaCardView[];
  seasonalKeywordPlans: SeasonalKeywordPlanView[];
  approvalPreviews: ApprovalPreviewView[];
  ownerDecisionFlows: OwnerDecisionFlowView[];
  providerDataContracts: ProviderDataContractView[];
  providerEvidenceExpansionPlans: ProviderEvidenceExpansionPlanView[];
  providerReadiness: ProviderReadinessView[];
  providerSyncEvidence: ProviderSyncEvidenceView[];
  plannerPreview: PlannerPreviewView;
  llmCostGovernance: LlmCostGovernanceView;
  llmDryRunQueue: LlmDryRunQueueView;
  aiPilotInsight: AiPilotInsightView;
  agentRunSummary: AgentRunSummaryView;
  productGrowthOpportunities: ProductGrowthOpportunityView[];
  aiEvidenceBriefs: AiEvidenceBriefView[];
  evidenceRequestQueue: EvidenceRequestQueueView;
  executionResults: ExecutionResultView[];
  outcomeCheckpoints: OutcomeCheckpointView[];
};
