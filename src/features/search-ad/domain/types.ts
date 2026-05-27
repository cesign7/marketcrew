export type BrandKey = "coffeeprint" | "stickersee";
export type BrandFilter = "all" | BrandKey;

export type AdProductType = "powerlink" | "shopping_search";
export type AdProductFilter = "all" | AdProductType;

export type SearchAdReportType =
  | "AD"
  | "AD_DETAIL"
  | "AD_CONVERSION"
  | "AD_CONVERSION_DETAIL"
  | "ADEXTENSION"
  | "EXPKEYWORD"
  | "SHOPPINGKEYWORD_DETAIL"
  | "SHOPPINGKEYWORD_CONVERSION_DETAIL"
  | "CRITERION"
  | "CRITERION_CONVERSION";

export type SearchAdReportStatus = "REGIST" | "RUNNING" | "BUILT" | "NONE" | "ERROR" | "WAITING" | "AGGREGATING";

export type MappingStatus = "mapped" | "unmapped" | "ambiguous";

export type RuleCategory = "low_efficiency" | "high_cpa" | "low_roas" | "no_click" | "good_performance" | "needs_review";

export type RuleSeverity = "low" | "medium" | "high";

export type SearchAdTargetType = "campaign" | "adgroup" | "keyword";

export type SearchAdRequestedAction = "turn_on" | "turn_off";

export type SearchAdActionStatus = "blocked" | "applied" | "failed";

export type SearchAdFilters = {
  brand: BrandFilter;
  adProduct: AdProductFilter;
};

export type SearchAdRuleActionIntent =
  | "data_check"
  | "conversion_check"
  | "negative_keyword"
  | "landing_check"
  | "bid_adjustment"
  | "keyword_expand"
  | "shopping_expand"
  | "targeting_adjustment"
  | "fit_check"
  | "operation_check";

export type RuleActionIntentFilter = "all" | SearchAdRuleActionIntent;

export type SearchAdRuleResultFilters = SearchAdFilters & {
  actionIntent: RuleActionIntentFilter;
};

export type SearchAdReportJobRecord = {
  id: string;
  providerReportJobId: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: SearchAdReportStatus;
  displayName: string;
  downloadUrl?: string;
  syncedAt?: string;
  rowCount: number;
  mappedBrands: BrandKey[];
  parseStatus: "대기" | "완료" | "실패" | "파일 없음";
  summary: SearchAdMetricSummary;
};

export type SearchAdMetricSummary = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  lowEfficiencyCount: number;
  goodPerformanceCount: number;
};

export type SearchAdRawReportRow = {
  id: string;
  reportFileId: string;
  rowNumber: number;
  rawRow: Record<string, string | number | null>;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  mappingStatus: MappingStatus;
};

export type SearchAdNormalizedRow = {
  id: string;
  reportRowId: string;
  reportType: SearchAdReportType;
  brandKey: BrandKey;
  adProductType: AdProductType;
  campaignId?: string;
  campaignName?: string;
  adgroupId?: string;
  adgroupName?: string;
  keywordId?: string;
  keywordText?: string;
  searchTerm?: string;
  adId?: string;
  criterionId?: string;
  extensionId?: string;
  mediaId?: string;
  device?: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  salesAmount: number;
  sourceDate: string;
};

export type SearchAdRuleCriteria = {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  periodDays: number;
  minImpressions: number;
  minClicks: number;
  minCost: number;
  targetCpa: number | null;
  targetRoas: number | null;
  enabled: boolean;
};

export type SearchAdRuleResult = {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  category: RuleCategory;
  targetType: "campaign" | "adgroup" | "keyword" | "search_term" | "ad" | "criterion" | "ad_extension";
  targetId?: string;
  targetLabel: string;
  severity: RuleSeverity;
  periodDays: number;
  reason: string;
  metrics: Record<string, number | string | null>;
  evidencePacket: Record<string, unknown>;
  createdAt: string;
};

export type SearchAdRuleActionTarget = {
  targetType: "campaign" | "adgroup";
  targetId: string;
  targetLabel: string;
};

export type SearchAdRuleResultDetailView = {
  result: SearchAdRuleResult;
  relatedRows: SearchAdNormalizedRow[];
  actionTarget?: SearchAdRuleActionTarget;
};

export type SearchAdStateRecord = {
  id: string;
  targetType: SearchAdTargetType;
  providerId: string;
  parentProviderId?: string;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  name: string;
  userLock: boolean | null;
  status?: string;
  statusReason?: string;
  bidAmount?: number | null;
  dailyBudget?: number | null;
  collectedAt: string;
};

export type SearchAdTargetSettingRecord = {
  id: string;
  providerTargetId: string;
  ownerId: string;
  ownerName?: string;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  targetType: string;
  targetTypeLabel: string;
  settingLabel: string;
  collectedAt: string;
};

export type SearchAdStateView = {
  filters: SearchAdFilters;
  syncStatus: SearchAdOperationsView["syncStatus"];
  campaigns: SearchAdStateRecord[];
  adgroups: SearchAdStateRecord[];
  keywords: SearchAdStateRecord[];
  targetSettings: SearchAdTargetSettingRecord[];
};

export type SearchAdSearchTermsView = {
  filters: SearchAdFilters;
  rows: SearchAdNormalizedRow[];
  ruleResults: SearchAdRuleResult[];
};

