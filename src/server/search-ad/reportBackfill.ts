import { parseSearchAdReport } from "@/features/search-ad/domain/parseSearchAdReport";
import { resolveSearchAdBackfillSafetyLimits, type SearchAdBackfillSafetyInput } from "@/features/search-ad/domain/backfillSafety";
import { DEFAULT_SEARCH_AD_BACKFILL_REPORT_TYPES, SEARCH_AD_REPORT_RETENTION_DAYS } from "@/features/search-ad/domain/reportRetention";
import type { SearchAdReportStatus, SearchAdReportType } from "@/features/search-ad/domain/types";
import { downloadSearchAdReport, listSearchAdReportJobs, createSearchAdReportJob, type SearchAdReportJob } from "@/lib/integrations/search-ad/reports";
import { getSearchAdCredentials } from "@/lib/integrations/search-ad/client";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import { listSavedSearchAdReportKeys, rebuildAndSaveSearchAdRuleResults, saveDownloadedReport, saveUnavailableSearchAdReport } from "@/lib/persistence/searchAdRepository";
import { normalizeSearchAdReportStatDate } from "./reportSync";

export const DEFAULT_BACKFILL_REPORT_TYPES: SearchAdReportType[] = DEFAULT_SEARCH_AD_BACKFILL_REPORT_TYPES;

export type SearchAdBackfillPlanItem = {
  reportType: SearchAdReportType;
  statDate: string;
};

export type SearchAdBackfillPlan = {
  fromDate: string;
  items: SearchAdBackfillPlanItem[];
  reportTypes: SearchAdReportType[];
  retentionStarts: Partial<Record<SearchAdReportType, string>>;
  toDate: string;
  totalItems: number;
  truncatedDates: number;
};

export type SearchAdBackfillPlanInput = {
  fromDate?: string;
  maxDates?: number;
  reportTypes?: SearchAdReportType[];
  todayKst?: string;
  toDate?: string;
};

export type SearchAdBackfillDependencies = {
  createJob: (reportType: SearchAdReportType, statDate: string) => Promise<SearchAdReportJob>;
  credentialsReady: () => boolean;
  databaseReady: () => boolean;
  downloadReport: (downloadUrl: string) => Promise<{ text: string }>;
  listJobs: () => Promise<SearchAdReportJob[]>;
  listSavedReportKeys: () => Promise<SearchAdBackfillSavedReportKey[]>;
  onProgress?: (snapshot: SearchAdBackfillProgressSnapshot) => Promise<void>;
  rebuildRules: () => Promise<{ saved: number }>;
  saveReport: typeof saveDownloadedReport;
  saveUnavailableReport?: (input: SearchAdUnavailableReportInput) => Promise<void>;
  wait?: (ms: number) => Promise<void>;
};

export type SearchAdUnavailableReportInput = {
  downloadUrl?: string;
  providerReportJobId: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: SearchAdReportStatus;
};

export type SearchAdBackfillRunInput = SearchAdBackfillPlanInput &
  SearchAdBackfillSafetyInput & {
  createMissing?: boolean;
  dependencies?: SearchAdBackfillDependencies;
  dryRun?: boolean;
  onProgress?: (snapshot: SearchAdBackfillProgressSnapshot) => Promise<void>;
  skipSaved?: boolean;
};

export type SearchAdBackfillResultStatus = "created" | "download_skipped" | "downloadable" | "downloaded" | "failed" | "missing" | "no_data" | "pending" | "rate_limited";

export type SearchAdBackfillSavedReportKey = {
  reportType: SearchAdReportType;
  statDate: string;
};

export type SearchAdBackfillItemResult = SearchAdBackfillPlanItem & {
  downloadUrl?: string;
  message?: string;
  providerReportJobId?: string;
  providerStatus?: SearchAdReportStatus;
  status: SearchAdBackfillResultStatus;
};

export type SearchAdBackfillSummary = {
  alreadySaved: number;
  created: number;
  createLimit: number;
  downloadable: number;
  downloaded: number;
  failed: number;
  maxDownloads: number;
  maxHourlyCreates: number;
  missing: number;
  noData: number;
  parsed: number;
  pending: number;
  planned: number;
  rateLimitBackoffMs: number;
  rateLimited: number;
  requestDelayMs: number;
  ruleResults: number;
  skippedDownloads: number;
};

export type SearchAdBackfillProgressSnapshot = {
  plan: SearchAdBackfillPlan & { alreadySaved?: number };
  results: SearchAdBackfillItemResult[];
  summary: SearchAdBackfillSummary;
};

