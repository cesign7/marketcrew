import { getReportTypeLabel } from "./reportTypes";
import { getRuleResultActionIntentKey } from "./ruleActionIntents";
import type {
  SearchAdFilters,
  SearchAdActionLog,
  SearchAdActionLogsView,
  SearchAdActionPreview,
  SearchAdNormalizedRow,
  SearchAdOperationsView,
  SearchAdRawReportRow,
  SearchAdReportArchiveView,
  SearchAdReportDetailView,
  SearchAdReportJobRecord,
  SearchAdRuleCriteria,
  SearchAdRuleResult,
  SearchAdRuleResultFilters,
  SearchAdSearchTermsView,
  SearchAdStateRecord,
  SearchAdStateView,
} from "./types";

export const DEFAULT_SEARCH_AD_FILTERS: SearchAdFilters = {
  brand: "all",
  adProduct: "all",
};

export const DEFAULT_SEARCH_AD_RULE_RESULT_FILTERS: SearchAdRuleResultFilters = {
  ...DEFAULT_SEARCH_AD_FILTERS,
  actionIntent: "all",
};

export const SAMPLE_REPORTS: SearchAdReportJobRecord[] = [
  {
    id: "report-sample-expkeyword-2026-05-25",
    providerReportJobId: "177442248",
    reportType: "EXPKEYWORD",
    statDate: "2026-05-25",
    status: "BUILT",
    displayName: getReportTypeLabel("EXPKEYWORD"),
    downloadUrl: "/report-download?authtoken=sample&fileVersion=1",
    syncedAt: "2026-05-26T03:39:46+09:00",
    rowCount: 3,
    mappedBrands: ["coffeeprint", "stickersee"],
    parseStatus: "완료",
    summary: {
      impressions: 6200,
      clicks: 164,
      cost: 152340,
      conversions: 5,
      salesAmount: 418000,
      lowEfficiencyCount: 2,
      goodPerformanceCount: 1,
    },
  },
  {
    id: "report-sample-shopping-keyword-2026-05-25",
    providerReportJobId: "177433051",
    reportType: "SHOPPINGKEYWORD_DETAIL",
    statDate: "2026-05-25",
    status: "BUILT",
    displayName: getReportTypeLabel("SHOPPINGKEYWORD_DETAIL"),
    downloadUrl: "/report-download?authtoken=sample-shopping&fileVersion=1",
    syncedAt: "2026-05-26T03:38:55+09:00",
    rowCount: 3,
    mappedBrands: ["stickersee"],
    parseStatus: "완료",
    summary: {
      impressions: 4800,
      clicks: 141,
      cost: 116900,
      conversions: 3,
      salesAmount: 186000,
      lowEfficiencyCount: 2,
      goodPerformanceCount: 1,
    },
  },
  {
    id: "report-sample-ad-2026-05-25",
    providerReportJobId: "177426146",
    reportType: "AD",
    statDate: "2026-05-25",
    status: "BUILT",
    displayName: getReportTypeLabel("AD"),
    downloadUrl: "/report-download?authtoken=sample-ad&fileVersion=1",
    syncedAt: "2026-05-26T03:38:17+09:00",
    rowCount: 2,
    mappedBrands: ["coffeeprint", "stickersee"],
    parseStatus: "완료",
    summary: {
      impressions: 11000,
      clicks: 305,
      cost: 269240,
      conversions: 8,
      salesAmount: 604000,
      lowEfficiencyCount: 1,
      goodPerformanceCount: 1,
    },
  },
];

export const SAMPLE_NORMALIZED_ROWS: SearchAdNormalizedRow[] = [
  {
    id: "row-1",
    reportRowId: "raw-1",
    reportType: "EXPKEYWORD",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    campaignName: "커피프린트_파워링크",
    adgroupName: "봉투/포장 인쇄",
    keywordText: "종이컵인쇄",
    searchTerm: "소량 종이컵 제작",
    impressions: 1800,
    clicks: 42,
    cost: 38200,
    conversions: 0,
    salesAmount: 0,
    sourceDate: "2026-05-25",
  },
  {
    id: "row-2",
    reportRowId: "raw-2",
    reportType: "EXPKEYWORD",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    campaignName: "커피프린트_파워링크",
    adgroupName: "행사용품",
    keywordText: "하이패키지",
    searchTerm: "패키지 제작",
    impressions: 2200,
    clicks: 51,
    cost: 44140,
    conversions: 4,
    salesAmount: 338000,
    sourceDate: "2026-05-25",
  },
  {
    id: "row-3",
    reportRowId: "raw-3",
    reportType: "SHOPPINGKEYWORD_DETAIL",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    campaignName: "스티커씨_쇼핑검색",
    adgroupName: "감사/생일/답례 스티커",
    keywordText: "스티커소량제작",
    searchTerm: "스티커소량제작",
    impressions: 1600,
    clicks: 63,
    cost: 51200,
    conversions: 0,
    salesAmount: 0,
    sourceDate: "2026-05-25",
  },
  {
    id: "row-4",
    reportRowId: "raw-4",
    reportType: "SHOPPINGKEYWORD_DETAIL",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    campaignName: "스티커씨_쇼핑검색",
    adgroupName: "시즈널스티커",
    keywordText: "생일답례품스티커",
    searchTerm: "생일답례품스티커",
    impressions: 2100,
    clicks: 57,
    cost: 46800,
    conversions: 3,
    salesAmount: 186000,
    sourceDate: "2026-05-25",
  },
];

