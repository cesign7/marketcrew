import type { EvidenceRequestStatus } from "@/lib/domain";

export type CharacterTone = "coordinator" | "growth" | "product" | "copy" | "crm" | "finance" | "data";

export type CharacterStatus = {
  id: string;
  name: string;
  role: string;
  tone: CharacterTone;
  status: string;
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
  state: "대기" | "실행됨" | "차단됨";
  note: string;
};

export type OutcomeCheckpointView = {
  id: string;
  title: string;
  metric: string;
  status: "준비" | "관찰 중" | "판단 예정";
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
  provenance: {
    summaryLabel: string;
    evidenceLabels: string[];
    agentRunLabels: string[];
    providerEvidenceLabels: string[];
    checkpointLabels: string[];
    safetyLabels: string[];
  };
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
  executionStateLabel: "실행됨" | "수동 처리 필요" | "차단됨" | "대기";
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
  providerKeys: Array<ProviderDataContractView["providerKey"] | "commerce_cross_channel">;
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

export type ProductGrowthOpportunityView = {
  id: string;
  owner: string;
  kindLabel: string;
  confidenceLabel: string;
  title: string;
  targetLabel: string;
  summary: string;
  keywords: string[];
  evidenceLabels: string[];
  nextAction: string;
  guardrail: string;
  sourceReportIds: string[];
};

export type AiEvidenceBriefView = {
  id: string;
  providerKey: "search_ad" | "datalab" | "smartstore" | "shop" | "commerce_cross_channel";
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
  agentRunSummary: AgentRunSummaryView;
  productGrowthOpportunities: ProductGrowthOpportunityView[];
  aiEvidenceBriefs: AiEvidenceBriefView[];
  evidenceRequestQueue: EvidenceRequestQueueView;
  executionResults: ExecutionResultView[];
  outcomeCheckpoints: OutcomeCheckpointView[];
};