export type SearchAdBackfillRunSuccess = {
  data: {
    plan: SearchAdBackfillPlan;
    results: SearchAdBackfillItemResult[];
    summary: SearchAdBackfillSummary;
  };
  ok: true;
};

export type SearchAdBackfillRunFailure = {
  code: "SEARCH_AD_CREDENTIALS_MISSING" | "SEARCH_AD_DATABASE_MISSING";
  message: string;
  ok: false;
};

export function buildSearchAdReportBackfillPlan(input: SearchAdBackfillPlanInput = {}): SearchAdBackfillPlan {
  const reportTypes = uniqueReportTypes(input.reportTypes?.length ? input.reportTypes : DEFAULT_BACKFILL_REPORT_TYPES);
  const todayKst = input.todayKst ?? getTodayKst();
  const requestedToDate = input.toDate ?? formatDate(addDays(parseDateOnly(todayKst), -1));
  const toDate = minDate(requestedToDate, formatDate(addDays(parseDateOnly(todayKst), -1)));
  const retentionStarts = Object.fromEntries(
    reportTypes.map((reportType) => [reportType, formatDate(addDays(parseDateOnly(toDate), -(SEARCH_AD_REPORT_RETENTION_DAYS[reportType] - 1)))]),
  ) as Partial<Record<SearchAdReportType, string>>;
  const defaultFromDate = reportTypes.reduce((earliest, reportType) => minDate(earliest, retentionStarts[reportType] ?? earliest), toDate);
  const requestedFromDate = input.fromDate ? maxDate(input.fromDate, defaultFromDate) : defaultFromDate;
  const allDates = enumerateDates(requestedFromDate, toDate);
  const maxDates = input.maxDates && input.maxDates > 0 ? input.maxDates : allDates.length;
  const dates = allDates.slice(0, maxDates);
  const items = dates.flatMap((statDate) =>
    reportTypes
      .filter((reportType) => statDate >= (retentionStarts[reportType] ?? statDate))
      .map((reportType) => ({
        reportType,
        statDate,
      })),
  );

  return {
    fromDate: dates[0] ?? requestedFromDate,
    items,
    reportTypes,
    retentionStarts,
    toDate: dates[dates.length - 1] ?? toDate,
    totalItems: items.length,
    truncatedDates: Math.max(0, allDates.length - dates.length),
  };
}