export const SAMPLE_RAW_ROWS: SearchAdRawReportRow[] = SAMPLE_NORMALIZED_ROWS.map((row, index) => ({
  id: row.reportRowId,
  reportFileId: "sample-file",
  rowNumber: index + 1,
  brandKey: row.brandKey,
  adProductType: row.adProductType,
  mappingStatus: "mapped",
  rawRow: {
    campaignName: row.campaignName ?? null,
    adgroupName: row.adgroupName ?? null,
    keywordText: row.keywordText ?? null,
    searchTerm: row.searchTerm ?? null,
    impressions: row.impressions,
    clicks: row.clicks,
    cost: row.cost,
    conversions: row.conversions,
    salesAmount: row.salesAmount,
  },
}));

export const SAMPLE_RULE_RESULTS: SearchAdRuleResult[] = [
  {
    id: "rule-low-coffeeprint-paper-cup",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    category: "low_efficiency",
    targetType: "search_term",
    targetLabel: "소량 종이컵 제작",
    severity: "medium",
    periodDays: 30,
    reason: "클릭 42회와 비용 38,200원이 있으나 전환이 없어 입찰 또는 랜딩 점검이 필요합니다.",
    metrics: { clicks: 42, cost: 38200, conversions: 0, salesAmount: 0 },
    evidencePacket: { reportId: "report-sample-expkeyword-2026-05-25", rowId: "raw-1" },
    createdAt: "2026-05-26T08:00:00+09:00",
  },
  {
    id: "rule-good-coffeeprint-package",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    category: "good_performance",
    targetType: "search_term",
    targetLabel: "패키지 제작",
    severity: "low",
    periodDays: 30,
    reason: "클릭 51회에서 전환 4건과 매출 338,000원이 확인되어 확장 후보입니다.",
    metrics: { clicks: 51, cost: 44140, conversions: 4, salesAmount: 338000 },
    evidencePacket: { reportId: "report-sample-expkeyword-2026-05-25", rowId: "raw-2" },
    createdAt: "2026-05-26T08:00:00+09:00",
  },
  {
    id: "rule-low-stickersee-small-sticker",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    category: "low_efficiency",
    targetType: "search_term",
    targetLabel: "스티커소량제작",
    severity: "medium",
    periodDays: 30,
    reason: "쇼핑검색 검색어 클릭 63회와 비용 51,200원이 있으나 직접 전환이 없습니다.",
    metrics: { clicks: 63, cost: 51200, conversions: 0, salesAmount: 0 },
    evidencePacket: { reportId: "report-sample-shopping-keyword-2026-05-25", rowId: "raw-3" },
    createdAt: "2026-05-26T08:00:00+09:00",
  },
];

export const SAMPLE_RULE_CRITERIA: SearchAdRuleCriteria[] = [
  { id: "criteria-coffeeprint-powerlink", brandKey: "coffeeprint", adProductType: "powerlink", periodDays: 30, minImpressions: 100, minClicks: 10, minCost: 10000, targetCpa: 25000, targetRoas: 250, enabled: true },
  { id: "criteria-coffeeprint-shopping", brandKey: "coffeeprint", adProductType: "shopping_search", periodDays: 30, minImpressions: 100, minClicks: 10, minCost: 10000, targetCpa: 28000, targetRoas: 220, enabled: true },
  { id: "criteria-stickersee-powerlink", brandKey: "stickersee", adProductType: "powerlink", periodDays: 30, minImpressions: 100, minClicks: 10, minCost: 8000, targetCpa: 18000, targetRoas: 260, enabled: true },
  { id: "criteria-stickersee-shopping", brandKey: "stickersee", adProductType: "shopping_search", periodDays: 30, minImpressions: 100, minClicks: 10, minCost: 8000, targetCpa: 16000, targetRoas: 280, enabled: true },
];

