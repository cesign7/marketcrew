import { readSearchAdCredentials } from "@/lib/integrations/naver-search-ad/auth";
import {
  NaverSearchAdClient,
  type SearchAdReportJob,
  type SearchAdReportType,
} from "@/lib/integrations/naver-search-ad/client";
import { sanitizeSearchAdErrorMessage } from "@/lib/integrations/naver-search-ad/errors";
import { normalizeStats } from "@/lib/integrations/naver-search-ad/normalize";
import {
  countSearchAdStatReportDataRows,
  parseSearchAdStatReport,
  toKeywordPerformanceRowsFromReport,
} from "@/lib/integrations/naver-search-ad/reports";
import {
  toInputJson,
  toKeywordPerformanceRows,
  type KeywordPerformanceMeta,
} from "@/lib/integrations/naver-search-ad/snapshots";

const DEFAULT_KEYWORD_LIMIT = 500;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_REPORT_DAYS = 3;
const DEFAULT_REPORT_TYPES: SearchAdReportType[] = [
  "SHOPPINGKEYWORD_DETAIL",
  "AD_DETAIL",
];
const DEFAULT_REPORT_POLL_ATTEMPTS = 6;
const DEFAULT_REPORT_POLL_INTERVAL_MS = 3000;

export type PerformanceSyncKind =
  | "manual-recent"
  | "backfill"
  | "scheduled-daily"
  | "scheduled-backfill";

export const SEARCH_AD_STAT_FIELDS = [
  "clkCnt",
  "impCnt",
  "salesAmt",
  "ctr",
  "cpc",
  "avgRnk",
  "ccnt",
  "crto",
  "convAmt",
  "ror",
  "cpConv",
] as const;

interface PerformanceSyncOptions {
  client?: SearchAdPerformanceClient;
  now?: Date;
  since?: string;
  until?: string;
  statDates?: string[];
  reportDays?: number;
  reportTypes?: SearchAdReportType[];
  maxPollAttempts?: number;
  pollIntervalMs?: number;
  keywordLimit?: number;
  batchSize?: number;
  syncKind?: PerformanceSyncKind;
  rawJsonContext?: Record<string, unknown>;
  enableStatsFallback?: boolean;
}

export interface KeywordSnapshotLike {
  campaignId: string;
  adgroupId: string;
  keywordId: string;
  keyword: string;
  createdAt: Date;
}

export interface StatReportPerformanceJobSummary {
  reportType: SearchAdReportType;
  statDate: string;
  reportJobId: string;
  status: string;
  hasDownloadUrl: boolean;
  downloadedRows: number;
  parsedRows: number;
  mappedRows: number;
}

export interface CollectStatReportPerformanceRowsInput {
  accountId: string;
  client: Pick<
    NaverSearchAdClient,
    "createStatReportJob" | "getStatReportJob" | "downloadStatReport"
  >;
  keywordMetaById: Map<string, KeywordPerformanceMeta>;
  reportTypes: SearchAdReportType[];
  statDates: string[];
  maxPollAttempts: number;
  pollIntervalMs: number;
}

type SearchAdPerformanceClient = Pick<
  NaverSearchAdClient,
  | "getStatsByIds"
  | "createStatReportJob"
  | "getStatReportJob"
  | "downloadStatReport"
>;

interface PerformanceSyncRawJsonInput {
  since: string;
  until: string;
  statDates: string[];
  reportTypes: SearchAdReportType[];
  keywordLimit: number;
  batchSize: number;
  syncKind?: PerformanceSyncKind;
  rawJsonContext?: Record<string, unknown>;
  statsFallbackEnabled?: boolean;
}

export function buildPerformanceSyncRawJsonBase({
  since,
  until,
  statDates,
  reportTypes,
  keywordLimit,
  batchSize,
  syncKind = "manual-recent",
  rawJsonContext,
  statsFallbackEnabled = true,
}: PerformanceSyncRawJsonInput) {
  return {
    mode: "performance-read-only",
    syncKind,
    statsFallbackEnabled,
    source: statsFallbackEnabled
      ? "Naver Search Ad StatReport API with /stats fallback"
      : "Naver Search Ad StatReport API",
    endpoints: [
      "POST /stat-reports",
      "GET /stat-reports/{reportJobId}",
      "GET report downloadUrl",
      "GET /stats",
    ],
    since,
    until,
    statDates,
    reportTypes,
    keywordLimit,
    batchSize,
    ...(rawJsonContext ? { rawJsonContext } : {}),
  };
}