export type SearchAdKeywordCleanupRecommendation = "keep" | "pause_candidate" | "delete_candidate" | "review";

export type SearchAdKeywordCleanupCandidate = {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  keywordId: string;
  keywordText: string;
  normalizedKeyword: string;
  campaignId?: string;
  campaignName?: string;
  adgroupId?: string;
  adgroupName?: string;
  userLock: boolean | null;
  status?: string;
  statusReason?: string;
  bidAmount?: number | null;
  collectedAt: string;
  impressions365: number;
  clicks365: number;
  cost365: number;
  conversions365: number;
  salesAmount365: number;
  dataDays: number;
  reportStartDate?: string;
  reportEndDate?: string;
  recommendation: SearchAdKeywordCleanupRecommendation;
  recommendationLabel: string;
  reason: string;
};

export type SearchAdDuplicateKeywordGroup = {
  id: string;
  brandKey: BrandKey;
  adProductType: AdProductType;
  keywordText: string;
  normalizedKeyword: string;
  duplicateCount: number;
  activeCount: number;
  totalClicks365: number;
  totalCost365: number;
  bestKeywordId?: string;
  recommendationSummary: string;
  candidates: SearchAdKeywordCleanupCandidate[];
};

export type SearchAdKeywordCleanupView = {
  filters: SearchAdFilters;
  generatedAt: string;
  summaryCards: Array<{
    key: string;
    label: string;
    value: string;
    helper: string;
  }>;
  duplicateGroups: SearchAdDuplicateKeywordGroup[];
  noClickCandidates: SearchAdKeywordCleanupCandidate[];
  coverageSummaries: Array<{
    brandKey: BrandKey;
    adProductType: AdProductType;
    startDate?: string;
    endDate?: string;
    actualDays: number;
    label: string;
  }>;
};

export type SearchAdActionPreview = {
  id: string;
  targetType: SearchAdTargetType;
  targetId: string;
  targetLabel: string;
  requestedAction: SearchAdRequestedAction;
  beforeState: {
    userLock: boolean | null;
    status?: string;
    statusReason?: string;
  };
  afterState: {
    userLock: boolean;
  };
  impactSummary: {
    expectedEffect: string;
    affectedChildren: number;
    recentCost: number;
    recentClicks: number;
    recentConversions: number;
  };
  writeGateOpen: boolean;
  createdAt: string;
};

export type SearchAdActionLog = {
  id: string;
  previewId: string;
  targetLabel: string;
  actionLabel: string;
  status: SearchAdActionStatus;
  reason: string;
  createdAt: string;
};

export type SearchAdActionLogsView = {
  previews: SearchAdActionPreview[];
  logs: SearchAdActionLog[];
};

export type SearchAdOperationsView = {
  filters: SearchAdFilters;
  syncStatus: {
    lastReportSyncAt: string | null;
    lastStateSyncAt: string | null;
    hasSearchAdCredentials: boolean;
    searchAdWriteEnabled: boolean;
    repositoryMode: "db" | "sample";
    reportSchedule: SearchAdReportScheduleStatus;
  };
  summaryCards: Array<{
    key: string;
    label: string;
    value: string;
    helper: string;
  }>;
  brandSummaries: Array<{
    brandKey: BrandKey;
    brandLabel: string;
    reportCount: number;
    lowEfficiencyCount: number;
    goodPerformanceCount: number;
    recentCost: number;
  }>;
  recentRuleResults: SearchAdRuleResult[];
  recentReports: SearchAdReportJobRecord[];
  pendingActions: Array<{
    id: string;
    targetLabel: string;
    actionLabel: string;
    statusLabel: string;
  }>;
};

export type SearchAdReportScheduleStatus = {
  nextRunAt: string;
  nextRunLabel: string;
  nextRunPurpose: string;
  primaryRunLabel: string;
  reportTypeCount: number;
  retryRunLabel: string;
  targetStatDate: string;
  timezone: "Asia/Seoul";
};

export type SearchAdRuleResultsView = {
  filters: SearchAdRuleResultFilters;
  results: SearchAdRuleResult[];
};

export type SearchAdReportArchiveView = {
  filters: SearchAdFilters;
  reports: SearchAdReportJobRecord[];
  syncStatus: SearchAdOperationsView["syncStatus"];
};

export type SearchAdReportDetailView = {
  report: SearchAdReportJobRecord;
  summary: SearchAdMetricSummary & {
    cpa: number | null;
    roas: number | null;
  };
  easyRows: SearchAdNormalizedRow[];
  rawPreviewRows: SearchAdRawReportRow[];
  columnDescriptions: Array<{
    field: string;
    label: string;
    description: string;
  }>;
  problemCandidates: SearchAdRuleResult[];
  goodCandidates: SearchAdRuleResult[];
};

export type SearchAdApiErrorCode =
  | "BACKEND_UNAVAILABLE"
  | "SEARCH_AD_CREDENTIALS_MISSING"
  | "SEARCH_AD_DATABASE_MISSING"
  | "SEARCH_AD_REQUEST_FAILED"
  | "SEARCH_AD_REPORT_DOWNLOAD_FAILED"
  | "SEARCH_AD_REPORT_PARSE_FAILED"
  | "SEARCH_AD_REPORT_NOT_FOUND";