export const SAMPLE_CAMPAIGNS: SearchAdStateRecord[] = [
  {
    id: "campaign-coffeeprint-powerlink",
    targetType: "campaign",
    providerId: "cmp-coffeeprint-powerlink",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    name: "커피프린트_파워링크",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
  {
    id: "campaign-stickersee-shopping",
    targetType: "campaign",
    providerId: "cmp-stickersee-shopping",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    name: "스티커씨_쇼핑검색",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
];

export const SAMPLE_ADGROUPS: SearchAdStateRecord[] = [
  {
    id: "adgroup-coffeeprint-packaging",
    targetType: "adgroup",
    providerId: "grp-coffeeprint-packaging",
    parentProviderId: "cmp-coffeeprint-powerlink",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    name: "봉투/포장 인쇄",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    bidAmount: 750,
    dailyBudget: 30000,
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
  {
    id: "adgroup-stickersee-seasonal",
    targetType: "adgroup",
    providerId: "grp-stickersee-seasonal",
    parentProviderId: "cmp-stickersee-shopping",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    name: "시즈널스티커",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    bidAmount: 520,
    dailyBudget: 25000,
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
  {
    id: "adgroup-stickersee-thanks",
    targetType: "adgroup",
    providerId: "grp-stickersee-thanks",
    parentProviderId: "cmp-stickersee-shopping",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    name: "감사/생일/답례 스티커",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    bidAmount: 610,
    dailyBudget: 22000,
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
];

export const SAMPLE_KEYWORDS: SearchAdStateRecord[] = [
  {
    id: "keyword-coffeeprint-paper-cup",
    targetType: "keyword",
    providerId: "kw-coffeeprint-paper-cup",
    parentProviderId: "grp-coffeeprint-packaging",
    brandKey: "coffeeprint",
    adProductType: "powerlink",
    name: "종이컵인쇄",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    bidAmount: 760,
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
  {
    id: "keyword-stickersee-small",
    targetType: "keyword",
    providerId: "kw-stickersee-small-sticker",
    parentProviderId: "grp-stickersee-thanks",
    brandKey: "stickersee",
    adProductType: "shopping_search",
    name: "스티커소량제작",
    userLock: false,
    status: "ELIGIBLE",
    statusReason: "운영 가능",
    bidAmount: 620,
    collectedAt: "2026-05-26T08:10:00+09:00",
  },
];

export const SAMPLE_ACTION_PREVIEWS: SearchAdActionPreview[] = [
  {
    id: "preview-adgroup-stickersee-thanks-turn-off",
    targetType: "adgroup",
    targetId: "grp-stickersee-thanks",
    targetLabel: "감사/생일/답례 스티커",
    requestedAction: "turn_off",
    beforeState: { userLock: false, status: "ELIGIBLE", statusReason: "운영 가능" },
    afterState: { userLock: true },
    impactSummary: {
      expectedEffect: "광고그룹 노출을 중지합니다. 실제 적용은 write gate가 열려야 가능합니다.",
      affectedChildren: 1,
      recentCost: 51200,
      recentClicks: 63,
      recentConversions: 0,
    },
    writeGateOpen: false,
    createdAt: "2026-05-26T08:20:00+09:00",
  },
];

export const SAMPLE_ACTION_LOGS: SearchAdActionLog[] = [
  {
    id: "log-preview-adgroup-stickersee-thanks-turn-off",
    previewId: "preview-adgroup-stickersee-thanks-turn-off",
    targetLabel: "감사/생일/답례 스티커",
    actionLabel: "끄기 요청",
    status: "blocked",
    reason: "실제 변경 권한이 닫혀 있어 네이버 광고에는 반영하지 않았습니다.",
    createdAt: "2026-05-26T08:21:00+09:00",
  },
];

export function createSampleOperationsView(filters = DEFAULT_SEARCH_AD_FILTERS): SearchAdOperationsView {
  const reports = filterReports(SAMPLE_REPORTS, filters);
  const rules = filterRuleResults(SAMPLE_RULE_RESULTS, filters);
  const campaigns = filterStateRecords(SAMPLE_CAMPAIGNS, filters);
  const adgroups = filterStateRecords(SAMPLE_ADGROUPS, filters);
  const totalCost = reports.reduce((sum, report) => sum + report.summary.cost, 0);

  return {
    filters,
    syncStatus: {
      lastReportSyncAt: SAMPLE_REPORTS[0]?.syncedAt ?? null,
      lastStateSyncAt: null,
      hasSearchAdCredentials: false,
      searchAdWriteEnabled: false,
      repositoryMode: "sample",
    },
    summaryCards: [
      { key: "reports", label: "보고서", value: `${reports.length}건`, helper: "수집 또는 샘플로 확인 가능한 보고서" },
      { key: "low", label: "저효율 후보", value: `${rules.filter((rule) => rule.category === "low_efficiency").length}건`, helper: "충분 클릭 후 전환이 낮은 항목" },
      { key: "good", label: "우수 후보", value: `${rules.filter((rule) => rule.category === "good_performance").length}건`, helper: "확장 검토가 가능한 항목" },
      { key: "cost", label: "최근 비용", value: `${formatWon(totalCost)}`, helper: "보고서 기준 합산 비용" },
      { key: "state", label: "운영 단위", value: `${campaigns.length + adgroups.length}개`, helper: "캠페인과 광고그룹 상태 수집" },
    ],
    brandSummaries: (["coffeeprint", "stickersee"] as const).map((brandKey) => {
      const brandReports = reports.filter((report) => report.mappedBrands.includes(brandKey));
      const brandRules = rules.filter((rule) => rule.brandKey === brandKey);
      return {
        brandKey,
        brandLabel: brandKey === "coffeeprint" ? "커피프린트" : "스티커씨",
        reportCount: brandReports.length,
        lowEfficiencyCount: brandRules.filter((rule) => rule.category === "low_efficiency").length,
        goodPerformanceCount: brandRules.filter((rule) => rule.category === "good_performance").length,
        recentCost: brandReports.reduce((sum, report) => sum + report.summary.cost, 0),
      };
    }),
    recentRuleResults: rules.slice(0, 10),
    recentReports: reports.slice(0, 5),
    pendingActions: SAMPLE_ACTION_PREVIEWS.map((preview) => ({
      id: preview.id,
      targetLabel: preview.targetLabel,
      actionLabel: preview.requestedAction === "turn_on" ? "켜기 미리보기" : "끄기 미리보기",
      statusLabel: preview.writeGateOpen ? "실행 가능" : "실제 변경 차단",
    })),
  };
}

export function createSampleReportArchiveView(filters = DEFAULT_SEARCH_AD_FILTERS): SearchAdReportArchiveView {
  return {
    filters,
    reports: filterReports(SAMPLE_REPORTS, filters),
    syncStatus: createSampleOperationsView(filters).syncStatus,
  };
}

export function createSampleReportDetailView(id: string): SearchAdReportDetailView | undefined {
  const report = SAMPLE_REPORTS.find((item) => item.id === id || item.providerReportJobId === id);
  if (!report) {
    return undefined;
  }

  const easyRows = SAMPLE_NORMALIZED_ROWS.filter((row) => row.reportType === report.reportType);
  const rawPreviewRows = SAMPLE_RAW_ROWS.filter((row) => easyRows.some((easyRow) => easyRow.reportRowId === row.id));
  const problemCandidates = SAMPLE_RULE_RESULTS.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category !== "good_performance");
  const goodCandidates = SAMPLE_RULE_RESULTS.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category === "good_performance");
  const cpa = report.summary.conversions > 0 ? report.summary.cost / report.summary.conversions : null;
  const roas = report.summary.cost > 0 ? (report.summary.salesAmount / report.summary.cost) * 100 : null;

  return {
    report,
    summary: {
      ...report.summary,
      cpa,
      roas,
    },
    easyRows,
    rawPreviewRows,
    columnDescriptions: [
      { field: "campaignName", label: "캠페인명", description: "네이버 광고 캠페인 이름입니다." },
      { field: "adgroupName", label: "광고그룹명", description: "실제 운영 단위로 켜기/끄기 판단의 주요 기준입니다." },
      { field: "searchTerm", label: "검색어", description: "사용자가 실제로 검색해 광고가 노출되거나 클릭된 단어입니다." },
      { field: "cost", label: "비용", description: "해당 행에 기록된 광고비입니다." },
      { field: "conversions", label: "전환수", description: "구매 등 추적된 전환 수입니다." },
      { field: "salesAmount", label: "전환매출", description: "전환으로 연결된 매출 금액입니다." },
    ],
    problemCandidates,
    goodCandidates,
  };
}

export function createSampleStateView(filters = DEFAULT_SEARCH_AD_FILTERS): SearchAdStateView {
  return {
    filters,
    syncStatus: createSampleOperationsView(filters).syncStatus,
    campaigns: filterStateRecords(SAMPLE_CAMPAIGNS, filters),
    adgroups: filterStateRecords(SAMPLE_ADGROUPS, filters),
    keywords: filterStateRecords(SAMPLE_KEYWORDS, filters),
  };
}

export function createSampleSearchTermsView(filters = DEFAULT_SEARCH_AD_FILTERS): SearchAdSearchTermsView {
  return {
    filters,
    rows: filterNormalizedRows(SAMPLE_NORMALIZED_ROWS, filters),
    ruleResults: filterRuleResults(SAMPLE_RULE_RESULTS, filters),
  };
}

export function createSampleActionLogsView(): SearchAdActionLogsView {
  return {
    previews: SAMPLE_ACTION_PREVIEWS,
    logs: SAMPLE_ACTION_LOGS,
  };
}

export function createSampleActionPreview(targetType: "campaign" | "adgroup", targetId: string, requestedAction: "turn_on" | "turn_off"): SearchAdActionPreview | undefined {
  const candidates = targetType === "campaign" ? SAMPLE_CAMPAIGNS : SAMPLE_ADGROUPS;
  const target = candidates.find((item) => item.providerId === targetId || item.id === targetId);
  if (!target) {
    return undefined;
  }

  const recentRows = SAMPLE_NORMALIZED_ROWS.filter((row) => {
    if (targetType === "campaign") {
      return row.campaignName === target.name || row.campaignId === target.providerId;
    }

    return row.adgroupName === target.name || row.adgroupId === target.providerId;
  });
  return {
    id: `preview-${targetType}-${target.providerId}-${requestedAction}`,
    targetType,
    targetId: target.providerId,
    targetLabel: target.name,
    requestedAction,
    beforeState: { userLock: target.userLock, status: target.status, statusReason: target.statusReason },
    afterState: { userLock: requestedAction === "turn_off" },
    impactSummary: {
      expectedEffect: requestedAction === "turn_off" ? "선택한 운영 단위의 광고 노출을 중지합니다." : "선택한 운영 단위의 광고 노출을 다시 허용합니다.",
      affectedChildren: targetType === "campaign" ? SAMPLE_ADGROUPS.filter((item) => item.parentProviderId === target.providerId).length : SAMPLE_KEYWORDS.filter((item) => item.parentProviderId === target.providerId).length,
      recentCost: recentRows.reduce((sum, row) => sum + row.cost, 0),
      recentClicks: recentRows.reduce((sum, row) => sum + row.clicks, 0),
      recentConversions: recentRows.reduce((sum, row) => sum + row.conversions, 0),
    },
    writeGateOpen: false,
    createdAt: new Date().toISOString(),
  };
}

function filterReports(reports: SearchAdReportJobRecord[], filters: SearchAdFilters) {
  return reports.filter((report) => {
    const brandMatched = filters.brand === "all" || report.mappedBrands.includes(filters.brand);
    const adProductMatched =
      filters.adProduct === "all" ||
      (filters.adProduct === "shopping_search" ? report.reportType.startsWith("SHOPPING") : !report.reportType.startsWith("SHOPPING"));
    return brandMatched && adProductMatched;
  });
}

function filterRuleResults(results: SearchAdRuleResult[], filters: SearchAdFilters & Partial<Pick<SearchAdRuleResultFilters, "actionIntent">>) {
  return results.filter((result) => {
    const brandMatched = filters.brand === "all" || result.brandKey === filters.brand;
    const adProductMatched = filters.adProduct === "all" || result.adProductType === filters.adProduct;
    const actionIntentMatched = !filters.actionIntent || filters.actionIntent === "all" || getRuleResultActionIntentKey(result) === filters.actionIntent;
    return brandMatched && adProductMatched && actionIntentMatched;
  });
}

function filterStateRecords(records: SearchAdStateRecord[], filters: SearchAdFilters) {
  return records.filter((record) => {
    const brandMatched = filters.brand === "all" || record.brandKey === filters.brand;
    const adProductMatched = filters.adProduct === "all" || record.adProductType === filters.adProduct;
    return brandMatched && adProductMatched;
  });
}

function filterNormalizedRows(rows: SearchAdNormalizedRow[], filters: SearchAdFilters) {
  return rows.filter((row) => {
    const brandMatched = filters.brand === "all" || row.brandKey === filters.brand;
    const adProductMatched = filters.adProduct === "all" || row.adProductType === filters.adProduct;
    return brandMatched && adProductMatched;
  });
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