export async function syncNaverSearchAdPerformance(
  options: PerformanceSyncOptions = {},
) {
  const prisma = await getPrisma();
  const credentials = readSearchAdCredentials();
  const client = options.client ?? new NaverSearchAdClient(credentials);
  const range =
    options.since && options.until
      ? {
          since: options.since,
          until: options.until,
          performanceDate: dateFromKstDate(options.until),
        }
      : getDefaultPerformanceDateRange(options.now ?? new Date());
  const keywordLimit = options.keywordLimit ?? DEFAULT_KEYWORD_LIMIT;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const statDates =
    options.statDates ??
    getDefaultReportStatDates(
      options.now ?? new Date(),
      options.reportDays ?? DEFAULT_REPORT_DAYS,
    );
  const reportTypes = options.reportTypes ?? DEFAULT_REPORT_TYPES;
  const statsFallbackEnabled = options.enableStatsFallback ?? true;
  const rawJsonBase = buildPerformanceSyncRawJsonBase({
    since: range.since,
    until: range.until,
    statDates,
    reportTypes,
    keywordLimit,
    batchSize,
    syncKind: options.syncKind,
    rawJsonContext: options.rawJsonContext,
    statsFallbackEnabled,
  });
  const account = await prisma.marketingAccount.upsert({
    where: {
      provider_customerId: {
        provider: "NAVER_SEARCH_AD",
        customerId: credentials.customerId,
      },
    },
    update: {
      alias: "커피프린트 · 스티커씨 통합 검색광고 계정",
      status: "ACTIVE",
    },
    create: {
      provider: "NAVER_SEARCH_AD",
      customerId: credentials.customerId,
      alias: "커피프린트 · 스티커씨 통합 검색광고 계정",
    },
  });
  const run = await prisma.integrationSyncRun.create({
    data: {
      provider: "NAVER_SEARCH_AD",
      accountId: account.id,
      status: "PENDING",
      rawJson: toInputJson(rawJsonBase),
    },
  });

  try {
    const latestKeywordSnapshots = await prisma.adKeywordSnapshot.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: keywordLimit * 3,
    });
    const keywordMetaById = selectLatestKeywordMeta(
      latestKeywordSnapshots,
      keywordLimit,
    );
    const keywordIds = [...keywordMetaById.keys()];
    const performanceRows = [];
    const reportResult =
      keywordIds.length > 0
        ? await collectStatReportPerformanceRows({
            accountId: account.id,
            client,
            keywordMetaById,
            reportTypes,
            statDates,
            maxPollAttempts:
              options.maxPollAttempts ?? DEFAULT_REPORT_POLL_ATTEMPTS,
            pollIntervalMs:
              options.pollIntervalMs ?? DEFAULT_REPORT_POLL_INTERVAL_MS,
          })
        : { jobs: [], performanceRows: [] };
    const fallbackStatsUsed =
      statsFallbackEnabled &&
      keywordIds.length > 0 &&
      reportResult.performanceRows.length === 0;

    performanceRows.push(...reportResult.performanceRows);

    if (fallbackStatsUsed) {
      for (const ids of chunkIds(keywordIds, batchSize)) {
        const rawRows = await client.getStatsByIds({
          ids,
          fields: [...SEARCH_AD_STAT_FIELDS],
          since: range.since,
          until: range.until,
        });
        const stats = normalizeStats(rawRows);

        performanceRows.push(
          ...toKeywordPerformanceRows({
            accountId: account.id,
            performanceDate: range.performanceDate,
            stats,
            keywordMetaById,
          }),
        );
      }
    }

    if (performanceRows.length > 0) {
      await prisma.adKeywordDailyPerformance.createMany({
        data: performanceRows,
        skipDuplicates: true,
      });
    }

    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        keywordsCount: keywordIds.length,
        snapshotsCount: performanceRows.length,
        rawJson: toInputJson({
          ...rawJsonBase,
          reportJobs: reportResult.jobs,
          fallbackStatsUsed,
        }),
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: "BID_OPTIMIZER",
        reportType: "NAVER_SEARCH_AD_PERFORMANCE_SYNC",
        summary: `검색광고 성과 동기화 완료: ${range.since}~${range.until}, 키워드 ${keywordIds.length.toLocaleString()}개 기준 성과 ${performanceRows.length.toLocaleString()}건을 저장했습니다.`,
        detailJson: {
          characterName: "비디",
          roleName: "입찰 최적화 AI",
          status: "DONE",
          mood: "focused",
          relatedProposalIds: [],
          syncRunId: run.id,
        },
      },
    });

    return {
      id: run.id,
      status: "SUCCEEDED" as const,
      keywordsCount: keywordIds.length,
      snapshotsCount: performanceRows.length,
      since: range.since,
      until: range.until,
      statDates,
    };
  } catch (error) {
    const errorMessage = sanitizeSearchAdErrorMessage(error);

    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorMessage,
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: "BID_OPTIMIZER",
        reportType: "NAVER_SEARCH_AD_PERFORMANCE_SYNC",
        summary: `검색광고 성과 동기화 실패: ${errorMessage}`,
        detailJson: {
          characterName: "비디",
          roleName: "입찰 최적화 AI",
          status: "NEEDS_ATTENTION",
          mood: "worried",
          relatedProposalIds: [],
          syncRunId: run.id,
        },
      },
    });

    return {
      id: run.id,
      status: "FAILED" as const,
      errorMessage,
      keywordsCount: 0,
      snapshotsCount: 0,
      since: range.since,
      until: range.until,
      statDates,
    };
  }
}