export async function runSearchAdReportBackfill(input: SearchAdBackfillRunInput = {}): Promise<SearchAdBackfillRunSuccess | SearchAdBackfillRunFailure> {
  const dependencies = input.dependencies ?? defaultBackfillDependencies();
  if (!dependencies.credentialsReady()) {
    return {
      code: "SEARCH_AD_CREDENTIALS_MISSING",
      message: "네이버 검색광고 API 설정이 필요합니다.",
      ok: false,
    };
  }

  if (!dependencies.databaseReady()) {
    return {
      code: "SEARCH_AD_DATABASE_MISSING",
      message: "보고서 원본을 저장할 DB 연결이 필요합니다.",
      ok: false,
    };
  }

  const dryRun = input.dryRun ?? true;
  const createMissing = input.createMissing ?? false;
  const skipSaved = input.skipSaved ?? false;
  const safetyLimits = resolveSearchAdBackfillSafetyLimits(input);
  const wait = dependencies.wait ?? sleep;
  const maxCreates = safetyLimits.maxCreates;
  const maxDownloads = safetyLimits.maxDownloads;
  const plan = await buildRunnableBackfillPlan(input, dependencies, skipSaved);
  const existingJobs = await dependencies.listJobs();
  const jobByKey = buildJobLookup(existingJobs);
  const results: SearchAdBackfillItemResult[] = [];
  const summary: SearchAdBackfillSummary = {
    alreadySaved: plan.alreadySaved,
    created: 0,
    createLimit: maxCreates,
    downloadable: 0,
    downloaded: 0,
    failed: 0,
    maxDownloads,
    maxHourlyCreates: safetyLimits.maxHourlyCreates,
    missing: 0,
    noData: 0,
    parsed: 0,
    pending: 0,
    planned: plan.totalItems,
    rateLimitBackoffMs: safetyLimits.rateLimitBackoffMs,
    rateLimited: 0,
    requestDelayMs: safetyLimits.requestDelayMs,
    ruleResults: 0,
    skippedDownloads: 0,
  };
  const emitProgress = createProgressEmitter(input.onProgress ?? dependencies.onProgress, plan, results, summary);

  for (const item of plan.items) {
    const existing = jobByKey.get(backfillKey(item.reportType, item.statDate));
    if (!existing) {
      if (!dryRun && createMissing && summary.created < maxCreates) {
        try {
          const created = await dependencies.createJob(item.reportType, item.statDate);
          summary.created += 1;
          results.push({
            ...item,
            providerReportJobId: String(created.reportJobId),
            providerStatus: created.status,
            status: "created",
          });
          await emitProgress();
          await wait(safetyLimits.requestDelayMs);
        } catch (error) {
          if (isRateLimitError(error)) {
            summary.rateLimited += 1;
            results.push({
              ...item,
              message: "네이버 API 호출 속도 제한(429)이 감지되어 이번 배치를 멈추고 자동 대기합니다.",
              status: "rate_limited",
            });
            await emitProgress(true);
            break;
          }

          summary.failed += 1;
          results.push({
            ...item,
            message: error instanceof Error ? error.message : "알 수 없는 오류",
            status: "failed",
          });
          await emitProgress();
        }
        continue;
      }

      summary.missing += 1;
      results.push({ ...item, status: "missing" });
      continue;
    }

    if (existing.status === "NONE") {
      summary.noData += 1;
      if (!dryRun) {
        await dependencies.saveUnavailableReport?.({
          downloadUrl: existing.downloadUrl,
          providerReportJobId: String(existing.reportJobId),
          reportType: item.reportType,
          statDate: item.statDate,
          status: existing.status,
        });
      }
      results.push({
        ...item,
        message: "네이버가 다운로드 파일을 제공하지 않아 저장할 원본이 없습니다.",
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "no_data",
      });
      await emitProgress();
      continue;
    }

    if (existing.status !== "BUILT" || !existing.downloadUrl) {
      summary.pending += 1;
      results.push({
        ...item,
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "pending",
      });
      continue;
    }

    summary.downloadable += 1;
    if (dryRun) {
      results.push({
        ...item,
        downloadUrl: existing.downloadUrl,
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "downloadable",
      });
      continue;
    }

    if (summary.downloaded >= maxDownloads) {
      summary.skippedDownloads += 1;
      results.push({
        ...item,
        downloadUrl: existing.downloadUrl,
        message: "마켓크루 다운로드 안전 상한에 도달해 다음 자동 배치에서 이어서 저장합니다.",
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "download_skipped",
      });
      continue;
    }

    try {
      const download = await dependencies.downloadReport(existing.downloadUrl);
      const parsedReport = parseSearchAdReport(item.reportType, download.text, {
        reportFileId: `report-${existing.reportJobId}`,
        sourceDate: item.statDate,
        strictColumnCount: true,
      });
      await dependencies.saveReport({
        checksum: parsedReport.checksum,
        downloadUrl: existing.downloadUrl,
        normalizedRows: parsedReport.normalizedRows,
        parserVersion: parsedReport.parserVersion,
        providerReportJobId: String(existing.reportJobId),
        rawRows: parsedReport.rows,
        rawText: download.text,
        reportType: item.reportType,
        statDate: item.statDate,
        status: existing.status,
      });
      summary.downloaded += 1;
      summary.parsed += 1;
      results.push({
        ...item,
        downloadUrl: existing.downloadUrl,
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "downloaded",
      });
      await emitProgress();
      await wait(safetyLimits.requestDelayMs);
    } catch (error) {
      if (isRateLimitError(error)) {
        summary.rateLimited += 1;
        results.push({
          ...item,
          downloadUrl: existing.downloadUrl,
          message: "네이버 API 호출 속도 제한(429)이 감지되어 이번 배치를 멈추고 자동 대기합니다.",
          providerReportJobId: String(existing.reportJobId),
          providerStatus: existing.status,
          status: "rate_limited",
        });
        await emitProgress(true);
        break;
      }

      summary.failed += 1;
      results.push({
        ...item,
        downloadUrl: existing.downloadUrl,
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        providerReportJobId: String(existing.reportJobId),
        providerStatus: existing.status,
        status: "failed",
      });
      await emitProgress();
    }
  }

  if (!dryRun && summary.parsed > 0) {
    const ruleRebuild = await dependencies.rebuildRules();
    summary.ruleResults = ruleRebuild.saved;
  }
  await emitProgress(true);

  return {
    data: {
      plan,
      results,
      summary,
    },
    ok: true,
  };
}

function createProgressEmitter(
  onProgress: SearchAdBackfillDependencies["onProgress"],
  plan: SearchAdBackfillProgressSnapshot["plan"],
  results: SearchAdBackfillItemResult[],
  summary: SearchAdBackfillSummary,
) {
  let lastEmittedCount = 0;
  return async (force = false) => {
    if (!onProgress) {
      return;
    }
    const progressedCount = summary.created + summary.downloaded + summary.failed + summary.noData + summary.rateLimited;
    if (!force && progressedCount - lastEmittedCount < 10) {
      return;
    }
    lastEmittedCount = progressedCount;
    await onProgress({
      plan,
      results: [...results],
      summary: { ...summary },
    });
  };
}

