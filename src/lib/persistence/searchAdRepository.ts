import { randomUUID } from "node:crypto";
import { getPostgresPool, hasDatabaseUrl, query } from "./postgres";
import {
  DEFAULT_SEARCH_AD_FILTERS,
  DEFAULT_SEARCH_AD_RULE_RESULT_FILTERS,
  SAMPLE_NORMALIZED_ROWS,
  createSampleKeywordCleanupView,
  SAMPLE_RULE_CRITERIA,
  SAMPLE_RULE_RESULTS,
  createSampleActionLogsView,
  createSampleActionPreview,
  createSampleOperationsView,
  createSampleReportArchiveView,
  createSampleReportDetailView,
  createSampleSearchTermsView,
  createSampleStateView,
} from "@/features/search-ad/domain/sampleData";
import {
  buildSearchAdKeywordCleanupView,
  normalizeKeywordText,
  type SearchAdKeywordCoverageForCleanup,
  type SearchAdKeywordPerformanceForCleanup,
  type SearchAdKeywordStateForCleanup,
} from "@/features/search-ad/domain/keywordCleanup";
import { getReportTypeLabel } from "@/features/search-ad/domain/reportTypes";
import { getRuleResultActionTarget, isSearchTermReport } from "@/features/search-ad/domain/targetDisplay";
import { describeTargetSetting } from "@/features/search-ad/domain/targetSettings";
import { normalizeRawRow } from "@/features/search-ad/domain/parseSearchAdReport";
import { buildSearchAdPeriodRuleResults } from "@/features/search-ad/domain/ruleEngine";
import { sortSearchAdRuleCriteria } from "@/features/search-ad/domain/ruleCriteriaSettings";
import { getSearchAdReportScheduleStatus } from "@/features/search-ad/domain/reportSchedule";
import { extractSearchAdProductEvidence } from "@/features/search-ad/domain/adCreativeEvidence";
import {
  DEFAULT_SEARCH_AD_OPERATION_STRATEGIES,
  normalizeSearchAdOperationStrategyInput,
  sortSearchAdOperationStrategies,
  type SearchAdOperationStrategy,
} from "@/features/search-ad/domain/operationStrategies";
import {
  buildSearchAdOperationCalendarPreview,
  normalizeCalendarDate,
  type SearchAdOperationCalendarDecision,
  type SearchAdHoliday,
  type SearchAdOperationCalendarPreview,
} from "@/features/search-ad/domain/operationCalendar";
import { fetchKoreanPublicHolidaysForDate } from "@/lib/integrations/korea/holidays";
import { updateSearchAdAdgroupUserLock, updateSearchAdCampaignUserLock, updateSearchAdKeywordUserLock } from "@/lib/integrations/search-ad/management";
import type {
  AdProductType,
  BrandKey,
  SearchAdFilters,
  SearchAdActionLog,
  SearchAdActionLogsView,
  SearchAdActionPreview,
  SearchAdActionStatus,
  SearchAdRequestedAction,
  SearchAdNormalizedRow,
  SearchAdOperationsView,
  SearchAdRawReportRow,
  SearchAdReportArchiveView,
  SearchAdReportDetailView,
  SearchAdReportJobRecord,
  SearchAdReportStatus,
  SearchAdReportType,
  SearchAdRuleCriteria,
  SearchAdRuleResultDetailView,
  SearchAdRuleResult,
  SearchAdRuleResultFilters,
  SearchAdRuleResultsView,
  SearchAdKeywordCleanupView,
  SearchAdSearchTermsView,
  SearchAdStateRecord,
  SearchAdStateView,
  SearchAdTargetType,
  SearchAdTargetSettingRecord,
} from "@/features/search-ad/domain/types";

type ReportJobRow = {
  id: string;
  provider_report_job_id: string;
  report_type: SearchAdReportType;
  stat_date: string | Date;
  status: SearchAdReportStatus;
  download_url: string | null;
  synced_at: string | Date | null;
  row_count: number | null;
  summary: {
    impressions?: number | string;
    clicks?: number | string;
    cost?: number | string;
    conversions?: number | string;
    salesAmount?: number | string;
  } | null;
  mapped_brands: BrandKey[] | null;
};

type RuleResultRow = {
  id: string;
  brand_key: BrandKey;
  ad_product_type: AdProductType;
  category: SearchAdRuleResult["category"];
  target_type: SearchAdRuleResult["targetType"];
  target_id: string | null;
  target_label: string;
  severity: SearchAdRuleResult["severity"];
  period_days: number;
  reason: string;
  metrics: Record<string, number | string | null>;
  evidence_packet: Record<string, unknown>;
  created_at: string | Date;
};

type StateSnapshotInput = {
  targetType: SearchAdTargetType | "ad";
  providerId: string;
  parentProviderId?: string;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  name: string;
  userLock?: boolean | null;
  status?: string;
  statusReason?: string;
  bidAmount?: number | null;
  dailyBudget?: number | null;
  pcFinalUrl?: string | null;
  mobileFinalUrl?: string | null;
  rawPayload: Record<string, unknown>;
};

type TargetSnapshotInput = {
  providerTargetId: string;
  ownerId: string;
  ownerType: "adgroup" | "ad";
  ownerName?: string;
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  targetType: string;
  targetPayload?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
};

type StateBrandLookupValue = {
  brandKey?: BrandKey;
  adProductType?: AdProductType;
  name?: string;
};

type StateBrandLookup = {
  campaigns: Map<string, StateBrandLookupValue>;
  adgroups: Map<string, StateBrandLookupValue>;
  keywords: Map<string, StateBrandLookupValue>;
  ads: Map<string, StateBrandLookupValue & { pcFinalUrl?: string; mobileFinalUrl?: string; adgroupId?: string }>;
};

type DataCoverageRecord = {
  brandKey: BrandKey;
  adProductType: AdProductType;
  startDate: string;
  endDate: string;
  actualDays: number;
};

export type SearchAdOperationCalendarRunResult = {
  appliedLogs: SearchAdActionLog[];
  automationEnabled: boolean;
  createdPreviews: SearchAdActionPreview[];
  dryRun: boolean;
  preview: SearchAdOperationCalendarPreview;
};

export type SearchAdBackfillRunStatus = "queued" | "running" | "waiting" | "completed" | "failed";

let searchAdSchemaReady = false;
let searchAdSchemaPromise: Promise<void> | undefined;

export type SearchAdBackfillRunRecord = {
  completedAt?: string;
  createdAt: string;
  errorMessage?: string;
  id: string;
  inputJson: Record<string, unknown>;
  resultJson?: Record<string, unknown>;
  startedAt?: string;
  status: SearchAdBackfillRunStatus;
  updatedAt: string;
};

type BackfillRunRow = {
  completed_at: string | Date | null;
  created_at: string | Date;
  error_message: string | null;
  id: string;
  input_json: Record<string, unknown>;
  result_json: Record<string, unknown> | null;
  started_at: string | Date | null;
  status: SearchAdBackfillRunStatus;
  updated_at: string | Date;
};

type AdCreativeLookupValue = {
  name?: string;
  pcFinalUrl?: string;
  mobileFinalUrl?: string;
  productName?: string;
  productImageUrl?: string;
  mallName?: string;
  mallProductId?: string;
  status?: string;
  statusReason?: string;
};