export async function collectStatReportPerformanceRows({
  accountId,
  client,
  keywordMetaById,
  reportTypes,
  statDates,
  maxPollAttempts,
  pollIntervalMs,
}: CollectStatReportPerformanceRowsInput) {
  const performanceRows = [];
  const jobs: StatReportPerformanceJobSummary[] = [];

  for (const reportType of reportTypes) {
    for (const statDate of statDates) {
      const created = await client.createStatReportJob({
        reportType,
        statDate,
      });
      const completed = await waitForReportJob({
        client,
        job: created,
        maxPollAttempts,
        pollIntervalMs,
      });
      const jobSummary: StatReportPerformanceJobSummary = {
        reportType,
        statDate,
        reportJobId: completed.reportJobId,
        status: completed.status,
        hasDownloadUrl: Boolean(completed.downloadUrl),
        downloadedRows: 0,
        parsedRows: 0,
        mappedRows: 0,
      };

      if (completed.status !== "BUILT" || !completed.downloadUrl) {
        jobs.push(jobSummary);
        continue;
      }

      const reportText = await client.downloadStatReport(completed.downloadUrl);
      const reportRows = parseSearchAdStatReport(reportText, reportType);
      const mappedRows = toKeywordPerformanceRowsFromReport({
        accountId,
        reportRows,
        keywordMetaById,
      });

      jobSummary.downloadedRows = countSearchAdStatReportDataRows(reportText);
      jobSummary.parsedRows = reportRows.length;
      jobSummary.mappedRows = mappedRows.length;
      jobs.push(jobSummary);
      performanceRows.push(...mappedRows);
    }
  }

  return {
    jobs,
    performanceRows: dedupeKeywordPerformanceRows(performanceRows),
  };
}

export function getDefaultPerformanceDateRange(now = new Date()) {
  const today = dateFromKstDate(formatKstDate(now));
  const untilDate = addDays(today, -1);
  const sinceDate = addDays(untilDate, -89);
  const until = formatKstDate(untilDate);

  return {
    since: formatKstDate(sinceDate),
    until,
    performanceDate: dateFromKstDate(until),
  };
}

export function getDefaultReportStatDates(now = new Date(), days = DEFAULT_REPORT_DAYS) {
  if (days < 1) {
    throw new Error("Naver Search Ad stat report days must be at least 1.");
  }

  const today = dateFromKstDate(formatKstDate(now));
  const dates: string[] = [];

  for (let offset = days; offset >= 1; offset -= 1) {
    dates.push(formatStatDate(addDays(today, -offset)));
  }

  return dates;
}

export function selectLatestKeywordMeta(
  snapshots: KeywordSnapshotLike[],
  limit: number,
): Map<string, KeywordPerformanceMeta> {
  const selected = new Map<string, KeywordPerformanceMeta>();
  const sorted = [...snapshots].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  for (const snapshot of sorted) {
    if (selected.has(snapshot.keywordId)) {
      continue;
    }

    selected.set(snapshot.keywordId, {
      campaignId: snapshot.campaignId,
      adgroupId: snapshot.adgroupId,
      keywordId: snapshot.keywordId,
      keyword: snapshot.keyword,
    });

    if (selected.size >= limit) {
      break;
    }
  }

  return selected;
}