function defaultBackfillDependencies(): SearchAdBackfillDependencies {
  return {
    createJob: createSearchAdReportJob,
    credentialsReady: () => Boolean(getSearchAdCredentials()),
    databaseReady: hasDatabaseUrl,
    downloadReport: downloadSearchAdReport,
    listJobs: listSearchAdReportJobs,
    rebuildRules: rebuildAndSaveSearchAdRuleResults,
    saveReport: saveDownloadedReport,
    saveUnavailableReport: saveUnavailableSearchAdReport,
    listSavedReportKeys: listSavedSearchAdReportKeys,
  };
}

function isRateLimitError(error: unknown) {
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    response?: { status?: unknown };
    status?: unknown;
    statusCode?: unknown;
  };
  const status = Number(candidate.status ?? candidate.statusCode ?? candidate.response?.status);
  if (status === 429) {
    return true;
  }

  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  if (code === "429" || code === "TOO_MANY_REQUESTS") {
    return true;
  }

  const message = typeof candidate.message === "string" ? candidate.message : "";
  return message.includes("429") || /too many requests/i.test(message);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function buildRunnableBackfillPlan(input: SearchAdBackfillRunInput, dependencies: SearchAdBackfillDependencies, skipSaved: boolean) {
  if (!skipSaved) {
    return {
      ...buildSearchAdReportBackfillPlan(input),
      alreadySaved: 0,
    };
  }

  const fullPlan = buildSearchAdReportBackfillPlan({ ...input, maxDates: undefined });
  const savedKeys = new Set((await dependencies.listSavedReportKeys()).map((item) => backfillKey(item.reportType, item.statDate)));
  const remainingItems = fullPlan.items.filter((item) => !savedKeys.has(backfillKey(item.reportType, item.statDate)));
  const remainingDates = Array.from(new Set(remainingItems.map((item) => item.statDate)));
  const maxDates = input.maxDates && input.maxDates > 0 ? input.maxDates : remainingDates.length;
  const selectedDates = new Set(remainingDates.slice(0, maxDates));
  const items = remainingItems.filter((item) => selectedDates.has(item.statDate));
  const selectedDateList = Array.from(selectedDates);

  return {
    ...fullPlan,
    alreadySaved: fullPlan.items.length - remainingItems.length,
    fromDate: selectedDateList[0] ?? fullPlan.fromDate,
    items,
    toDate: selectedDateList[selectedDateList.length - 1] ?? fullPlan.toDate,
    totalItems: items.length,
    truncatedDates: Math.max(0, remainingDates.length - selectedDateList.length),
  };
}

function buildJobLookup(jobs: SearchAdReportJob[]) {
  const lookup = new Map<string, SearchAdReportJob>();
  for (const job of jobs) {
    const reportType = job.reportTp;
    if (!isBackfillReportType(reportType)) {
      continue;
    }

    const key = backfillKey(reportType, normalizeSearchAdReportStatDate(job.statDt));
    const current = lookup.get(key);
    if (!current || shouldPreferJob(job, current)) {
      lookup.set(key, job);
    }
  }
  return lookup;
}

function shouldPreferJob(candidate: SearchAdReportJob, current: SearchAdReportJob) {
  if (candidate.status === "BUILT" && candidate.downloadUrl && (current.status !== "BUILT" || !current.downloadUrl)) {
    return true;
  }
  return false;
}

function isBackfillReportType(value: string): value is SearchAdReportType {
  return Object.prototype.hasOwnProperty.call(SEARCH_AD_REPORT_RETENTION_DAYS, value);
}

function uniqueReportTypes(reportTypes: SearchAdReportType[]) {
  return Array.from(new Set(reportTypes));
}

function backfillKey(reportType: SearchAdReportType, statDate: string) {
  return `${reportType}:${statDate}`;
}

function enumerateDates(fromDate: string, toDate: string) {
  const dates: string[] = [];
  for (let current = parseDateOnly(fromDate); formatDate(current) <= toDate; current = addDays(current, 1)) {
    dates.push(formatDate(current));
  }
  return dates;
}

function getTodayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(new Date());
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`SEARCH_AD_BACKFILL_INVALID_DATE:${value}`);
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function minDate(a: string, b: string) {
  return a <= b ? a : b;
}

function maxDate(a: string, b: string) {
  return a >= b ? a : b;
}