export async function getSearchAdOperationsView(filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdOperationsView> {
  if (!hasDatabaseUrl()) {
    return createSampleOperationsView(filters);
  }

  try {
    await ensureSearchAdSchema();
    const reports = await listSearchAdReportsFromDb(filters, 5);
    const rules = await listSearchAdRuleResultsFromDb(filters, 10);
    const actionLogs = await listSearchAdActionLogsFromDb(5);
    const totalCost = reports.reduce((sum, report) => sum + report.summary.cost, 0);
    const sync = await getSyncStatusFromDb();

    return {
      filters,
      syncStatus: {
        ...sync,
        repositoryMode: "db",
      },
      summaryCards: [
        { key: "reports", label: "보고서", value: `${reports.length}건`, helper: "수집된 네이버 보고서" },
        { key: "low", label: "저효율 후보", value: `${rules.filter((rule) => rule.category === "low_efficiency").length}건`, helper: "규칙에 걸린 점검 대상" },
        { key: "good", label: "우수 후보", value: `${rules.filter((rule) => rule.category === "good_performance").length}건`, helper: "확장 검토 후보" },
        { key: "cost", label: "최근 비용", value: `${Math.round(totalCost).toLocaleString("ko-KR")}원`, helper: "보고서 기준 비용 합계" },
      ],
      brandSummaries: (["coffeeprint", "stickersee"] as BrandKey[]).map((brandKey) => {
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
      recentRuleResults: rules,
      recentReports: reports,
      pendingActions: actionLogs.previews.map((preview) => ({
        id: preview.id,
        targetLabel: preview.targetLabel,
        actionLabel: preview.requestedAction === "turn_on" ? "켜기 미리보기" : "끄기 미리보기",
        statusLabel: preview.writeGateOpen ? "실행 가능" : "실제 변경 차단",
      })),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleOperationsView(filters);
    }

    throw error;
  }
}

export async function getSearchAdReportArchiveView(filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdReportArchiveView> {
  if (!hasDatabaseUrl()) {
    return createSampleReportArchiveView(filters);
  }

  try {
    await ensureSearchAdSchema();
    return {
      filters,
      reports: await listSearchAdReportsFromDb(filters, 100),
      syncStatus: {
        ...(await getSyncStatusFromDb()),
        repositoryMode: "db",
      },
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleReportArchiveView(filters);
    }

    throw error;
  }
}

export async function getSearchAdRuleResultsView(filters = DEFAULT_SEARCH_AD_RULE_RESULT_FILTERS): Promise<SearchAdRuleResultsView> {
  if (!hasDatabaseUrl()) {
    return {
      filters,
      results: createSampleOperationsView(filters).recentRuleResults,
    };
  }

  try {
    await ensureSearchAdSchema();
    return {
      filters,
      results: await listSearchAdRuleResultsFromDb(filters, 100),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return {
        filters,
        results: createSampleOperationsView(filters).recentRuleResults,
      };
    }

    throw error;
  }
}

export async function getSearchAdReportDetailView(id: string, filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdReportDetailView | undefined> {
  if (!hasDatabaseUrl()) {
    return createSampleReportDetailView(id, filters);
  }

  try {
    await ensureSearchAdSchema();
    const reports = await listSearchAdReportsFromDb(DEFAULT_SEARCH_AD_FILTERS, 200);
    const report = reports.find((item) => item.id === id || item.providerReportJobId === id);
    if (!report) {
      return undefined;
    }

    const easyRows = await listNormalizedRowsForReport(report.id, filters);
    const rawPreviewRows = await listRawRowsForReport(report.id, filters);
    const ruleResults = await listSearchAdRuleResultsFromDb(filters, 100);
    const filteredSummary = summarizeNormalizedRows(easyRows);
    const cpa = filteredSummary.conversions > 0 ? filteredSummary.cost / filteredSummary.conversions : null;
    const roas = filteredSummary.cost > 0 ? (filteredSummary.salesAmount / filteredSummary.cost) * 100 : null;

    return {
      report,
      summary: {
        ...filteredSummary,
        lowEfficiencyCount: ruleResults.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category !== "good_performance").length,
        goodPerformanceCount: ruleResults.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category === "good_performance").length,
        cpa,
        roas,
      },
      easyRows,
      rawPreviewRows,
      columnDescriptions: [],
      problemCandidates: ruleResults.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category !== "good_performance"),
      goodCandidates: ruleResults.filter((rule) => rule.evidencePacket.reportId === report.id && rule.category === "good_performance"),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleReportDetailView(id, filters);
    }

    throw error;
  }
}

export async function getSearchAdRuleResultDetailView(id: string): Promise<SearchAdRuleResultDetailView | undefined> {
  if (!hasDatabaseUrl()) {
    return createSampleRuleResultDetailView(id);
  }

  try {
    await ensureSearchAdSchema();
    const result = await getSearchAdRuleResultById(id);
    if (!result) {
      return undefined;
    }

    const relatedRows = await listNormalizedRowsByIds(getRuleResultSourceRowIds(result));
    return {
      result,
      relatedRows,
      actionTarget: getRuleResultActionTarget(result),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleRuleResultDetailView(id);
    }

    throw error;
  }
}

export async function listSearchAdRuleCriteria(): Promise<SearchAdRuleCriteria[]> {
  if (!hasDatabaseUrl()) {
    return SAMPLE_RULE_CRITERIA;
  }

  try {
    await ensureSearchAdSchema();
    const result = await query<{
    id: string;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    period_days: number;
    min_impressions: string;
    min_clicks: string;
    min_cost: string;
    target_cpa: string | null;
    target_roas: string | null;
    enabled: boolean;
  }>(`
    SELECT id, brand_key, ad_product_type, period_days, min_impressions, min_clicks, min_cost, target_cpa, target_roas, enabled
    FROM search_ad_rule_criteria
    ORDER BY brand_key, ad_product_type
  `);

    return mergeRuleCriteriaWithDefaults(result.rows.map((row) => ({
      id: row.id,
      brandKey: row.brand_key,
      adProductType: row.ad_product_type,
      periodDays: row.period_days,
      minImpressions: Number(row.min_impressions),
      minClicks: Number(row.min_clicks),
      minCost: Number(row.min_cost),
      targetCpa: row.target_cpa === null ? null : Number(row.target_cpa),
      targetRoas: row.target_roas === null ? null : Number(row.target_roas),
      enabled: row.enabled,
    })));
  } catch (error) {
    if (canUseSampleFallback()) {
      return SAMPLE_RULE_CRITERIA;
    }

    throw error;
  }
}

export async function updateSearchAdRuleCriteria(input: SearchAdRuleCriteria): Promise<SearchAdRuleCriteria> {
  if (!hasDatabaseUrl()) {
    return input;
  }

  try {
    await ensureSearchAdSchema();
    const result = await query<{
      id: string;
      brand_key: BrandKey;
      ad_product_type: AdProductType;
      period_days: number;
      min_impressions: string;
      min_clicks: string;
      min_cost: string;
      target_cpa: string | null;
      target_roas: string | null;
      enabled: boolean;
    }>(
      `
        INSERT INTO search_ad_rule_criteria (
          id, brand_key, ad_product_type, period_days, min_impressions, min_clicks, min_cost, target_cpa, target_roas, enabled, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (id) DO UPDATE SET
          brand_key = EXCLUDED.brand_key,
          ad_product_type = EXCLUDED.ad_product_type,
          period_days = EXCLUDED.period_days,
          min_impressions = EXCLUDED.min_impressions,
          min_clicks = EXCLUDED.min_clicks,
          min_cost = EXCLUDED.min_cost,
          target_cpa = EXCLUDED.target_cpa,
          target_roas = EXCLUDED.target_roas,
          enabled = EXCLUDED.enabled,
          updated_at = now()
        RETURNING id, brand_key, ad_product_type, period_days, min_impressions, min_clicks, min_cost, target_cpa, target_roas, enabled
      `,
      [
        input.id,
        input.brandKey,
        input.adProductType,
        input.periodDays,
        input.minImpressions,
        input.minClicks,
        input.minCost,
        input.targetCpa,
        input.targetRoas,
        input.enabled,
      ],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      brandKey: row.brand_key,
      adProductType: row.ad_product_type,
      periodDays: row.period_days,
      minImpressions: Number(row.min_impressions),
      minClicks: Number(row.min_clicks),
      minCost: Number(row.min_cost),
      targetCpa: row.target_cpa === null ? null : Number(row.target_cpa),
      targetRoas: row.target_roas === null ? null : Number(row.target_roas),
      enabled: row.enabled,
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return input;
    }

    throw error;
  }
}

function mergeRuleCriteriaWithDefaults(rows: SearchAdRuleCriteria[]) {
  const byId = new Map(SAMPLE_RULE_CRITERIA.map((item) => [item.id, item]));
  for (const row of rows) {
    byId.set(row.id, row);
  }

  return sortSearchAdRuleCriteria(Array.from(byId.values()));
}

export async function listSearchAdOperationStrategies(): Promise<SearchAdOperationStrategy[]> {
  if (!hasDatabaseUrl()) {
    return DEFAULT_SEARCH_AD_OPERATION_STRATEGIES;
  }

  try {
    await ensureSearchAdSchema();
    const result = await query<{
      id: string;
      brand_key: BrandKey;
      ad_product_type: AdProductType;
      scope_label: string;
      strategy_type: SearchAdOperationStrategy["strategyType"];
      initial_schedule_label: string;
      minimum_data_days: number;
      minimum_clicks: string;
      minimum_cost: string;
      narrowing_rule: string;
      approval_rule: string;
    }>(`
      SELECT
        id,
        brand_key,
        ad_product_type,
        scope_label,
        strategy_type,
        initial_schedule_label,
        minimum_data_days,
        minimum_clicks,
        minimum_cost,
        narrowing_rule,
        approval_rule
      FROM search_ad_operation_strategies
      ORDER BY brand_key, ad_product_type, id
    `);

    return mergeOperationStrategiesWithDefaults(
      result.rows.map((row) => ({
        id: row.id,
        brandKey: row.brand_key,
        adProductType: row.ad_product_type,
        scopeLabel: row.scope_label,
        strategyType: row.strategy_type,
        initialScheduleLabel: row.initial_schedule_label,
        minimumDataDays: row.minimum_data_days,
        minimumClicks: Number(row.minimum_clicks),
        minimumCost: Number(row.minimum_cost),
        narrowingRule: row.narrowing_rule,
        approvalRule: row.approval_rule,
      })),
    );
  } catch (error) {
    if (canUseSampleFallback()) {
      return DEFAULT_SEARCH_AD_OPERATION_STRATEGIES;
    }

    throw error;
  }
}

export async function updateSearchAdOperationStrategy(input: SearchAdOperationStrategy): Promise<SearchAdOperationStrategy> {
  const normalized = normalizeSearchAdOperationStrategyInput(input as unknown as Record<string, unknown>);
  if (!hasDatabaseUrl()) {
    return normalized;
  }

  try {
    await ensureSearchAdSchema();
    const result = await query<{
      id: string;
      brand_key: BrandKey;
      ad_product_type: AdProductType;
      scope_label: string;
      strategy_type: SearchAdOperationStrategy["strategyType"];
      initial_schedule_label: string;
      minimum_data_days: number;
      minimum_clicks: string;
      minimum_cost: string;
      narrowing_rule: string;
      approval_rule: string;
    }>(
      `
        INSERT INTO search_ad_operation_strategies (
          id,
          brand_key,
          ad_product_type,
          scope_label,
          strategy_type,
          initial_schedule_label,
          minimum_data_days,
          minimum_clicks,
          minimum_cost,
          narrowing_rule,
          approval_rule,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        ON CONFLICT (id) DO UPDATE SET
          brand_key = EXCLUDED.brand_key,
          ad_product_type = EXCLUDED.ad_product_type,
          scope_label = EXCLUDED.scope_label,
          strategy_type = EXCLUDED.strategy_type,
          initial_schedule_label = EXCLUDED.initial_schedule_label,
          minimum_data_days = EXCLUDED.minimum_data_days,
          minimum_clicks = EXCLUDED.minimum_clicks,
          minimum_cost = EXCLUDED.minimum_cost,
          narrowing_rule = EXCLUDED.narrowing_rule,
          approval_rule = EXCLUDED.approval_rule,
          updated_at = now()
        RETURNING
          id,
          brand_key,
          ad_product_type,
          scope_label,
          strategy_type,
          initial_schedule_label,
          minimum_data_days,
          minimum_clicks,
          minimum_cost,
          narrowing_rule,
          approval_rule
      `,
      [
        normalized.id,
        normalized.brandKey,
        normalized.adProductType,
        normalized.scopeLabel,
        normalized.strategyType,
        normalized.initialScheduleLabel,
        normalized.minimumDataDays,
        normalized.minimumClicks,
        normalized.minimumCost,
        normalized.narrowingRule,
        normalized.approvalRule,
      ],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      brandKey: row.brand_key,
      adProductType: row.ad_product_type,
      scopeLabel: row.scope_label,
      strategyType: row.strategy_type,
      initialScheduleLabel: row.initial_schedule_label,
      minimumDataDays: row.minimum_data_days,
      minimumClicks: Number(row.minimum_clicks),
      minimumCost: Number(row.minimum_cost),
      narrowingRule: row.narrowing_rule,
      approvalRule: row.approval_rule,
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return normalized;
    }

    throw error;
  }
}

function mergeOperationStrategiesWithDefaults(rows: SearchAdOperationStrategy[]) {
  const byId = new Map(DEFAULT_SEARCH_AD_OPERATION_STRATEGIES.map((item) => [item.id, item]));
  for (const row of rows) {
    byId.set(row.id, row);
  }

  return sortSearchAdOperationStrategies(Array.from(byId.values()));
}

export async function getSearchAdStateView(filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdStateView> {
  if (!hasDatabaseUrl()) {
    return createSampleStateView(filters);
  }

  try {
    await ensureSearchAdSchema();
    return {
      filters,
      syncStatus: {
        ...(await getSyncStatusFromDb()),
        repositoryMode: "db",
      },
      campaigns: await listLatestStateSnapshots("campaign", filters),
      adgroups: await listLatestStateSnapshots("adgroup", filters),
      keywords: await listLatestStateSnapshots("keyword", filters),
      targetSettings: await listLatestTargetSettings(filters),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleStateView(filters);
    }

    throw error;
  }
}

export async function getSearchAdOperationCalendarPreview(input: { date?: string; holidays?: SearchAdHoliday[] } = {}): Promise<SearchAdOperationCalendarPreview> {
  const date = normalizeCalendarDate(input.date);
  const state = await getSearchAdStateView(DEFAULT_SEARCH_AD_FILTERS);
  return buildSearchAdOperationCalendarPreview({
    adgroups: state.adgroups,
    automationEnabled: isSearchAdOperationAutomationEnabled(),
    autoLockedTargetIds: await listActiveOperationCalendarLockTargetIds(),
    date,
    holidays: input.holidays ?? (await loadOperationCalendarHolidays(date)),
    writeEnabled: isSearchAdWriteEnabled(),
  });
}

export async function runSearchAdOperationCalendar(input: { date?: string; dryRun?: boolean; holidays?: SearchAdHoliday[] } = {}): Promise<SearchAdOperationCalendarRunResult> {
  const automationEnabled = isSearchAdOperationAutomationEnabled();
  const dryRun = input.dryRun ?? !automationEnabled;
  const preview = await getSearchAdOperationCalendarPreview({ date: input.date, holidays: input.holidays });
  const createdPreviews: SearchAdActionPreview[] = [];
  const appliedLogs: SearchAdActionLog[] = [];

  if (dryRun || !automationEnabled) {
    return { appliedLogs, automationEnabled, createdPreviews, dryRun: true, preview };
  }

  for (const decision of preview.decisions) {
    if (!decision.shouldCreatePreview || (decision.requestedAction !== "turn_off" && decision.requestedAction !== "turn_on")) {
      continue;
    }

    const actionPreview = await createSearchAdActionPreview({
      requestedAction: decision.requestedAction,
      targetId: decision.targetId,
      targetType: decision.targetType,
    });
    if (!actionPreview) {
      continue;
    }

    createdPreviews.push(actionPreview);
    const log = await applySearchAdActionPreview(actionPreview.id);
    appliedLogs.push(log);
    if (log.status !== "applied") {
      continue;
    }

    if (decision.requestedAction === "turn_off") {
      await recordOperationCalendarLock(decision, actionPreview, log, preview.date);
    } else {
      await releaseOperationCalendarLock(decision.targetId, log);
    }
  }

  return { appliedLogs, automationEnabled, createdPreviews, dryRun: false, preview };
}

export async function getSearchAdSearchTermsView(filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdSearchTermsView> {
  if (!hasDatabaseUrl()) {
    return createSampleSearchTermsView(filters);
  }

  try {
    await ensureSearchAdSchema();
    const rows = await listNormalizedRowsByFilters(filters, 500);
    const ruleResults = await listSearchAdRuleResultsFromDb(filters, 500);
    return {
      filters,
      rows: rows.filter((row) => isSearchTermReport(row.reportType)),
      ruleResults: ruleResults.filter((rule) => rule.targetType === "search_term"),
    };
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleSearchTermsView(filters);
    }

    throw error;
  }
}

export async function getSearchAdKeywordCleanupView(filters = DEFAULT_SEARCH_AD_FILTERS): Promise<SearchAdKeywordCleanupView> {
  if (!hasDatabaseUrl()) {
    return createSampleKeywordCleanupView(filters);
  }

  try {
    await ensureSearchAdSchema();
    const keywords = await listLatestKeywordStatesForCleanup(filters);
    return buildSearchAdKeywordCleanupView({
      filters,
      keywords,
      performanceRows: await listKeywordPerformanceForCleanup(filters, keywords),
      coverageRows: await listKeywordCoverageForCleanup(filters),
    });
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleKeywordCleanupView(filters);
    }

    throw error;
  }
}

export async function getSearchAdActionLogsView(): Promise<SearchAdActionLogsView> {
  if (!hasDatabaseUrl()) {
    return createSampleActionLogsView();
  }

  try {
    await ensureSearchAdSchema();
    return listSearchAdActionLogsFromDb(100);
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleActionLogsView();
    }

    throw error;
  }
}

export async function saveSearchAdStateSnapshots(input: StateSnapshotInput[], collectedAt = new Date().toISOString()) {
  if (!hasDatabaseUrl()) {
    throw new Error("SEARCH_AD_DATABASE_MISSING");
  }

  await ensureSearchAdSchema();
  for (const item of input) {
    if (item.targetType === "campaign") {
      await query(
        `
          INSERT INTO search_ad_campaign_snapshots (
            id, provider_campaign_id, brand_key, ad_product_type, name, campaign_type, user_lock, status, status_reason, raw_payload, collected_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          snapshotId(item.targetType, item.providerId, collectedAt),
          item.providerId,
          item.brandKey ?? null,
          item.adProductType ?? null,
          item.name,
          String(item.rawPayload.campaignTp ?? item.rawPayload.campaignType ?? ""),
          item.userLock ?? null,
          item.status ?? null,
          item.statusReason ?? null,
          JSON.stringify(item.rawPayload),
          collectedAt,
        ],
      );
      continue;
    }

    if (item.targetType === "adgroup") {
      await query(
        `
          INSERT INTO search_ad_adgroup_snapshots (
            id, provider_adgroup_id, provider_campaign_id, brand_key, ad_product_type, name, adgroup_type,
            user_lock, status, status_reason, bid_amount, daily_budget, raw_payload, collected_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          snapshotId(item.targetType, item.providerId, collectedAt),
          item.providerId,
          item.parentProviderId ?? null,
          item.brandKey ?? null,
          item.adProductType ?? null,
          item.name,
          String(item.rawPayload.adgroupType ?? item.rawPayload.adgroupTp ?? ""),
          item.userLock ?? null,
          item.status ?? null,
          item.statusReason ?? null,
          item.bidAmount ?? null,
          item.dailyBudget ?? null,
          JSON.stringify(item.rawPayload),
          collectedAt,
        ],
      );
      continue;
    }

    if (item.targetType === "ad") {
      await query(
        `
          INSERT INTO search_ad_ad_snapshots (
            id, provider_ad_id, provider_adgroup_id, brand_key, ad_product_type, name, ad_type,
            user_lock, status, status_reason, pc_final_url, mobile_final_url, raw_payload, collected_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          snapshotId(item.targetType, item.providerId, collectedAt),
          item.providerId,
          item.parentProviderId ?? null,
          item.brandKey ?? null,
          item.adProductType ?? null,
          item.name,
          String(item.rawPayload.type ?? item.rawPayload.adType ?? item.rawPayload.adTp ?? ""),
          item.userLock ?? null,
          item.status ?? null,
          item.statusReason ?? null,
          item.pcFinalUrl ?? null,
          item.mobileFinalUrl ?? null,
          JSON.stringify(item.rawPayload),
          collectedAt,
        ],
      );
      continue;
    }

    await query(
      `
        INSERT INTO search_ad_keyword_snapshots (
          id, provider_keyword_id, provider_adgroup_id, brand_key, ad_product_type, keyword_text,
          user_lock, status, status_reason, bid_amount, raw_payload, collected_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        snapshotId(item.targetType, item.providerId, collectedAt),
        item.providerId,
        item.parentProviderId ?? null,
        item.brandKey ?? null,
        item.adProductType ?? null,
        item.name,
        item.userLock ?? null,
        item.status ?? null,
        item.statusReason ?? null,
        item.bidAmount ?? null,
        JSON.stringify(item.rawPayload),
        collectedAt,
      ],
    );
  }

  return { collectedAt, saved: input.length };
}

export async function saveSearchAdTargetSnapshots(input: TargetSnapshotInput[], collectedAt = new Date().toISOString()) {
  if (!hasDatabaseUrl()) {
    throw new Error("SEARCH_AD_DATABASE_MISSING");
  }

  await ensureSearchAdSchema();
  for (const item of input) {
    const described = describeTargetSetting(item.targetType, item.targetPayload);
    await query(
      `
        INSERT INTO search_ad_target_snapshots (
          id, provider_target_id, owner_id, owner_type, owner_name, brand_key, ad_product_type,
          target_type, target_type_label, setting_label, target_payload, raw_payload, collected_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        snapshotId("target", item.providerTargetId, collectedAt),
        item.providerTargetId,
        item.ownerId,
        item.ownerType,
        item.ownerName ?? null,
        item.brandKey ?? null,
        item.adProductType ?? null,
        item.targetType,
        described.targetTypeLabel,
        described.settingLabel,
        JSON.stringify(item.targetPayload ?? {}),
        JSON.stringify(item.rawPayload),
        collectedAt,
      ],
    );
  }

  return { collectedAt, saved: input.length };
}

export async function rebuildAndSaveSearchAdRuleResults() {
  if (!hasDatabaseUrl()) {
    return { saved: 0, results: createSampleSearchTermsView(DEFAULT_SEARCH_AD_FILTERS).ruleResults };
  }

  try {
    await ensureSearchAdSchema();
    const criteria = await listSearchAdRuleCriteria();
    const rows = await listNormalizedRowsForRuleCriteria(criteria);
    const dataCoverage = await listNormalizedDataCoverage();
    const adLookup = await listLatestAdCreativeLookup();
    const results = enrichRuleResultsWithEvidenceContext(buildSearchAdPeriodRuleResults(rows, criteria), dataCoverage, adLookup);

    await replaceSearchAdRuleResults(results);

    return { saved: results.length, results };
  } catch (error) {
    if (canUseSampleFallback()) {
      return { saved: 0, results: createSampleSearchTermsView(DEFAULT_SEARCH_AD_FILTERS).ruleResults };
    }

    throw error;
  }
}

export async function createSearchAdActionPreview(input: {
  targetType: SearchAdTargetType;
  targetId: string;
  requestedAction: SearchAdRequestedAction;
}): Promise<SearchAdActionPreview | undefined> {
  if (!hasDatabaseUrl()) {
    return createSampleActionPreview(input.targetType, input.targetId, input.requestedAction);
  }

  try {
    await ensureSearchAdSchema();
    const target = await getLatestActionTarget(input.targetType, input.targetId);
    if (!target) {
      return undefined;
    }

    const impact = await getActionImpact(input.targetType, target);
    const preview: SearchAdActionPreview = {
      id: `preview-${input.targetType}-${target.providerId}-${input.requestedAction}-${Date.now()}`,
      targetType: input.targetType,
      targetId: target.providerId,
      targetLabel: target.name,
      requestedAction: input.requestedAction,
      beforeState: {
        userLock: target.userLock,
        status: target.status,
        statusReason: target.statusReason,
      },
      afterState: {
        userLock: input.requestedAction === "turn_off",
      },
      impactSummary: {
        expectedEffect:
          input.requestedAction === "turn_off"
            ? `${getActionTargetTypeLabel(input.targetType)} 광고 노출을 중지합니다.`
            : `${getActionTargetTypeLabel(input.targetType)} 광고 노출을 다시 허용합니다.`,
        affectedChildren: impact.affectedChildren,
        recentCost: impact.recentCost,
        recentClicks: impact.recentClicks,
        recentConversions: impact.recentConversions,
      },
      writeGateOpen: isSearchAdWriteEnabled(),
      createdAt: new Date().toISOString(),
    };

    await query(
      `
        INSERT INTO search_ad_action_previews (id, target_type, target_id, requested_action, before_state, after_state, impact_summary, write_gate_open, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        preview.id,
        preview.targetType,
        preview.targetId,
        preview.requestedAction,
        JSON.stringify(preview.beforeState),
        JSON.stringify(preview.afterState),
        JSON.stringify(preview.impactSummary),
        preview.writeGateOpen,
        preview.createdAt,
      ],
    );

    return preview;
  } catch (error) {
    if (canUseSampleFallback()) {
      return createSampleActionPreview(input.targetType, input.targetId, input.requestedAction);
    }

    throw error;
  }
}

export async function applySearchAdActionPreview(previewId: string): Promise<SearchAdActionLog> {
  try {
    const preview = await getSearchAdActionPreviewById(previewId);
    if (!preview) {
      throw new Error("SEARCH_AD_ACTION_PREVIEW_NOT_FOUND");
    }

    const writeGateOpen = isSearchAdWriteEnabled();
    const target = hasDatabaseUrl() ? await getLatestActionTarget(preview.targetType, preview.targetId) : undefined;
    const targetLabel = target?.name ?? preview.targetLabel;
    const targetTypeLabel = getActionTargetTypeLabel(preview.targetType);
    const log: SearchAdActionLog = {
      id: `log-${preview.id}-${Date.now()}`,
      previewId: preview.id,
      targetType: preview.targetType,
      targetLabel,
      requestedAction: preview.requestedAction,
      actionLabel: preview.requestedAction === "turn_on" ? "켜기 요청" : "끄기 요청",
      status: writeGateOpen ? "applied" : "blocked",
      reason: writeGateOpen
        ? preview.requestedAction === "turn_on"
          ? `네이버 검색광고 ${targetTypeLabel}을 켰습니다.`
          : `네이버 검색광고 ${targetTypeLabel}을 껐습니다.`
        : "실제 변경 권한이 닫혀 있어 네이버 광고에는 반영하지 않았습니다.",
      createdAt: new Date().toISOString(),
    };

    if (!hasDatabaseUrl()) {
      return log;
    }

    await ensureSearchAdSchema();

    if (!writeGateOpen) {
      await insertSearchAdActionLog(log, null, null, log.reason);
      return log;
    }

    if (preview.targetType === "campaign") {
      try {
        const updated = await updateSearchAdCampaignUserLock(preview.targetId, preview.afterState.userLock);
        await saveSearchAdStateSnapshots([
          {
            targetType: "campaign",
            providerId: updated.nccCampaignId ?? preview.targetId,
            brandKey: target?.brandKey,
            adProductType: target?.adProductType,
            name: updated.name ?? targetLabel,
            userLock: updated.userLock ?? preview.afterState.userLock,
            status: updated.status,
            statusReason: updated.statusReason,
            rawPayload: updated,
          },
        ]);
        await insertSearchAdActionLog(
          log,
          {
            targetType: preview.targetType,
            targetId: preview.targetId,
            userLock: preview.afterState.userLock,
          },
          updated,
          null,
        );
        return log;
      } catch (error) {
        const message = error instanceof Error ? error.message : "네이버 검색광고 상태 변경 요청에 실패했습니다.";
        const failedLog = {
          ...log,
          status: "failed" as const,
          reason: message,
        };
        await insertSearchAdActionLog(
          failedLog,
          {
            targetType: preview.targetType,
            targetId: preview.targetId,
            userLock: preview.afterState.userLock,
          },
          null,
          message,
        );
        return failedLog;
      }
    }

    if (preview.targetType === "keyword") {
      try {
        const updated = await updateSearchAdKeywordUserLock(preview.targetId, preview.afterState.userLock);
        await saveSearchAdStateSnapshots([
          {
            targetType: "keyword",
            providerId: updated.nccKeywordId ?? preview.targetId,
            parentProviderId: updated.nccAdgroupId ?? target?.parentProviderId,
            brandKey: target?.brandKey,
            adProductType: target?.adProductType,
            name: updated.keyword ?? targetLabel,
            userLock: updated.userLock ?? preview.afterState.userLock,
            status: updated.status,
            statusReason: updated.statusReason,
            bidAmount: numberFromProviderPayload(updated.bidAmt),
            rawPayload: updated,
          },
        ]);
        await insertSearchAdActionLog(
          log,
          {
            targetType: preview.targetType,
            targetId: preview.targetId,
            userLock: preview.afterState.userLock,
          },
          updated,
          null,
        );
        return log;
      } catch (error) {
        const message = error instanceof Error ? error.message : "네이버 검색광고 키워드 상태 변경 요청에 실패했습니다.";
        const failedLog = {
          ...log,
          status: "failed" as const,
          reason: message,
        };
        await insertSearchAdActionLog(
          failedLog,
          {
            targetType: preview.targetType,
            targetId: preview.targetId,
            userLock: preview.afterState.userLock,
          },
          null,
          message,
        );
        return failedLog;
      }
    }

    try {
      const updated = await updateSearchAdAdgroupUserLock(preview.targetId, preview.afterState.userLock);
      await saveSearchAdStateSnapshots([
        {
          targetType: "adgroup",
          providerId: updated.nccAdgroupId ?? preview.targetId,
          parentProviderId: updated.nccCampaignId ?? target?.parentProviderId,
          brandKey: target?.brandKey,
          adProductType: target?.adProductType,
          name: updated.name ?? targetLabel,
          userLock: updated.userLock ?? preview.afterState.userLock,
          status: updated.status,
          statusReason: updated.statusReason,
          bidAmount: numberFromProviderPayload(updated.bidAmt),
          dailyBudget: numberFromProviderPayload(updated.dailyBudget),
          rawPayload: updated,
        },
      ]);
      await insertSearchAdActionLog(
        log,
        {
          targetType: preview.targetType,
          targetId: preview.targetId,
          userLock: preview.afterState.userLock,
        },
        updated,
        null,
      );
      return log;
    } catch (error) {
      const message = error instanceof Error ? error.message : "네이버 검색광고 상태 변경 요청에 실패했습니다.";
      const failedLog = {
        ...log,
        status: "failed" as const,
        reason: message,
      };
      await insertSearchAdActionLog(
        failedLog,
        {
          targetType: preview.targetType,
          targetId: preview.targetId,
          userLock: preview.afterState.userLock,
        },
        null,
        message,
      );
      return failedLog;
    }
  } catch (error) {
    if (canUseSampleFallback()) {
      const fallbackPreview = createSampleActionLogsView().previews.find((preview) => preview.id === previewId);
      if (!fallbackPreview) {
        throw error;
      }

      return {
        id: `log-${fallbackPreview.id}-${Date.now()}`,
        previewId: fallbackPreview.id,
        targetType: fallbackPreview.targetType,
        targetLabel: fallbackPreview.targetLabel,
        requestedAction: fallbackPreview.requestedAction,
        actionLabel: fallbackPreview.requestedAction === "turn_on" ? "켜기 요청" : "끄기 요청",
        status: "blocked",
        reason: "실제 변경 권한이 닫혀 있어 네이버 광고에는 반영하지 않았습니다.",
        createdAt: new Date().toISOString(),
      };
    }

    throw error;
  }
}

async function insertSearchAdActionLog(
  log: SearchAdActionLog,
  providerRequest: Record<string, unknown> | null,
  providerResponse: Record<string, unknown> | null,
  errorMessage: string | null,
) {
  await query(
    `
      INSERT INTO search_ad_action_logs (id, preview_id, status, provider_request, provider_response, error_message, actor, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      log.id,
      log.previewId,
      log.status,
      providerRequest ? JSON.stringify(providerRequest) : null,
      providerResponse ? JSON.stringify(providerResponse) : null,
      errorMessage,
      "owner",
      log.createdAt,
    ],
  );
}

function numberFromProviderPayload(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function saveDownloadedReport(input: {
  providerReportJobId: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: SearchAdReportStatus;
  downloadUrl?: string;
  rawText: string;
  checksum: string;
  parserVersion: string;
  rawRows: SearchAdRawReportRow[];
  normalizedRows: SearchAdNormalizedRow[];
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("SEARCH_AD_DATABASE_MISSING");
  }

  await ensureSearchAdSchema();
  const reportId = `report-${input.providerReportJobId}`;
  const fileId = `${reportId}-${input.checksum.slice(0, 12)}`;

  const existingFile = await query<{ already_saved: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM search_ad_report_files f
        WHERE f.id = $1
          AND f.checksum = $2
          AND EXISTS (
            SELECT 1
            FROM search_ad_report_rows r
            WHERE r.report_file_id = f.id
            LIMIT 1
          )
      ) AS already_saved
    `,
    [fileId, input.checksum],
  );
  if (existingFile.rows[0]?.already_saved) {
    return { reportId, fileId };
  }

  const stateLookup = await getLatestStateBrandLookup();
  const rawRows = input.rawRows.map((row) => hydrateReportRowWithState(row, stateLookup));
  const normalizedRows = rawRows
    .filter((row): row is SearchAdRawReportRow & { brandKey: BrandKey } => Boolean(row.brandKey))
    .map((row) => normalizeRawRow(input.reportType, row, input.statDate));

  await query(
    `
      INSERT INTO search_ad_report_jobs (id, provider_report_job_id, report_type, stat_date, status, download_url, synced_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (provider_report_job_id)
      DO UPDATE SET report_type = EXCLUDED.report_type, stat_date = EXCLUDED.stat_date, status = EXCLUDED.status,
        download_url = EXCLUDED.download_url, synced_at = now(), updated_at = now()
    `,
    [reportId, input.providerReportJobId, input.reportType, input.statDate, input.status, input.downloadUrl ?? null],
  );

  await query(
    `
      INSERT INTO search_ad_report_files (id, report_job_id, raw_text, checksum, content_type, parser_version, row_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (report_job_id, checksum)
      DO UPDATE SET raw_text = EXCLUDED.raw_text, parser_version = EXCLUDED.parser_version, row_count = EXCLUDED.row_count
    `,
    [fileId, reportId, input.rawText, input.checksum, "text/tab-separated-values; charset=utf-8", input.parserVersion, rawRows.length],
  );

  await query("DELETE FROM search_ad_report_normalized_rows WHERE report_row_id IN (SELECT id FROM search_ad_report_rows WHERE report_file_id = $1)", [fileId]);
  await query("DELETE FROM search_ad_report_rows WHERE report_file_id = $1", [fileId]);

  for (const row of rawRows) {
    await query(
      `
        INSERT INTO search_ad_report_rows (id, report_file_id, row_number, raw_row, brand_key, ad_product_type, mapping_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [row.id, fileId, row.rowNumber, JSON.stringify(row.rawRow), row.brandKey ?? null, row.adProductType ?? null, row.mappingStatus],
    );
  }

  for (const row of normalizedRows) {
    await query(
      `
        INSERT INTO search_ad_report_normalized_rows (
          id, report_row_id, report_type, brand_key, ad_product_type, campaign_id, campaign_name, adgroup_id, adgroup_name,
          keyword_id, keyword_text, search_term, ad_id, criterion_id, extension_id, media_id, device,
          impressions, clicks, cost, conversions, sales_amount, source_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      `,
      [
        row.id,
        row.reportRowId,
        row.reportType,
        row.brandKey,
        row.adProductType,
        row.campaignId ?? null,
        row.campaignName ?? null,
        row.adgroupId ?? null,
        row.adgroupName ?? null,
        row.keywordId ?? null,
        row.keywordText ?? null,
        row.searchTerm ?? null,
        row.adId ?? null,
        row.criterionId ?? null,
        row.extensionId ?? null,
        row.mediaId ?? null,
        row.device ?? null,
        row.impressions,
        row.clicks,
        row.cost,
        row.conversions,
        row.salesAmount,
        row.sourceDate,
      ],
    );
  }

  return { reportId, fileId };
}

export async function saveUnavailableSearchAdReport(input: {
  downloadUrl?: string;
  providerReportJobId: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: SearchAdReportStatus;
}) {
  if (!hasDatabaseUrl()) {
    throw new Error("SEARCH_AD_DATABASE_MISSING");
  }

  await ensureSearchAdSchema();
  const reportId = `report-${input.providerReportJobId}`;
  await query(
    `
      INSERT INTO search_ad_report_jobs (id, provider_report_job_id, report_type, stat_date, status, download_url, status_message, synced_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
      ON CONFLICT (provider_report_job_id)
      DO UPDATE SET report_type = EXCLUDED.report_type, stat_date = EXCLUDED.stat_date, status = EXCLUDED.status,
        download_url = EXCLUDED.download_url, status_message = EXCLUDED.status_message, synced_at = now(), updated_at = now()
    `,
    [reportId, input.providerReportJobId, input.reportType, input.statDate, input.status, input.downloadUrl ?? null, "네이버 파일 없음"],
  );
}

export async function listSavedSearchAdReportKeys(): Promise<Array<{ reportType: SearchAdReportType; statDate: string }>> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureSearchAdSchema();
  const result = await query<{ report_type: SearchAdReportType; stat_date: string }>(`
    SELECT DISTINCT j.report_type, to_char(j.stat_date, 'YYYY-MM-DD') AS stat_date
    FROM search_ad_report_jobs j
    LEFT JOIN search_ad_report_files f ON f.report_job_id = j.id
    WHERE f.id IS NOT NULL OR j.status = 'NONE'
    ORDER BY stat_date ASC, j.report_type ASC
  `);

  return result.rows.map((row) => ({
    reportType: row.report_type,
    statDate: row.stat_date,
  }));
}

export async function createSearchAdBackfillRun(inputJson: Record<string, unknown>): Promise<SearchAdBackfillRunRecord> {
  if (!hasDatabaseUrl()) {
    throw new Error("SEARCH_AD_DATABASE_MISSING");
  }

  await ensureSearchAdSchema();
  const id = `search-ad-backfill-${randomUUID()}`;
  const result = await query<BackfillRunRow>(
    `
      INSERT INTO search_ad_backfill_runs (id, status, input_json)
      VALUES ($1, 'queued', $2::jsonb)
      RETURNING id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    `,
    [id, JSON.stringify(inputJson)],
  );

  return mapBackfillRunRow(result.rows[0]);
}

export async function getSearchAdBackfillRun(id: string): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(
    `
      SELECT id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
      FROM search_ad_backfill_runs
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

export async function getLatestSearchAdBackfillRun(): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(`
    SELECT id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    FROM search_ad_backfill_runs
    ORDER BY updated_at DESC
    LIMIT 1
  `);

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

export async function markSearchAdBackfillRunRunning(id: string, inputJson?: Record<string, unknown>): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(
    `
      UPDATE search_ad_backfill_runs
      SET
        status = 'running',
        input_json = COALESCE($2::jsonb, input_json),
        started_at = COALESCE(started_at, now()),
        updated_at = now()
      WHERE id = $1
      RETURNING id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    `,
    [id, inputJson ? JSON.stringify(inputJson) : null],
  );

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

export async function updateSearchAdBackfillRunProgress(
  id: string,
  resultJson: Record<string, unknown>,
  status: Extract<SearchAdBackfillRunStatus, "running" | "waiting"> = "running",
): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(
    `
      UPDATE search_ad_backfill_runs
      SET status = $2, result_json = $3::jsonb, updated_at = now()
      WHERE id = $1
      RETURNING id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    `,
    [id, status, JSON.stringify(resultJson)],
  );

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

export async function completeSearchAdBackfillRun(id: string, resultJson: Record<string, unknown>): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(
    `
      UPDATE search_ad_backfill_runs
      SET status = 'completed', result_json = $2::jsonb, completed_at = now(), updated_at = now()
      WHERE id = $1
      RETURNING id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    `,
    [id, JSON.stringify(resultJson)],
  );

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

export async function failSearchAdBackfillRun(
  id: string,
  errorMessage: string,
  resultJson?: Record<string, unknown>,
): Promise<SearchAdBackfillRunRecord | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  await ensureSearchAdSchema();
  const result = await query<BackfillRunRow>(
    `
      UPDATE search_ad_backfill_runs
      SET status = 'failed', error_message = $2, result_json = COALESCE($3::jsonb, result_json), completed_at = now(), updated_at = now()
      WHERE id = $1
      RETURNING id, status, input_json, result_json, error_message, created_at, started_at, completed_at, updated_at
    `,
    [id, errorMessage, resultJson ? JSON.stringify(resultJson) : null],
  );

  return result.rows[0] ? mapBackfillRunRow(result.rows[0]) : undefined;
}

async function getLatestStateBrandLookup(): Promise<StateBrandLookup> {
  const lookup: StateBrandLookup = {
    campaigns: new Map(),
    adgroups: new Map(),
    keywords: new Map(),
    ads: new Map(),
  };

  const campaigns = await query<{
    provider_campaign_id: string;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    name: string | null;
  }>(`
    SELECT DISTINCT ON (provider_campaign_id) provider_campaign_id, brand_key, ad_product_type, name
    FROM search_ad_campaign_snapshots
    ORDER BY provider_campaign_id, collected_at DESC
  `);
  for (const row of campaigns.rows) {
    lookup.campaigns.set(row.provider_campaign_id, {
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.name ?? undefined,
    });
  }

  const adgroups = await query<{
    provider_adgroup_id: string;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    name: string | null;
  }>(`
    SELECT DISTINCT ON (provider_adgroup_id) provider_adgroup_id, brand_key, ad_product_type, name
    FROM search_ad_adgroup_snapshots
    ORDER BY provider_adgroup_id, collected_at DESC
  `);
  for (const row of adgroups.rows) {
    lookup.adgroups.set(row.provider_adgroup_id, {
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.name ?? undefined,
    });
  }

  const keywords = await query<{
    provider_keyword_id: string;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    keyword_text: string | null;
  }>(`
    SELECT DISTINCT ON (provider_keyword_id) provider_keyword_id, brand_key, ad_product_type, keyword_text
    FROM search_ad_keyword_snapshots
    ORDER BY provider_keyword_id, collected_at DESC
  `);
  for (const row of keywords.rows) {
    lookup.keywords.set(row.provider_keyword_id, {
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.keyword_text ?? undefined,
    });
  }

  const ads = await query<{
    provider_ad_id: string;
    provider_adgroup_id: string | null;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    name: string | null;
    pc_final_url: string | null;
    mobile_final_url: string | null;
  }>(`
    SELECT DISTINCT ON (provider_ad_id)
      provider_ad_id, provider_adgroup_id, brand_key, ad_product_type, name, pc_final_url, mobile_final_url
    FROM search_ad_ad_snapshots
    ORDER BY provider_ad_id, collected_at DESC
  `);
  for (const row of ads.rows) {
    lookup.ads.set(row.provider_ad_id, {
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.name ?? undefined,
      pcFinalUrl: row.pc_final_url ?? undefined,
      mobileFinalUrl: row.mobile_final_url ?? undefined,
      adgroupId: row.provider_adgroup_id ?? undefined,
    });
  }

  return lookup;
}

function hydrateReportRowWithState(row: SearchAdRawReportRow, lookup: StateBrandLookup): SearchAdRawReportRow {
  const campaignId = reportStringValue(row.rawRow.campaignId);
  const adgroupId = reportStringValue(row.rawRow.adgroupId) ?? reportOwnerId(row.rawRow.criterionId);
  const keywordId = reportStringValue(row.rawRow.keywordId);
  const adId = reportStringValue(row.rawRow.adId) ?? reportStringValue(row.rawRow.nccAdId);
  const adMatch = adId ? lookup.ads.get(adId) : undefined;
  const keywordMatch = keywordId ? lookup.keywords.get(keywordId) : undefined;
  const adgroupMatch = adgroupId ? lookup.adgroups.get(adgroupId) : adMatch?.adgroupId ? lookup.adgroups.get(adMatch.adgroupId) : undefined;
  const campaignMatch = campaignId ? lookup.campaigns.get(campaignId) : undefined;
  const match = keywordMatch ?? adMatch ?? adgroupMatch ?? campaignMatch;
  const brandKey = row.brandKey ?? match?.brandKey;
  const adProductType = match?.adProductType ?? row.adProductType;
  const rawRow = {
    ...row.rawRow,
    ...(campaignMatch?.name && !row.rawRow.campaignName ? { campaignName: campaignMatch.name } : {}),
    ...(adgroupMatch?.name && !row.rawRow.adgroupName ? { adgroupName: adgroupMatch.name } : {}),
    ...(keywordMatch?.name && !row.rawRow.keywordText ? { keywordText: keywordMatch.name } : {}),
    ...(adMatch?.name && !row.rawRow.adName ? { adName: adMatch.name } : {}),
    ...(adMatch?.pcFinalUrl && !row.rawRow.pcFinalUrl ? { pcFinalUrl: adMatch.pcFinalUrl } : {}),
    ...(adMatch?.mobileFinalUrl && !row.rawRow.mobileFinalUrl ? { mobileFinalUrl: adMatch.mobileFinalUrl } : {}),
  };

  return {
    ...row,
    rawRow,
    brandKey,
    adProductType,
    mappingStatus: brandKey ? "mapped" : row.mappingStatus,
  };
}

function reportOwnerId(value: unknown) {
  const text = reportStringValue(value);
  return text?.split("~")[0] || undefined;
}

function reportStringValue(value: unknown) {
  if (typeof value !== "string" || value.length === 0 || value === "-") {
    return undefined;
  }

  return value;
}

export async function ensureSearchAdSchema() {
  if (!hasDatabaseUrl()) {
    return;
  }

  if (searchAdSchemaReady) {
    return;
  }

  searchAdSchemaPromise ??= ensureSearchAdSchemaUncached()
    .then(() => {
      searchAdSchemaReady = true;
    })
    .finally(() => {
      searchAdSchemaPromise = undefined;
    });

  await searchAdSchemaPromise;
}

async function ensureSearchAdSchemaUncached() {
  await query(`
    CREATE TABLE IF NOT EXISTS workflow_records (
      collection TEXT NOT NULL,
      id TEXT NOT NULL,
      payload_json JSONB NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (collection, id)
    );

    CREATE TABLE IF NOT EXISTS ad_brand_mappings (
      id TEXT PRIMARY KEY,
      brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      provider_level TEXT NOT NULL CHECK (provider_level IN ('campaign', 'adgroup', 'keyword')),
      provider_id TEXT,
      match_type TEXT NOT NULL CHECK (match_type IN ('provider_id', 'name_prefix', 'name_contains', 'manual')),
      match_value TEXT NOT NULL,
      confidence TEXT NOT NULL DEFAULT 'manual',
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_report_jobs (
      id TEXT PRIMARY KEY,
      provider_report_job_id TEXT NOT NULL UNIQUE,
      report_type TEXT NOT NULL,
      stat_date DATE NOT NULL,
      status TEXT NOT NULL,
      download_url TEXT,
      status_message TEXT,
      synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_report_files (
      id TEXT PRIMARY KEY,
      report_job_id TEXT NOT NULL REFERENCES search_ad_report_jobs(id) ON DELETE CASCADE,
      storage_backend TEXT NOT NULL DEFAULT 'postgres',
      raw_text TEXT NOT NULL,
      checksum TEXT NOT NULL,
      content_type TEXT,
      parser_version TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (report_job_id, checksum)
    );

    CREATE TABLE IF NOT EXISTS search_ad_report_rows (
      id TEXT PRIMARY KEY,
      report_file_id TEXT NOT NULL REFERENCES search_ad_report_files(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      raw_row JSONB NOT NULL,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      mapping_status TEXT NOT NULL DEFAULT 'unmapped',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (report_file_id, row_number)
    );

    CREATE TABLE IF NOT EXISTS search_ad_report_normalized_rows (
      id TEXT PRIMARY KEY,
      report_row_id TEXT NOT NULL REFERENCES search_ad_report_rows(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL,
      brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      campaign_id TEXT,
      campaign_name TEXT,
      adgroup_id TEXT,
      adgroup_name TEXT,
      keyword_id TEXT,
      keyword_text TEXT,
      search_term TEXT,
      ad_id TEXT,
      criterion_id TEXT,
      extension_id TEXT,
      media_id TEXT,
      device TEXT,
      impressions NUMERIC NOT NULL DEFAULT 0,
      clicks NUMERIC NOT NULL DEFAULT 0,
      cost NUMERIC NOT NULL DEFAULT 0,
      conversions NUMERIC NOT NULL DEFAULT 0,
      sales_amount NUMERIC NOT NULL DEFAULT 0,
      source_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_backfill_runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'waiting', 'completed', 'failed')),
      input_json JSONB NOT NULL,
      result_json JSONB,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_campaign_snapshots (
      id TEXT PRIMARY KEY,
      provider_campaign_id TEXT NOT NULL,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      name TEXT NOT NULL,
      campaign_type TEXT,
      user_lock BOOLEAN,
      status TEXT,
      status_reason TEXT,
      raw_payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (provider_campaign_id, collected_at)
    );

    CREATE TABLE IF NOT EXISTS search_ad_adgroup_snapshots (
      id TEXT PRIMARY KEY,
      provider_adgroup_id TEXT NOT NULL,
      provider_campaign_id TEXT,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      name TEXT NOT NULL,
      adgroup_type TEXT,
      user_lock BOOLEAN,
      status TEXT,
      status_reason TEXT,
      bid_amount NUMERIC,
      daily_budget NUMERIC,
      raw_payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (provider_adgroup_id, collected_at)
    );

    CREATE TABLE IF NOT EXISTS search_ad_keyword_snapshots (
      id TEXT PRIMARY KEY,
      provider_keyword_id TEXT NOT NULL,
      provider_adgroup_id TEXT,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      keyword_text TEXT NOT NULL,
      user_lock BOOLEAN,
      status TEXT,
      status_reason TEXT,
      bid_amount NUMERIC,
      raw_payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (provider_keyword_id, collected_at)
    );

    CREATE TABLE IF NOT EXISTS search_ad_ad_snapshots (
      id TEXT PRIMARY KEY,
      provider_ad_id TEXT NOT NULL,
      provider_adgroup_id TEXT,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      name TEXT NOT NULL,
      ad_type TEXT,
      user_lock BOOLEAN,
      status TEXT,
      status_reason TEXT,
      pc_final_url TEXT,
      mobile_final_url TEXT,
      raw_payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (provider_ad_id, collected_at)
    );

    CREATE TABLE IF NOT EXISTS search_ad_target_snapshots (
      id TEXT PRIMARY KEY,
      provider_target_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('adgroup', 'ad')),
      owner_name TEXT,
      brand_key TEXT CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      target_type TEXT NOT NULL,
      target_type_label TEXT NOT NULL,
      setting_label TEXT NOT NULL,
      target_payload JSONB NOT NULL,
      raw_payload JSONB NOT NULL,
      collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (provider_target_id, collected_at)
    );

    CREATE TABLE IF NOT EXISTS search_ad_rule_criteria (
      id TEXT PRIMARY KEY,
      brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      period_days INTEGER NOT NULL,
      min_impressions NUMERIC NOT NULL DEFAULT 100,
      min_clicks NUMERIC NOT NULL DEFAULT 10,
      min_cost NUMERIC NOT NULL DEFAULT 10000,
      target_cpa NUMERIC,
      target_roas NUMERIC,
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_operation_strategies (
      id TEXT PRIMARY KEY,
      brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      scope_label TEXT NOT NULL,
      strategy_type TEXT NOT NULL CHECK (strategy_type IN ('standard', 'seasonal_expansion')),
      initial_schedule_label TEXT NOT NULL,
      minimum_data_days INTEGER NOT NULL,
      minimum_clicks NUMERIC NOT NULL DEFAULT 1,
      minimum_cost NUMERIC NOT NULL DEFAULT 0,
      narrowing_rule TEXT NOT NULL,
      approval_rule TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_rule_results (
      id TEXT PRIMARY KEY,
      brand_key TEXT NOT NULL CHECK (brand_key IN ('coffeeprint', 'stickersee')),
      ad_product_type TEXT NOT NULL CHECK (ad_product_type IN ('powerlink', 'shopping_search')),
      category TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      target_label TEXT NOT NULL,
      severity TEXT NOT NULL,
      period_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      metrics JSONB NOT NULL,
      evidence_packet JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_action_previews (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK (target_type IN ('campaign', 'adgroup', 'keyword')),
      target_id TEXT NOT NULL,
      requested_action TEXT NOT NULL CHECK (requested_action IN ('turn_on', 'turn_off')),
      before_state JSONB NOT NULL,
      after_state JSONB NOT NULL,
      impact_summary JSONB NOT NULL,
      write_gate_open BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_action_logs (
      id TEXT PRIMARY KEY,
      preview_id TEXT NOT NULL REFERENCES search_ad_action_previews(id),
      status TEXT NOT NULL CHECK (status IN ('blocked', 'applied', 'failed')),
      provider_request JSONB,
      provider_response JSONB,
      error_message TEXT,
      actor TEXT NOT NULL DEFAULT 'owner',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS search_ad_operation_calendar_locks (
      target_type TEXT NOT NULL CHECK (target_type IN ('adgroup')),
      target_id TEXT NOT NULL,
      brand_key TEXT,
      ad_product_type TEXT,
      target_label TEXT NOT NULL,
      lock_date DATE NOT NULL,
      locked_reason TEXT NOT NULL,
      action_preview_id TEXT NOT NULL,
      action_log_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'released')),
      locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      released_at TIMESTAMPTZ,
      release_action_log_id TEXT,
      PRIMARY KEY (target_type, target_id)
    );

    CREATE INDEX IF NOT EXISTS search_ad_report_jobs_stat_date_idx
      ON search_ad_report_jobs (stat_date DESC, report_type);

    CREATE INDEX IF NOT EXISTS search_ad_normalized_brand_type_date_idx
      ON search_ad_report_normalized_rows (brand_key, ad_product_type, source_date DESC);

    CREATE INDEX IF NOT EXISTS search_ad_normalized_report_row_id_idx
      ON search_ad_report_normalized_rows (report_row_id);

    CREATE INDEX IF NOT EXISTS search_ad_backfill_runs_updated_idx
      ON search_ad_backfill_runs (updated_at DESC);

    CREATE INDEX IF NOT EXISTS search_ad_operation_calendar_locks_status_idx
      ON search_ad_operation_calendar_locks (status, lock_date DESC);

    CREATE INDEX IF NOT EXISTS search_ad_rule_results_brand_category_idx
      ON search_ad_rule_results (brand_key, ad_product_type, category, created_at DESC);

    CREATE INDEX IF NOT EXISTS search_ad_campaign_latest_idx
      ON search_ad_campaign_snapshots (provider_campaign_id, collected_at DESC);

    CREATE INDEX IF NOT EXISTS search_ad_adgroup_latest_idx
      ON search_ad_adgroup_snapshots (provider_adgroup_id, collected_at DESC);

    CREATE INDEX IF NOT EXISTS search_ad_ad_latest_idx
      ON search_ad_ad_snapshots (provider_ad_id, collected_at DESC);

    CREATE INDEX IF NOT EXISTS search_ad_target_latest_idx
      ON search_ad_target_snapshots (provider_target_id, collected_at DESC);
  `);

  await query(`
    ALTER TABLE search_ad_report_normalized_rows
      ADD COLUMN IF NOT EXISTS ad_id TEXT,
      ADD COLUMN IF NOT EXISTS criterion_id TEXT,
      ADD COLUMN IF NOT EXISTS extension_id TEXT,
      ADD COLUMN IF NOT EXISTS media_id TEXT,
      ADD COLUMN IF NOT EXISTS device TEXT;
  `);
  await query(`
    ALTER TABLE search_ad_action_previews
      DROP CONSTRAINT IF EXISTS search_ad_action_previews_target_type_check;
    ALTER TABLE search_ad_action_previews
      ADD CONSTRAINT search_ad_action_previews_target_type_check
      CHECK (target_type IN ('campaign', 'adgroup', 'keyword'));
  `);
}

async function listSearchAdReportsFromDb(filters: SearchAdFilters, limit: number): Promise<SearchAdReportJobRecord[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.adProduct !== "all") {
    const shopping = filters.adProduct === "shopping_search";
    clauses.push(shopping ? "j.report_type LIKE 'SHOPPING%'" : "j.report_type NOT LIKE 'SHOPPING%'");
  }
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM search_ad_report_files brand_file
        JOIN search_ad_report_rows brand_row ON brand_row.report_file_id = brand_file.id
        WHERE brand_file.report_job_id = j.id
          AND brand_row.brand_key = $${values.length}
      )
    `);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const safeLimit = Number.isFinite(limit) ? Math.max(1, limit) : 100;

  const result = await query<ReportJobRow>(
    `
      WITH limited_jobs AS (
        SELECT
          j.id,
          j.provider_report_job_id,
          j.report_type,
          j.stat_date,
          j.status,
          j.download_url,
          j.synced_at,
          j.updated_at
        FROM search_ad_report_jobs j
        ${where}
        ORDER BY j.stat_date DESC, j.updated_at DESC
        LIMIT ${safeLimit}
      ),
      file_summary AS (
        SELECT
          f.report_job_id,
          COALESCE(SUM(f.row_count), 0)::int AS row_count
        FROM search_ad_report_files f
        JOIN limited_jobs j ON j.id = f.report_job_id
        GROUP BY f.report_job_id
      ),
      row_summary AS (
        SELECT
          f.report_job_id,
          COALESCE(jsonb_agg(DISTINCT r.brand_key) FILTER (WHERE r.brand_key IS NOT NULL), '[]'::jsonb) AS mapped_brands,
          COALESCE(SUM(n.impressions), 0) AS impressions,
          COALESCE(SUM(n.clicks), 0) AS clicks,
          COALESCE(SUM(n.cost), 0) AS cost,
          COALESCE(SUM(n.conversions), 0) AS conversions,
          COALESCE(SUM(n.sales_amount), 0) AS sales_amount
        FROM search_ad_report_files f
        JOIN limited_jobs j ON j.id = f.report_job_id
        LEFT JOIN search_ad_report_rows r ON r.report_file_id = f.id
        LEFT JOIN search_ad_report_normalized_rows n ON n.report_row_id = r.id
        GROUP BY f.report_job_id
      )
      SELECT
        j.id,
        j.provider_report_job_id,
        j.report_type,
        j.stat_date,
        j.status,
        j.download_url,
        j.synced_at,
        COALESCE(f.row_count, 0)::int AS row_count,
        COALESCE(r.mapped_brands, '[]'::jsonb) AS mapped_brands,
        jsonb_build_object(
          'impressions', COALESCE(r.impressions, 0),
          'clicks', COALESCE(r.clicks, 0),
          'cost', COALESCE(r.cost, 0),
          'conversions', COALESCE(r.conversions, 0),
          'salesAmount', COALESCE(r.sales_amount, 0)
        ) AS summary
      FROM limited_jobs j
      LEFT JOIN file_summary f ON f.report_job_id = j.id
      LEFT JOIN row_summary r ON r.report_job_id = j.id
      ORDER BY j.stat_date DESC, j.updated_at DESC
    `,
    values,
  );

  return result.rows.map(mapReportJobRow);
}

async function listSearchAdRuleResultsFromDb(
  filters: SearchAdFilters & Partial<Pick<SearchAdRuleResultFilters, "actionIntent">>,
  limit: number,
): Promise<SearchAdRuleResult[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`ad_product_type = $${values.length}`);
  }
  if (filters.actionIntent && filters.actionIntent !== "all") {
    values.push(filters.actionIntent);
    clauses.push(`evidence_packet ->> 'actionIntent' = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await query<RuleResultRow>(
    `
      SELECT id, brand_key, ad_product_type, category, target_type, target_id, target_label, severity, period_days, reason, metrics, evidence_packet, created_at
      FROM search_ad_rule_results
      ${where}
      ORDER BY created_at DESC
      LIMIT ${Number.isFinite(limit) ? Math.max(1, limit) : 100}
    `,
    values,
  );

  return result.rows.map(mapRuleResultRow);
}

async function getSearchAdRuleResultById(id: string): Promise<SearchAdRuleResult | undefined> {
  const result = await query<RuleResultRow>(
    `
      SELECT id, brand_key, ad_product_type, category, target_type, target_id, target_label, severity, period_days, reason, metrics, evidence_packet, created_at
      FROM search_ad_rule_results
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ? mapRuleResultRow(result.rows[0]) : undefined;
}

async function listLatestStateSnapshots(targetType: SearchAdTargetType, filters: SearchAdFilters): Promise<SearchAdStateRecord[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`ad_product_type = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  if (targetType === "campaign") {
    const result = await query<{
      id: string;
      provider_campaign_id: string;
      brand_key: BrandKey | null;
      ad_product_type: AdProductType | null;
      name: string;
      user_lock: boolean | null;
      status: string | null;
      status_reason: string | null;
      collected_at: string | Date;
    }>(
      `
        SELECT DISTINCT ON (provider_campaign_id)
          id, provider_campaign_id, brand_key, ad_product_type, name, user_lock, status, status_reason, collected_at
        FROM search_ad_campaign_snapshots
        ${where}
        ORDER BY provider_campaign_id, collected_at DESC
      `,
      values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      targetType: "campaign",
      providerId: row.provider_campaign_id,
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.name,
      userLock: row.user_lock,
      status: row.status ?? undefined,
      statusReason: row.status_reason ?? undefined,
      collectedAt: toIso(row.collected_at),
    }));
  }

  if (targetType === "adgroup") {
    const result = await query<{
      id: string;
      provider_adgroup_id: string;
      provider_campaign_id: string | null;
      brand_key: BrandKey | null;
      ad_product_type: AdProductType | null;
      name: string;
      user_lock: boolean | null;
      status: string | null;
      status_reason: string | null;
      bid_amount: string | null;
      daily_budget: string | null;
      collected_at: string | Date;
    }>(
      `
        SELECT DISTINCT ON (provider_adgroup_id)
          id, provider_adgroup_id, provider_campaign_id, brand_key, ad_product_type, name, user_lock, status, status_reason,
          bid_amount, daily_budget, collected_at
        FROM search_ad_adgroup_snapshots
        ${where}
        ORDER BY provider_adgroup_id, collected_at DESC
      `,
      values,
    );

    return result.rows.map((row) => ({
      id: row.id,
      targetType: "adgroup",
      providerId: row.provider_adgroup_id,
      parentProviderId: row.provider_campaign_id ?? undefined,
      brandKey: row.brand_key ?? undefined,
      adProductType: row.ad_product_type ?? undefined,
      name: row.name,
      userLock: row.user_lock,
      status: row.status ?? undefined,
      statusReason: row.status_reason ?? undefined,
      bidAmount: row.bid_amount === null ? null : Number(row.bid_amount),
      dailyBudget: row.daily_budget === null ? null : Number(row.daily_budget),
      collectedAt: toIso(row.collected_at),
    }));
  }

  const result = await query<{
    id: string;
    provider_keyword_id: string;
    provider_adgroup_id: string | null;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    keyword_text: string;
    user_lock: boolean | null;
    status: string | null;
    status_reason: string | null;
    bid_amount: string | null;
    collected_at: string | Date;
  }>(
    `
      SELECT DISTINCT ON (provider_keyword_id)
        id, provider_keyword_id, provider_adgroup_id, brand_key, ad_product_type, keyword_text, user_lock, status, status_reason,
        bid_amount, collected_at
      FROM search_ad_keyword_snapshots
      ${where}
      ORDER BY provider_keyword_id, collected_at DESC
      LIMIT 500
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    targetType: "keyword",
    providerId: row.provider_keyword_id,
    parentProviderId: row.provider_adgroup_id ?? undefined,
    brandKey: row.brand_key ?? undefined,
    adProductType: row.ad_product_type ?? undefined,
    name: row.keyword_text,
    userLock: row.user_lock,
    status: row.status ?? undefined,
    statusReason: row.status_reason ?? undefined,
    bidAmount: row.bid_amount === null ? null : Number(row.bid_amount),
    collectedAt: toIso(row.collected_at),
  }));
}

async function listLatestKeywordStatesForCleanup(filters: SearchAdFilters): Promise<SearchAdKeywordStateForCleanup[]> {
  const clauses = ["k.brand_key IS NOT NULL", "k.ad_product_type IS NOT NULL"];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`k.brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`k.ad_product_type = $${values.length}`);
  }

  const result = await query<{
    provider_keyword_id: string;
    provider_adgroup_id: string | null;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    keyword_text: string;
    user_lock: boolean | null;
    status: string | null;
    status_reason: string | null;
    bid_amount: string | null;
    collected_at: string | Date;
    adgroup_name: string | null;
    provider_campaign_id: string | null;
    campaign_name: string | null;
  }>(
    `
      WITH latest_keywords AS (
        SELECT DISTINCT ON (provider_keyword_id)
          provider_keyword_id,
          provider_adgroup_id,
          brand_key,
          ad_product_type,
          keyword_text,
          user_lock,
          status,
          status_reason,
          bid_amount,
          collected_at
        FROM search_ad_keyword_snapshots
        ORDER BY provider_keyword_id, collected_at DESC
      ),
      latest_adgroups AS (
        SELECT DISTINCT ON (provider_adgroup_id)
          provider_adgroup_id,
          provider_campaign_id,
          name
        FROM search_ad_adgroup_snapshots
        ORDER BY provider_adgroup_id, collected_at DESC
      ),
      latest_campaigns AS (
        SELECT DISTINCT ON (provider_campaign_id)
          provider_campaign_id,
          name
        FROM search_ad_campaign_snapshots
        ORDER BY provider_campaign_id, collected_at DESC
      )
      SELECT
        k.provider_keyword_id,
        k.provider_adgroup_id,
        k.brand_key,
        k.ad_product_type,
        k.keyword_text,
        k.user_lock,
        k.status,
        k.status_reason,
        k.bid_amount,
        k.collected_at,
        ag.name AS adgroup_name,
        ag.provider_campaign_id,
        c.name AS campaign_name
      FROM latest_keywords k
      LEFT JOIN latest_adgroups ag ON ag.provider_adgroup_id = k.provider_adgroup_id
      LEFT JOIN latest_campaigns c ON c.provider_campaign_id = ag.provider_campaign_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY k.brand_key, k.ad_product_type, lower(k.keyword_text), ag.name NULLS LAST
      LIMIT 10000
    `,
    values,
  );

  return result.rows.map((row) => ({
    keywordId: row.provider_keyword_id,
    keywordText: row.keyword_text,
    brandKey: row.brand_key,
    adProductType: row.ad_product_type,
    campaignId: row.provider_campaign_id ?? undefined,
    campaignName: row.campaign_name ?? undefined,
    adgroupId: row.provider_adgroup_id ?? undefined,
    adgroupName: row.adgroup_name ?? undefined,
    userLock: row.user_lock,
    status: row.status ?? undefined,
    statusReason: row.status_reason ?? undefined,
    bidAmount: row.bid_amount === null ? null : Number(row.bid_amount),
    collectedAt: toIso(row.collected_at),
  }));
}

async function listKeywordPerformanceForCleanup(
  filters: SearchAdFilters,
  keywords: SearchAdKeywordStateForCleanup[],
): Promise<SearchAdKeywordPerformanceForCleanup[]> {
  const scopedKeywords = keywords.filter((keyword) => {
    const brandMatched = filters.brand === "all" || keyword.brandKey === filters.brand;
    const adProductMatched = filters.adProduct === "all" || keyword.adProductType === filters.adProduct;
    return brandMatched && adProductMatched && normalizeKeywordText(keyword.keywordText);
  });
  if (scopedKeywords.length === 0) {
    return [];
  }

  const keywordIds = scopedKeywords.map((keyword) => keyword.keywordId);

  const result = await query<{
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    keyword_id: string | null;
    keyword_text: string | null;
    adgroup_id: string | null;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    sales_amount: string;
    data_days: string;
    start_date: string | Date | null;
    end_date: string | Date | null;
  }>(
    `
      WITH bounds AS (
        SELECT MAX(source_date) AS end_date
        FROM search_ad_report_normalized_rows
      )
      SELECT
        n.brand_key,
        n.ad_product_type,
        NULLIF(n.keyword_id, '') AS keyword_id,
        MIN(NULLIF(n.keyword_text, '')) AS keyword_text,
        MIN(NULLIF(n.adgroup_id, '')) AS adgroup_id,
        SUM(n.impressions)::text AS impressions,
        SUM(n.clicks)::text AS clicks,
        SUM(n.cost)::text AS cost,
        SUM(n.conversions)::text AS conversions,
        SUM(n.sales_amount)::text AS sales_amount,
        COUNT(DISTINCT n.source_date)::text AS data_days,
        MIN(n.source_date) AS start_date,
        MAX(n.source_date) AS end_date
      FROM search_ad_report_normalized_rows n
      CROSS JOIN bounds
      WHERE bounds.end_date IS NOT NULL
        AND n.source_date >= (bounds.end_date - INTERVAL '364 days')::date
        AND NULLIF(n.keyword_id, '') = ANY($1::text[])
      GROUP BY n.brand_key, n.ad_product_type, NULLIF(n.keyword_id, '')
    `,
    [keywordIds],
  );

  return result.rows.map((row) => ({
    brandKey: row.brand_key,
    adProductType: row.ad_product_type,
    keywordId: row.keyword_id ?? undefined,
    keywordText: row.keyword_text ?? undefined,
    adgroupId: row.adgroup_id ?? undefined,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    cost: Number(row.cost),
    conversions: Number(row.conversions),
    salesAmount: Number(row.sales_amount),
    dataDays: Number(row.data_days),
    startDate: row.start_date ? toDate(row.start_date) : undefined,
    endDate: row.end_date ? toDate(row.end_date) : undefined,
  }));
}

async function listKeywordCoverageForCleanup(filters: SearchAdFilters): Promise<SearchAdKeywordCoverageForCleanup[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`ad_product_type = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await query<{
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    start_date: string | Date | null;
    end_date: string | Date | null;
    actual_days: string;
  }>(
    `
      SELECT
        brand_key,
        ad_product_type,
        MIN(source_date) AS start_date,
        MAX(source_date) AS end_date,
        COUNT(DISTINCT source_date)::text AS actual_days
      FROM search_ad_report_normalized_rows
      ${where}
      GROUP BY brand_key, ad_product_type
      ORDER BY brand_key, ad_product_type
    `,
    values,
  );

  return result.rows.map((row) => ({
    brandKey: row.brand_key,
    adProductType: row.ad_product_type,
    startDate: row.start_date ? toDate(row.start_date) : undefined,
    endDate: row.end_date ? toDate(row.end_date) : undefined,
    actualDays: Number(row.actual_days),
  }));
}

async function listLatestTargetSettings(filters: SearchAdFilters): Promise<SearchAdTargetSettingRecord[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`ad_product_type = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query<{
    id: string;
    provider_target_id: string;
    owner_id: string;
    owner_name: string | null;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    target_type: string;
    target_type_label: string;
    setting_label: string;
    collected_at: string | Date;
  }>(
    `
      SELECT DISTINCT ON (provider_target_id)
        id, provider_target_id, owner_id, owner_name, brand_key, ad_product_type,
        target_type, target_type_label, setting_label, collected_at
      FROM search_ad_target_snapshots
      ${where}
      ORDER BY provider_target_id, collected_at DESC
      LIMIT 500
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    providerTargetId: row.provider_target_id,
    ownerId: row.owner_id,
    ownerName: row.owner_name ?? undefined,
    brandKey: row.brand_key ?? undefined,
    adProductType: row.ad_product_type ?? undefined,
    targetType: row.target_type,
    targetTypeLabel: row.target_type_label,
    settingLabel: row.setting_label,
    collectedAt: toIso(row.collected_at),
  }));
}

async function listNormalizedRowsByFilters(filters: SearchAdFilters, limit: number): Promise<SearchAdNormalizedRow[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`ad_product_type = $${values.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const result = await query<{
    id: string;
    report_row_id: string;
    report_type: SearchAdReportType;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    campaign_id: string | null;
    campaign_name: string | null;
    adgroup_id: string | null;
    adgroup_name: string | null;
    keyword_id: string | null;
    keyword_text: string | null;
    search_term: string | null;
    ad_id: string | null;
    criterion_id: string | null;
    extension_id: string | null;
    media_id: string | null;
    device: string | null;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    sales_amount: string;
    source_date: string | Date;
  }>(
    `
      SELECT *
      FROM search_ad_report_normalized_rows
      ${where}
      ORDER BY source_date DESC, cost DESC, clicks DESC
      LIMIT ${Number.isFinite(limit) ? Math.max(1, limit) : 100}
    `,
    values,
  );

  return result.rows.map(mapNormalizedRow);
}

async function listNormalizedRowsForRuleCriteria(criteriaList: SearchAdRuleCriteria[]): Promise<SearchAdNormalizedRow[]> {
  const enabledCriteria = criteriaList.filter((item) => item.enabled);
  if (enabledCriteria.length === 0) {
    return [];
  }

  const latestByScope = await listLatestSourceDateByRuleScope(enabledCriteria);
  const windows = enabledCriteria.flatMap((criteria) => {
    const endDate = latestByScope.get(ruleCriteriaScopeKey(criteria));
    if (!endDate) {
      return [];
    }

    return [
      {
        adProductType: criteria.adProductType,
        brandKey: criteria.brandKey,
        endDate,
        startDate: addDateDays(endDate, -(criteria.periodDays - 1)),
      },
    ];
  });

  if (windows.length === 0) {
    return [];
  }

  const values: unknown[] = [];
  const clauses = windows.map((window) => {
    values.push(window.brandKey, window.adProductType, window.startDate, window.endDate);
    const offset = values.length - 3;
    return `(brand_key = $${offset} AND ad_product_type = $${offset + 1} AND source_date >= $${offset + 2}::date AND source_date <= $${offset + 3}::date)`;
  });

  const result = await query<{
    id: string;
    report_row_id: string;
    report_type: SearchAdReportType;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    campaign_id: string | null;
    campaign_name: string | null;
    adgroup_id: string | null;
    adgroup_name: string | null;
    keyword_id: string | null;
    keyword_text: string | null;
    search_term: string | null;
    ad_id: string | null;
    criterion_id: string | null;
    extension_id: string | null;
    media_id: string | null;
    device: string | null;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    sales_amount: string;
    source_date: string | Date;
  }>(
    `
      SELECT *
      FROM search_ad_report_normalized_rows
      WHERE ${clauses.join(" OR ")}
      ORDER BY source_date DESC, cost DESC, clicks DESC
    `,
    values,
  );

  return result.rows.map(mapNormalizedRow);
}

async function replaceSearchAdRuleResults(results: SearchAdRuleResult[]) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM search_ad_rule_results");

    if (results.length > 0) {
      const values: unknown[] = [];
      const placeholders = results.map((result) => {
        values.push(
          result.id,
          result.brandKey,
          result.adProductType,
          result.category,
          result.targetType,
          result.targetId ?? null,
          result.targetLabel,
          result.severity,
          result.periodDays,
          result.reason,
          JSON.stringify(result.metrics),
          JSON.stringify(result.evidencePacket),
          result.createdAt,
        );
        const offset = values.length - 12;
        return `($${offset}, $${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`;
      });

      await client.query(
        `
          INSERT INTO search_ad_rule_results (
            id, brand_key, ad_product_type, category, target_type, target_id, target_label, severity,
            period_days, reason, metrics, evidence_packet, created_at
          )
          VALUES ${placeholders.join(", ")}
        `,
        values,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function listLatestSourceDateByRuleScope(criteriaList: SearchAdRuleCriteria[]): Promise<Map<string, string>> {
  const values: unknown[] = [];
  const clauses = criteriaList.map((criteria) => {
    values.push(criteria.brandKey, criteria.adProductType);
    const offset = values.length - 1;
    return `(brand_key = $${offset} AND ad_product_type = $${offset + 1})`;
  });

  const result = await query<{
    ad_product_type: AdProductType;
    brand_key: BrandKey;
    end_date: string | Date | null;
  }>(
    `
      SELECT brand_key, ad_product_type, MAX(source_date) AS end_date
      FROM search_ad_report_normalized_rows
      WHERE ${clauses.join(" OR ")}
      GROUP BY brand_key, ad_product_type
    `,
    values,
  );

  return new Map(result.rows.filter((row) => row.end_date).map((row) => [`${row.brand_key}:${row.ad_product_type}`, toDate(row.end_date as string | Date)]));
}

async function listNormalizedRowsByIds(ids: string[]): Promise<SearchAdNormalizedRow[]> {
  if (ids.length === 0) {
    return [];
  }

  const result = await query<{
    id: string;
    report_row_id: string;
    report_type: SearchAdReportType;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    campaign_id: string | null;
    campaign_name: string | null;
    adgroup_id: string | null;
    adgroup_name: string | null;
    keyword_id: string | null;
    keyword_text: string | null;
    search_term: string | null;
    ad_id: string | null;
    criterion_id: string | null;
    extension_id: string | null;
    media_id: string | null;
    device: string | null;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    sales_amount: string;
    source_date: string | Date;
  }>(
    `
      SELECT *
      FROM search_ad_report_normalized_rows
      WHERE id = ANY($1::text[])
      ORDER BY source_date DESC, cost DESC, clicks DESC
      LIMIT 100
    `,
    [ids],
  );

  return result.rows.map(mapNormalizedRow);
}

async function listNormalizedDataCoverage(): Promise<Map<string, DataCoverageRecord>> {
  const result = await query<{
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    start_date: string | Date;
    end_date: string | Date;
    actual_days: string;
  }>(`
    SELECT
      brand_key,
      ad_product_type,
      MIN(source_date) AS start_date,
      MAX(source_date) AS end_date,
      COUNT(DISTINCT source_date)::text AS actual_days
    FROM search_ad_report_normalized_rows
    GROUP BY brand_key, ad_product_type
  `);

  return new Map(
    result.rows.map((row) => [
      coverageKey(row.brand_key, row.ad_product_type),
      {
        brandKey: row.brand_key,
        adProductType: row.ad_product_type,
        startDate: toDate(row.start_date),
        endDate: toDate(row.end_date),
        actualDays: Number(row.actual_days),
      },
    ]),
  );
}

async function listLatestAdCreativeLookup(): Promise<Map<string, AdCreativeLookupValue>> {
  const result = await query<{
    provider_ad_id: string;
    name: string | null;
    pc_final_url: string | null;
    mobile_final_url: string | null;
    raw_payload: Record<string, unknown> | null;
    status: string | null;
    status_reason: string | null;
  }>(`
    SELECT DISTINCT ON (provider_ad_id)
      provider_ad_id, name, pc_final_url, mobile_final_url, raw_payload, status, status_reason
    FROM search_ad_ad_snapshots
    ORDER BY provider_ad_id, collected_at DESC
  `);

  return new Map(
    result.rows.map((row) => {
      const product = extractSearchAdProductEvidence(row.raw_payload);
      return [
        row.provider_ad_id,
        {
          name: row.name ?? undefined,
          pcFinalUrl: row.pc_final_url ?? undefined,
          mobileFinalUrl: row.mobile_final_url ?? undefined,
          productName: product.productName,
          productImageUrl: product.productImageUrl,
          mallName: product.mallName,
          mallProductId: product.mallProductId,
          status: row.status ?? undefined,
          statusReason: row.status_reason ?? undefined,
        },
      ];
    }),
  );
}

function enrichRuleResultsWithEvidenceContext(
  results: SearchAdRuleResult[],
  coverageByScope: Map<string, DataCoverageRecord>,
  adCreativeById: Map<string, AdCreativeLookupValue>,
): SearchAdRuleResult[] {
  return results.map((result) => {
    const coverage = coverageByScope.get(coverageKey(result.brandKey, result.adProductType));
    const adId = evidenceString(result.evidencePacket.adId) ?? (result.targetType === "ad" ? result.targetId : undefined);
    const adCreative = adId ? adCreativeById.get(adId) : undefined;

    return {
      ...result,
      evidencePacket: {
        ...result.evidencePacket,
        criteriaPeriodDays: result.periodDays,
        actualDataDays: result.evidencePacket.actualDataDays ?? coverage?.actualDays ?? null,
        dataWindowStart: result.evidencePacket.dataWindowStart ?? coverage?.startDate ?? null,
        dataWindowEnd: result.evidencePacket.dataWindowEnd ?? coverage?.endDate ?? null,
        dataCoverageLabel: result.evidencePacket.dataCoverageLabel ?? (coverage ? formatDataCoverageLabel(coverage, result.periodDays) : null),
        adHeadline: result.evidencePacket.adHeadline ?? adCreative?.name ?? null,
        pcFinalUrl: result.evidencePacket.pcFinalUrl ?? adCreative?.pcFinalUrl ?? null,
        mobileFinalUrl: result.evidencePacket.mobileFinalUrl ?? adCreative?.mobileFinalUrl ?? null,
        productName: result.evidencePacket.productName ?? adCreative?.productName ?? null,
        productImageUrl: result.evidencePacket.productImageUrl ?? adCreative?.productImageUrl ?? null,
        mallName: result.evidencePacket.mallName ?? adCreative?.mallName ?? null,
        mallProductId: result.evidencePacket.mallProductId ?? adCreative?.mallProductId ?? null,
        adStatus: result.evidencePacket.adStatus ?? adCreative?.status ?? null,
        adStatusReason: result.evidencePacket.adStatusReason ?? adCreative?.statusReason ?? null,
      },
    };
  });
}

function coverageKey(brandKey: BrandKey, adProductType: AdProductType) {
  return `${brandKey}:${adProductType}`;
}

function formatDataCoverageLabel(coverage: DataCoverageRecord, periodDays: number) {
  const dateLabel = coverage.startDate === coverage.endDate ? `수집 기준일 ${coverage.endDate}` : `수집 ${coverage.startDate}~${coverage.endDate}`;
  return `${dateLabel} · ${formatCoverageBasisLabel(coverage.actualDays, periodDays)}`;
}

function formatCoverageBasisLabel(actualDays: number, periodDays: number) {
  if (actualDays >= periodDays) {
    return `최근 ${periodDays.toLocaleString("ko-KR")}일 기준`;
  }

  const actualLabel = actualDays === 1 ? "1일 기준" : `실제 ${actualDays.toLocaleString("ko-KR")}일 기준`;
  return `${actualLabel} (목표 ${periodDays.toLocaleString("ko-KR")}일)`;
}

function evidenceString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getRuleResultSourceRowIds(result: SearchAdRuleResult) {
  const sourceRowIds = result.evidencePacket.sourceRowIds;
  if (Array.isArray(sourceRowIds)) {
    return sourceRowIds.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 100);
  }

  const normalizedRowId = evidenceString(result.evidencePacket.normalizedRowId);
  if (normalizedRowId) {
    return [normalizedRowId];
  }

  const rowId = evidenceString(result.evidencePacket.rowId);
  return rowId ? [rowId] : [];
}

function createSampleRuleResultDetailView(id: string): SearchAdRuleResultDetailView | undefined {
  const result = SAMPLE_RULE_RESULTS.find((item) => item.id === id);
  if (!result) {
    return undefined;
  }

  const sourceIds = new Set(getRuleResultSourceRowIds(result));
  const relatedRows = SAMPLE_NORMALIZED_ROWS.filter(
    (row) =>
      sourceIds.has(row.id) ||
      sourceIds.has(row.reportRowId) ||
      row.searchTerm === result.targetLabel ||
      row.keywordText === result.targetLabel ||
      row.adgroupName === result.targetLabel,
  );

  return {
    result,
    relatedRows,
    actionTarget: getRuleResultActionTarget(result),
  };
}

async function listSearchAdActionLogsFromDb(limit: number): Promise<SearchAdActionLogsView> {
  const previews = await query<{
    id: string;
    target_type: SearchAdTargetType;
    target_id: string;
    target_name: string | null;
    requested_action: SearchAdRequestedAction;
    before_state: SearchAdActionPreview["beforeState"];
    after_state: SearchAdActionPreview["afterState"];
    impact_summary: SearchAdActionPreview["impactSummary"];
    write_gate_open: boolean;
    created_at: string | Date;
  }>(
    `
      WITH latest_campaigns AS (
        SELECT DISTINCT ON (provider_campaign_id)
          provider_campaign_id, name
        FROM search_ad_campaign_snapshots
        ORDER BY provider_campaign_id, collected_at DESC
      ),
      latest_adgroups AS (
        SELECT DISTINCT ON (provider_adgroup_id)
          provider_adgroup_id, name
        FROM search_ad_adgroup_snapshots
        ORDER BY provider_adgroup_id, collected_at DESC
      ),
      latest_keywords AS (
        SELECT DISTINCT ON (provider_keyword_id)
          provider_keyword_id, keyword_text AS name
        FROM search_ad_keyword_snapshots
        ORDER BY provider_keyword_id, collected_at DESC
      )
      SELECT
        p.id,
        p.target_type,
        p.target_id,
        COALESCE(
          CASE
            WHEN p.target_type = 'campaign' THEN c.name
            WHEN p.target_type = 'adgroup' THEN a.name
            WHEN p.target_type = 'keyword' THEN k.name
          END,
          p.target_id
        ) AS target_name,
        p.requested_action,
        p.before_state,
        p.after_state,
        p.impact_summary,
        p.write_gate_open,
        p.created_at
      FROM search_ad_action_previews p
      LEFT JOIN latest_campaigns c ON p.target_type = 'campaign' AND c.provider_campaign_id = p.target_id
      LEFT JOIN latest_adgroups a ON p.target_type = 'adgroup' AND a.provider_adgroup_id = p.target_id
      LEFT JOIN latest_keywords k ON p.target_type = 'keyword' AND k.provider_keyword_id = p.target_id
      ORDER BY p.created_at DESC
      LIMIT ${Number.isFinite(limit) ? Math.max(1, limit) : 100}
    `,
  );

  const logs = await query<{
    id: string;
    preview_id: string;
    status: SearchAdActionLog["status"];
    error_message: string | null;
    created_at: string | Date;
    target_type: SearchAdTargetType;
    target_id: string;
    target_name: string | null;
    requested_action: SearchAdRequestedAction;
  }>(
    `
      WITH latest_campaigns AS (
        SELECT DISTINCT ON (provider_campaign_id)
          provider_campaign_id, name
        FROM search_ad_campaign_snapshots
        ORDER BY provider_campaign_id, collected_at DESC
      ),
      latest_adgroups AS (
        SELECT DISTINCT ON (provider_adgroup_id)
          provider_adgroup_id, name
        FROM search_ad_adgroup_snapshots
        ORDER BY provider_adgroup_id, collected_at DESC
      ),
      latest_keywords AS (
        SELECT DISTINCT ON (provider_keyword_id)
          provider_keyword_id, keyword_text AS name
        FROM search_ad_keyword_snapshots
        ORDER BY provider_keyword_id, collected_at DESC
      )
      SELECT
        l.id,
        l.preview_id,
        l.status,
        l.error_message,
        l.created_at,
        p.target_type,
        p.target_id,
        COALESCE(
          CASE
            WHEN p.target_type = 'campaign' THEN c.name
            WHEN p.target_type = 'adgroup' THEN a.name
            WHEN p.target_type = 'keyword' THEN k.name
          END,
          p.target_id
        ) AS target_name,
        p.requested_action
      FROM search_ad_action_logs l
      JOIN search_ad_action_previews p ON p.id = l.preview_id
      LEFT JOIN latest_campaigns c ON p.target_type = 'campaign' AND c.provider_campaign_id = p.target_id
      LEFT JOIN latest_adgroups a ON p.target_type = 'adgroup' AND a.provider_adgroup_id = p.target_id
      LEFT JOIN latest_keywords k ON p.target_type = 'keyword' AND k.provider_keyword_id = p.target_id
      ORDER BY l.created_at DESC
      LIMIT ${Number.isFinite(limit) ? Math.max(1, limit) : 100}
    `,
  );

  return {
    previews: previews.rows.map((row) => ({
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      targetLabel: row.target_name ?? row.target_id,
      requestedAction: row.requested_action,
      beforeState: row.before_state,
      afterState: row.after_state,
      impactSummary: row.impact_summary,
      writeGateOpen: row.write_gate_open,
      createdAt: toIso(row.created_at),
    })),
    logs: logs.rows.map((row) => ({
      id: row.id,
      previewId: row.preview_id,
      targetType: row.target_type,
      targetLabel: row.target_name ?? row.target_id,
      requestedAction: row.requested_action,
      actionLabel: row.requested_action === "turn_on" ? "켜기 요청" : "끄기 요청",
      status: row.status,
      reason: getActionLogReason(row.status, row.target_type, row.requested_action, row.error_message),
      createdAt: toIso(row.created_at),
    })),
  };
}

async function listNormalizedRowsForReport(reportId: string, filters: SearchAdFilters): Promise<SearchAdNormalizedRow[]> {
  const values: unknown[] = [reportId];
  const clauses = ["f.report_job_id = $1"];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`n.brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`n.ad_product_type = $${values.length}`);
  }

  const result = await query<{
    id: string;
    report_row_id: string;
    report_type: SearchAdReportType;
    brand_key: BrandKey;
    ad_product_type: AdProductType;
    campaign_id: string | null;
    campaign_name: string | null;
    adgroup_id: string | null;
    adgroup_name: string | null;
    keyword_id: string | null;
    keyword_text: string | null;
    search_term: string | null;
    ad_id: string | null;
    criterion_id: string | null;
    extension_id: string | null;
    media_id: string | null;
    device: string | null;
    impressions: string;
    clicks: string;
    cost: string;
    conversions: string;
    sales_amount: string;
    source_date: string | Date;
  }>(
    `
      SELECT n.*
      FROM search_ad_report_normalized_rows n
      JOIN search_ad_report_rows r ON r.id = n.report_row_id
      JOIN search_ad_report_files f ON f.id = r.report_file_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY n.cost DESC, n.clicks DESC
      LIMIT 100
    `,
    values,
  );

  return result.rows.map((row) => ({
    ...mapNormalizedRow(row),
  }));
}

async function listRawRowsForReport(reportId: string, filters: SearchAdFilters): Promise<SearchAdRawReportRow[]> {
  const values: unknown[] = [reportId];
  const clauses = ["f.report_job_id = $1"];
  if (filters.brand !== "all") {
    values.push(filters.brand);
    clauses.push(`r.brand_key = $${values.length}`);
  }
  if (filters.adProduct !== "all") {
    values.push(filters.adProduct);
    clauses.push(`r.ad_product_type = $${values.length}`);
  }

  const result = await query<{
    id: string;
    report_file_id: string;
    row_number: number;
    raw_row: Record<string, string | number | null>;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    mapping_status: SearchAdRawReportRow["mappingStatus"];
  }>(
    `
      SELECT r.id, r.report_file_id, r.row_number, r.raw_row, r.brand_key, r.ad_product_type, r.mapping_status
      FROM search_ad_report_rows r
      JOIN search_ad_report_files f ON f.id = r.report_file_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY r.row_number
      LIMIT 30
    `,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    reportFileId: row.report_file_id,
    rowNumber: row.row_number,
    rawRow: row.raw_row,
    brandKey: row.brand_key ?? undefined,
    adProductType: row.ad_product_type ?? undefined,
    mappingStatus: row.mapping_status,
  }));
}

function summarizeNormalizedRows(rows: SearchAdNormalizedRow[]) {
  return rows.reduce(
    (summary, row) => ({
      impressions: summary.impressions + row.impressions,
      clicks: summary.clicks + row.clicks,
      cost: summary.cost + row.cost,
      conversions: summary.conversions + row.conversions,
      salesAmount: summary.salesAmount + row.salesAmount,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, salesAmount: 0 },
  );
}

async function getSyncStatusFromDb() {
  const result = await query<{ last_report_sync_at: string | Date | null; last_state_sync_at: string | Date | null }>(`
    SELECT
      (SELECT MAX(synced_at) FROM search_ad_report_jobs) AS last_report_sync_at,
      GREATEST(
        COALESCE((SELECT MAX(collected_at) FROM search_ad_campaign_snapshots), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(collected_at) FROM search_ad_adgroup_snapshots), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(collected_at) FROM search_ad_keyword_snapshots), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(collected_at) FROM search_ad_ad_snapshots), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(collected_at) FROM search_ad_target_snapshots), 'epoch'::timestamptz)
      ) AS last_state_sync_at
  `);
  const lastStateSyncAt = result.rows[0]?.last_state_sync_at;

  return {
    lastReportSyncAt: result.rows[0]?.last_report_sync_at ? toIso(result.rows[0].last_report_sync_at) : null,
    lastStateSyncAt: lastStateSyncAt && String(lastStateSyncAt) !== "1970-01-01T00:00:00.000Z" ? toIso(lastStateSyncAt) : null,
    hasSearchAdCredentials: Boolean(process.env.NAVER_SEARCH_AD_ACCESS_LICENSE && process.env.NAVER_SEARCH_AD_SECRET_KEY && process.env.NAVER_SEARCH_AD_CUSTOMER_ID),
    searchAdWriteEnabled: isSearchAdWriteEnabled(),
    reportSchedule: getSearchAdReportScheduleStatus(),
  };
}

function mapReportJobRow(row: ReportJobRow): SearchAdReportJobRecord {
  const summary = row.summary ?? {};
  const reportType = row.report_type;
  return {
    id: row.id,
    providerReportJobId: row.provider_report_job_id,
    reportType,
    statDate: toDate(row.stat_date),
    status: row.status,
    displayName: getReportTypeLabel(reportType),
    downloadUrl: row.download_url ?? undefined,
    syncedAt: row.synced_at ? toIso(row.synced_at) : undefined,
    rowCount: Number(row.row_count ?? 0),
    mappedBrands: Array.isArray(row.mapped_brands) ? row.mapped_brands : [],
    parseStatus: row.status === "NONE" ? "파일 없음" : Number(row.row_count ?? 0) > 0 ? "완료" : "대기",
    summary: {
      impressions: Number(summary.impressions ?? 0),
      clicks: Number(summary.clicks ?? 0),
      cost: Number(summary.cost ?? 0),
      conversions: Number(summary.conversions ?? 0),
      salesAmount: Number(summary.salesAmount ?? 0),
      lowEfficiencyCount: 0,
      goodPerformanceCount: 0,
    },
  };
}

function mapRuleResultRow(row: RuleResultRow): SearchAdRuleResult {
  return {
    id: row.id,
    brandKey: row.brand_key,
    adProductType: row.ad_product_type,
    category: row.category,
    targetType: row.target_type,
    targetId: row.target_id ?? undefined,
    targetLabel: row.target_label,
    severity: row.severity,
    periodDays: row.period_days,
    reason: row.reason,
    metrics: row.metrics,
    evidencePacket: row.evidence_packet,
    createdAt: toIso(row.created_at),
  };
}

function mapBackfillRunRow(row: BackfillRunRow): SearchAdBackfillRunRecord {
  return {
    completedAt: row.completed_at ? toIso(row.completed_at) : undefined,
    createdAt: toIso(row.created_at),
    errorMessage: row.error_message ?? undefined,
    id: row.id,
    inputJson: row.input_json,
    resultJson: row.result_json ?? undefined,
    startedAt: row.started_at ? toIso(row.started_at) : undefined,
    status: row.status,
    updatedAt: toIso(row.updated_at),
  };
}

function toIso(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDate(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function addDateDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function ruleCriteriaScopeKey(criteria: Pick<SearchAdRuleCriteria, "brandKey" | "adProductType">) {
  return `${criteria.brandKey}:${criteria.adProductType}`;
}

function mapNormalizedRow(row: {
  id: string;
  report_row_id: string;
  report_type: SearchAdReportType;
  brand_key: BrandKey;
  ad_product_type: AdProductType;
  campaign_id: string | null;
  campaign_name: string | null;
  adgroup_id: string | null;
  adgroup_name: string | null;
  keyword_id: string | null;
  keyword_text: string | null;
  search_term: string | null;
  ad_id?: string | null;
  criterion_id?: string | null;
  extension_id?: string | null;
  media_id?: string | null;
  device?: string | null;
  impressions: string;
  clicks: string;
  cost: string;
  conversions: string;
  sales_amount: string;
  source_date: string | Date;
}): SearchAdNormalizedRow {
  return {
    id: row.id,
    reportRowId: row.report_row_id,
    reportType: row.report_type,
    brandKey: row.brand_key,
    adProductType: row.ad_product_type,
    campaignId: row.campaign_id ?? undefined,
    campaignName: row.campaign_name ?? undefined,
    adgroupId: row.adgroup_id ?? undefined,
    adgroupName: row.adgroup_name ?? undefined,
    keywordId: row.keyword_id ?? undefined,
    keywordText: row.keyword_text ?? undefined,
    searchTerm: row.search_term ?? undefined,
    adId: row.ad_id ?? undefined,
    criterionId: row.criterion_id ?? undefined,
    extensionId: row.extension_id ?? undefined,
    mediaId: row.media_id ?? undefined,
    device: row.device ?? undefined,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    cost: Number(row.cost),
    conversions: Number(row.conversions),
    salesAmount: Number(row.sales_amount),
    sourceDate: toDate(row.source_date),
  };
}

async function getLatestActionTarget(targetType: SearchAdTargetType, targetId: string): Promise<SearchAdStateRecord | undefined> {
  if (targetType === "campaign") {
    const result = await query<{
      id: string;
      provider_campaign_id: string;
      brand_key: BrandKey | null;
      ad_product_type: AdProductType | null;
      name: string;
      user_lock: boolean | null;
      status: string | null;
      status_reason: string | null;
      collected_at: string | Date;
    }>(
      `
        SELECT DISTINCT ON (provider_campaign_id)
          id, provider_campaign_id, brand_key, ad_product_type, name, user_lock, status, status_reason, collected_at
        FROM search_ad_campaign_snapshots
        WHERE provider_campaign_id = $1 OR id = $1
        ORDER BY provider_campaign_id, collected_at DESC
        LIMIT 1
      `,
      [targetId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          targetType: "campaign",
          providerId: row.provider_campaign_id,
          brandKey: row.brand_key ?? undefined,
          adProductType: row.ad_product_type ?? undefined,
          name: row.name,
          userLock: row.user_lock,
          status: row.status ?? undefined,
          statusReason: row.status_reason ?? undefined,
          collectedAt: toIso(row.collected_at),
        }
      : undefined;
  }

  if (targetType === "adgroup") {
    const result = await query<{
      id: string;
      provider_adgroup_id: string;
      provider_campaign_id: string | null;
      brand_key: BrandKey | null;
      ad_product_type: AdProductType | null;
      name: string;
      user_lock: boolean | null;
      status: string | null;
      status_reason: string | null;
      bid_amount: string | null;
      daily_budget: string | null;
      collected_at: string | Date;
    }>(
      `
        SELECT DISTINCT ON (provider_adgroup_id)
          id, provider_adgroup_id, provider_campaign_id, brand_key, ad_product_type, name, user_lock, status, status_reason,
          bid_amount, daily_budget, collected_at
        FROM search_ad_adgroup_snapshots
        WHERE provider_adgroup_id = $1 OR id = $1
        ORDER BY provider_adgroup_id, collected_at DESC
        LIMIT 1
      `,
      [targetId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          targetType: "adgroup",
          providerId: row.provider_adgroup_id,
          parentProviderId: row.provider_campaign_id ?? undefined,
          brandKey: row.brand_key ?? undefined,
          adProductType: row.ad_product_type ?? undefined,
          name: row.name,
          userLock: row.user_lock,
          status: row.status ?? undefined,
          statusReason: row.status_reason ?? undefined,
          bidAmount: row.bid_amount === null ? null : Number(row.bid_amount),
          dailyBudget: row.daily_budget === null ? null : Number(row.daily_budget),
          collectedAt: toIso(row.collected_at),
        }
      : undefined;
  }

  const result = await query<{
    id: string;
    provider_keyword_id: string;
    provider_adgroup_id: string | null;
    brand_key: BrandKey | null;
    ad_product_type: AdProductType | null;
    keyword_text: string;
    user_lock: boolean | null;
    status: string | null;
    status_reason: string | null;
    bid_amount: string | null;
    collected_at: string | Date;
  }>(
    `
      SELECT DISTINCT ON (provider_keyword_id)
        id, provider_keyword_id, provider_adgroup_id, brand_key, ad_product_type, keyword_text, user_lock, status, status_reason,
        bid_amount, collected_at
      FROM search_ad_keyword_snapshots
      WHERE provider_keyword_id = $1 OR id = $1
      ORDER BY provider_keyword_id, collected_at DESC
      LIMIT 1
    `,
    [targetId],
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        targetType: "keyword",
        providerId: row.provider_keyword_id,
        parentProviderId: row.provider_adgroup_id ?? undefined,
        brandKey: row.brand_key ?? undefined,
        adProductType: row.ad_product_type ?? undefined,
        name: row.keyword_text,
        userLock: row.user_lock,
        status: row.status ?? undefined,
        statusReason: row.status_reason ?? undefined,
        bidAmount: row.bid_amount === null ? null : Number(row.bid_amount),
        collectedAt: toIso(row.collected_at),
      }
    : undefined;
}

async function getActionImpact(targetType: SearchAdTargetType, target: SearchAdStateRecord) {
  const childCount =
    targetType === "campaign"
      ? (await listLatestStateSnapshots("adgroup", DEFAULT_SEARCH_AD_FILTERS)).filter((row) => row.parentProviderId === target.providerId).length
      : targetType === "adgroup"
        ? (await listLatestStateSnapshots("keyword", DEFAULT_SEARCH_AD_FILTERS)).filter((row) => row.parentProviderId === target.providerId).length
        : 0;
  const rows = await listNormalizedRowsByFilters(DEFAULT_SEARCH_AD_FILTERS, 500);
  const matchedRows = rows.filter((row) => {
    if (targetType === "campaign") {
      return row.campaignId === target.providerId || row.campaignName === target.name;
    }

    if (targetType === "adgroup") {
      return row.adgroupId === target.providerId || row.adgroupName === target.name;
    }

    return row.keywordId === target.providerId || row.keywordText === target.name;
  });

  return {
    affectedChildren: childCount,
    recentCost: matchedRows.reduce((sum, row) => sum + row.cost, 0),
    recentClicks: matchedRows.reduce((sum, row) => sum + row.clicks, 0),
    recentConversions: matchedRows.reduce((sum, row) => sum + row.conversions, 0),
  };
}

async function getSearchAdActionPreviewById(id: string): Promise<SearchAdActionPreview | undefined> {
  if (!hasDatabaseUrl()) {
    return createSampleActionLogsView().previews.find((preview) => preview.id === id);
  }

  await ensureSearchAdSchema();
  const result = await query<{
    id: string;
    target_type: SearchAdTargetType;
    target_id: string;
    requested_action: SearchAdRequestedAction;
    before_state: SearchAdActionPreview["beforeState"];
    after_state: SearchAdActionPreview["afterState"];
    impact_summary: SearchAdActionPreview["impactSummary"];
    write_gate_open: boolean;
    created_at: string | Date;
  }>(
    `
      SELECT id, target_type, target_id, requested_action, before_state, after_state, impact_summary, write_gate_open, created_at
      FROM search_ad_action_previews
      WHERE id = $1
    `,
    [id],
  );
  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_id,
    requestedAction: row.requested_action,
    beforeState: row.before_state,
    afterState: row.after_state,
    impactSummary: row.impact_summary,
    writeGateOpen: row.write_gate_open,
    createdAt: toIso(row.created_at),
  };
}

function getActionTargetTypeLabel(targetType: SearchAdTargetType) {
  if (targetType === "campaign") {
    return "캠페인";
  }
  if (targetType === "adgroup") {
    return "광고그룹";
  }
  return "키워드";
}

function getActionLogReason(status: SearchAdActionStatus, targetType: SearchAdTargetType, requestedAction: SearchAdRequestedAction, errorMessage: string | null) {
  if (errorMessage) {
    return errorMessage;
  }

  const targetLabel = getActionTargetTypeLabel(targetType);
  if (status === "applied") {
    return requestedAction === "turn_on" ? `네이버 검색광고 ${targetLabel}을 켰습니다.` : `네이버 검색광고 ${targetLabel}을 껐습니다.`;
  }
  if (status === "blocked") {
    return "실제 변경 권한이 닫혀 있어 네이버 광고에는 반영하지 않았습니다.";
  }

  return "실행 요청 처리에 실패했습니다.";
}

function isSearchAdWriteEnabled() {
  return process.env.SEARCH_AD_WRITE_ENABLED === "1" || process.env.NAVER_SEARCH_AD_WRITE_ENABLED === "1";
}

function isSearchAdOperationAutomationEnabled() {
  return process.env.MARKETCREW_OPERATION_AUTOMATION_ENABLED === "1" || process.env.SEARCH_AD_OPERATION_AUTOMATION_ENABLED === "1";
}

async function loadOperationCalendarHolidays(date: string): Promise<SearchAdHoliday[]> {
  try {
    return await fetchKoreanPublicHolidaysForDate(date);
  } catch {
    return [];
  }
}

async function listActiveOperationCalendarLockTargetIds() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureSearchAdSchema();
  const result = await query<{ target_id: string }>(`
    SELECT target_id
    FROM search_ad_operation_calendar_locks
    WHERE target_type = 'adgroup' AND status = 'active'
  `);
  return result.rows.map((row) => row.target_id);
}

async function recordOperationCalendarLock(decision: SearchAdOperationCalendarDecision, preview: SearchAdActionPreview, log: SearchAdActionLog, lockDate: string) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await query(
    `
      INSERT INTO search_ad_operation_calendar_locks (
        target_type,
        target_id,
        brand_key,
        ad_product_type,
        target_label,
        lock_date,
        locked_reason,
        action_preview_id,
        action_log_id,
        status,
        locked_at,
        released_at,
        release_action_log_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, NULL, NULL)
      ON CONFLICT (target_type, target_id)
      DO UPDATE SET
        brand_key = EXCLUDED.brand_key,
        ad_product_type = EXCLUDED.ad_product_type,
        target_label = EXCLUDED.target_label,
        lock_date = EXCLUDED.lock_date,
        locked_reason = EXCLUDED.locked_reason,
        action_preview_id = EXCLUDED.action_preview_id,
        action_log_id = EXCLUDED.action_log_id,
        status = 'active',
        locked_at = EXCLUDED.locked_at,
        released_at = NULL,
        release_action_log_id = NULL
    `,
    [
      decision.targetType,
      decision.targetId,
      decision.brandKey ?? null,
      decision.adProductType ?? null,
      decision.targetLabel,
      lockDate,
      decision.reason,
      preview.id,
      log.id,
      log.createdAt,
    ],
  );
}

async function releaseOperationCalendarLock(targetId: string, log: SearchAdActionLog) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await query(
    `
      UPDATE search_ad_operation_calendar_locks
      SET status = 'released',
          released_at = $2,
          release_action_log_id = $3
      WHERE target_type = 'adgroup'
        AND target_id = $1
        AND status = 'active'
    `,
    [targetId, log.createdAt, log.id],
  );
}

function snapshotId(targetType: SearchAdTargetType | "ad" | "target", providerId: string, collectedAt: string) {
  return `${targetType}-${providerId}-${collectedAt}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function canUseSampleFallback() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return process.env.VERCEL !== "1" && process.env.RAILWAY_SERVICE_NAME !== "marketcrew-api" && process.env.MARKETCREW_BACKEND_MODE !== "1";
}