export function chunkIds(ids: string[], batchSize: number) {
  if (batchSize < 1) {
    throw new Error("Naver Search Ad stats batch size must be at least 1.");
  }

  const chunks: string[][] = [];

  for (let index = 0; index < ids.length; index += batchSize) {
    chunks.push(ids.slice(index, index + batchSize));
  }

  return chunks;
}

function formatKstDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return `${partMap.get("year")}-${partMap.get("month")}-${partMap.get("day")}`;
}

function dateFromKstDate(date: string) {
  return new Date(`${date}T00:00:00.000+09:00`);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function waitForReportJob({
  client,
  job,
  maxPollAttempts,
  pollIntervalMs,
}: {
  client: Pick<NaverSearchAdClient, "getStatReportJob">;
  job: SearchAdReportJob;
  maxPollAttempts: number;
  pollIntervalMs: number;
}) {
  let current = job;

  for (
    let attempt = 0;
    isPendingReportJob(current) && attempt < maxPollAttempts;
    attempt += 1
  ) {
    if (pollIntervalMs > 0) {
      await delay(pollIntervalMs);
    }

    current = await client.getStatReportJob(current.reportJobId);
  }

  return current;
}

function isPendingReportJob(job: SearchAdReportJob) {
  return ["REGIST", "RUNNING", "WAITING", "AGGREGATING"].includes(job.status);
}

function dedupeKeywordPerformanceRows<
  T extends {
    accountId: string;
    keywordId: string;
    date: Date;
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number | null;
    avgCpc: number | null;
    avgRank: number | null;
    conversions: number | null;
    conversionRate: number | null;
    conversionSales: number | null;
    roas: number | null;
    costPerConversion: number | null;
  },
>(rows: T[]) {
  const rowsByKey = new Map<string, T>();

  for (const row of rows) {
    const key = `${row.accountId}\u0000${row.keywordId}\u0000${row.date.toISOString()}`;
    const existing = rowsByKey.get(key);

    if (!existing) {
      rowsByKey.set(key, row);
      continue;
    }

    const previousImpressions = existing.impressions;
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.cost += row.cost;
    existing.conversions = addNullableNumbers(
      existing.conversions,
      row.conversions,
    );
    existing.conversionSales = addNullableNumbers(
      existing.conversionSales,
      row.conversionSales,
    );
    existing.ctr =
      existing.impressions > 0
        ? roundNumber((existing.clicks / existing.impressions) * 100)
        : null;
    existing.avgCpc =
      existing.clicks > 0 ? roundNumber(existing.cost / existing.clicks) : null;
    existing.avgRank = weightedAverage(
      existing.avgRank,
      previousImpressions,
      row.avgRank,
      row.impressions,
    );
    existing.conversionRate =
      existing.conversions !== null && existing.clicks > 0
        ? roundNumber((existing.conversions / existing.clicks) * 100)
        : null;
    existing.roas =
      existing.conversionSales !== null && existing.cost > 0
        ? roundNumber((existing.conversionSales / existing.cost) * 100)
        : null;
    existing.costPerConversion =
      existing.conversions && existing.conversions > 0
        ? roundNumber(existing.cost / existing.conversions)
        : null;
  }

  return [...rowsByKey.values()];
}

function addNullableNumbers(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return null;
  }

  return (left ?? 0) + (right ?? 0);
}

function weightedAverage(
  leftValue: number | null,
  leftWeight: number,
  rightValue: number | null,
  rightWeight: number,
) {
  if (leftValue === null && rightValue === null) {
    return null;
  }

  const weightedTotal =
    (leftValue ?? 0) * (leftValue === null ? 0 : leftWeight) +
    (rightValue ?? 0) * (rightValue === null ? 0 : rightWeight);
  const totalWeight =
    (leftValue === null ? 0 : leftWeight) +
    (rightValue === null ? 0 : rightWeight);

  return totalWeight > 0 ? roundNumber(weightedTotal / totalWeight) : null;
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function formatStatDate(date: Date) {
  return formatKstDate(date).replaceAll("-", "");
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}
