import { readSearchAdCredentials } from "@/lib/integrations/naver-search-ad/auth";
import {
  syncNaverSearchAdPerformance,
  type PerformanceSyncKind,
} from "@/lib/integrations/naver-search-ad/performance";

export const DEFAULT_PERFORMANCE_BACKFILL_DAYS = 90;
export const DEFAULT_PERFORMANCE_BACKFILL_MAX_DAYS_PER_RUN = 7;
export const DEFAULT_PERFORMANCE_BACKFILL_KEYWORD_LIMIT = 3000;
export const MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS = 180;

export interface PerformanceBackfillWindowOptions {
  now?: Date;
  days?: number;
  maxDaysPerRun?: number;
  completedStatDates?: string[];
}

export interface PerformanceBackfillWindow {
  requestedDays: number;
  maxDaysPerRun: number;
  lookbackSince: string;
  lookbackUntil: string;
  since: string | null;
  until: string | null;
  statDates: string[];
  skippedDates: string[];
  remainingDays: number;
}

export interface PerformanceBackfillProgress {
  requestedDays: number;
  completedDays: number;
  missingDays: number;
  percentComplete: number;
  isComplete: boolean;
  lookbackSince: string;
  lookbackUntil: string;
  nextSince: string | null;
  nextUntil: string | null;
  nextStatDates: string[];
  maxDaysPerRun: number;
  remainingAfterNextRun: number;
}

export interface PerformanceBackfillSyncOptions
  extends PerformanceBackfillWindowOptions {
  keywordLimit?: number;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
  syncKind?: PerformanceSyncKind;
}

interface CompletedBackfillSyncRunLike {
  status: string;
  rawJson: unknown;
}

export interface CollectCompletedBackfillStatDatesInput {
  storedStatDates?: string[];
  syncRuns?: CompletedBackfillSyncRunLike[];
}

export function buildPerformanceBackfillWindow({
  now = new Date(),
  days = DEFAULT_PERFORMANCE_BACKFILL_DAYS,
  maxDaysPerRun = DEFAULT_PERFORMANCE_BACKFILL_MAX_DAYS_PER_RUN,
  completedStatDates = [],
}: PerformanceBackfillWindowOptions = {}): PerformanceBackfillWindow {
  assertPositiveInteger("Naver Search Ad backfill days", days);
  assertPositiveInteger("Naver Search Ad backfill max days per run", maxDaysPerRun);

  if (days > MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS) {
    throw new Error(
      `Naver Search Ad StatReport detail backfill cannot exceed ${MAX_STAT_REPORT_DETAIL_LOOKBACK_DAYS} days.`,
    );
  }

  const today = dateFromKstDate(formatKstDate(now));
  const lookbackUntilDate = addDays(today, -1);
  const lookbackSinceDate = addDays(lookbackUntilDate, -(days - 1));
  const completed = new Set(
    completedStatDates
      .map(normalizeStatDate)
      .filter((date): date is string => Boolean(date)),
  );
  const allStatDates: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    allStatDates.push(formatStatDate(addDays(lookbackSinceDate, offset)));
  }

  const skippedDates = allStatDates.filter((date) => completed.has(date));
  const missingDates = allStatDates.filter((date) => !completed.has(date));
  const statDates = missingDates.slice(0, maxDaysPerRun);
  const since = statDates[0] ? statDateToKstDate(statDates[0]) : null;
  const until = statDates.at(-1) ? statDateToKstDate(statDates.at(-1)!) : null;

  return {
    requestedDays: days,
    maxDaysPerRun,
    lookbackSince: formatKstDate(lookbackSinceDate),
    lookbackUntil: formatKstDate(lookbackUntilDate),
    since,
    until,
    statDates,
    skippedDates,
    remainingDays: missingDates.length - statDates.length,
  };
}

export function buildPerformanceBackfillProgress(
  options: PerformanceBackfillWindowOptions = {},
): PerformanceBackfillProgress {
  const window = buildPerformanceBackfillWindow(options);
  const completedDays = window.skippedDates.length;
  const missingDays = window.statDates.length + window.remainingDays;

  return {
    requestedDays: window.requestedDays,
    completedDays,
    missingDays,
    percentComplete: Math.round((completedDays / window.requestedDays) * 100),
    isComplete: missingDays === 0,
    lookbackSince: window.lookbackSince,
    lookbackUntil: window.lookbackUntil,
    nextSince: window.since,
    nextUntil: window.until,
    nextStatDates: window.statDates,
    maxDaysPerRun: window.maxDaysPerRun,
    remainingAfterNextRun: window.remainingDays,
  };
}

export function collectCompletedBackfillStatDates({
  storedStatDates = [],
  syncRuns = [],
}: CollectCompletedBackfillStatDatesInput) {
  const completed = new Set<string>();

  for (const date of storedStatDates) {
    const normalized = normalizeStatDate(date);

    if (normalized) {
      completed.add(normalized);
    }
  }

  for (const run of syncRuns) {
    if (run.status !== "SUCCEEDED" || !isBackfillRunRawJson(run.rawJson)) {
      continue;
    }

    for (const statDate of run.rawJson.statDates) {
      const normalized = normalizeStatDate(statDate);

      if (normalized) {
        completed.add(normalized);
      }
    }
  }

  return [...completed].sort();
}

export async function getNaverSearchAdPerformanceBackfillProgress({
  accountId,
  now,
  days,
  maxDaysPerRun,
}: {
  accountId?: string | null;
  now?: Date;
  days?: number;
  maxDaysPerRun?: number;
} = {}) {
  if (!accountId) {
    return buildPerformanceBackfillProgress({ now, days, maxDaysPerRun });
  }

  const { prisma } = await import("@/lib/db/prisma");
  const initialWindow = buildPerformanceBackfillWindow({
    now,
    days,
    maxDaysPerRun,
  });
  const [storedRows, syncRuns] = await Promise.all([
    prisma.adKeywordDailyPerformance.findMany({
      where: {
        accountId,
        date: {
          gte: dateFromKstDate(initialWindow.lookbackSince),
          lte: dateFromKstDate(initialWindow.lookbackUntil),
        },
      },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.integrationSyncRun.findMany({
      where: {
        accountId,
        provider: "NAVER_SEARCH_AD",
        status: "SUCCEEDED",
        startedAt: {
          gte: dateFromKstDate(initialWindow.lookbackSince),
        },
      },
      select: {
        status: true,
        rawJson: true,
      },
    }),
  ]);
  const completedStatDates = collectCompletedBackfillStatDates({
    storedStatDates: storedRows.map((row) => formatStatDate(row.date)),
    syncRuns,
  });

  return buildPerformanceBackfillProgress({
    now,
    days,
    maxDaysPerRun,
    completedStatDates,
  });
}

export async function syncNaverSearchAdPerformanceBackfill(
  options: PerformanceBackfillSyncOptions = {},
) {
  const credentials = readSearchAdCredentials();
  const initialWindow = buildPerformanceBackfillWindow(options);
  const completedStatDates =
    options.completedStatDates ??
    (await getCompletedPerformanceStatDates({
      customerId: credentials.customerId,
      since: initialWindow.lookbackSince,
      until: initialWindow.lookbackUntil,
    }));
  const backfillWindow = buildPerformanceBackfillWindow({
    ...options,
    completedStatDates,
  });

  if (!backfillWindow.since || !backfillWindow.until) {
    return {
      id: null,
      status: "SKIPPED" as const,
      keywordsCount: 0,
      snapshotsCount: 0,
      since: null,
      until: null,
      statDates: [],
      backfillWindow,
    };
  }

  const result = await syncNaverSearchAdPerformance({
    now: options.now,
    since: backfillWindow.since,
    until: backfillWindow.until,
    statDates: backfillWindow.statDates,
    keywordLimit:
      options.keywordLimit ?? DEFAULT_PERFORMANCE_BACKFILL_KEYWORD_LIMIT,
    maxPollAttempts: options.maxPollAttempts,
    pollIntervalMs: options.pollIntervalMs,
    syncKind: options.syncKind ?? "backfill",
    enableStatsFallback: false,
    rawJsonContext: {
      requestedDays: backfillWindow.requestedDays,
      maxDaysPerRun: backfillWindow.maxDaysPerRun,
      lookbackSince: backfillWindow.lookbackSince,
      lookbackUntil: backfillWindow.lookbackUntil,
      remainingDays: backfillWindow.remainingDays,
      skippedDatesCount: backfillWindow.skippedDates.length,
    },
  });

  return {
    ...result,
    statDates: backfillWindow.statDates,
    backfillWindow,
  };
}

async function getCompletedPerformanceStatDates({
  customerId,
  since,
  until,
}: {
  customerId: string;
  since: string;
  until: string;
}) {
  const { prisma } = await import("@/lib/db/prisma");
  const account = await prisma.marketingAccount.findUnique({
    where: {
      provider_customerId: {
        provider: "NAVER_SEARCH_AD",
        customerId,
      },
    },
    select: { id: true },
  });

  if (!account) {
    return [];
  }

  const [rows, syncRuns] = await Promise.all([
    prisma.adKeywordDailyPerformance.findMany({
      where: {
        accountId: account.id,
        date: {
          gte: dateFromKstDate(since),
          lte: dateFromKstDate(until),
        },
      },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.integrationSyncRun.findMany({
      where: {
        accountId: account.id,
        provider: "NAVER_SEARCH_AD",
        status: "SUCCEEDED",
        startedAt: {
          gte: dateFromKstDate(since),
        },
      },
      select: {
        status: true,
        rawJson: true,
      },
    }),
  ]);

  return collectCompletedBackfillStatDates({
    storedStatDates: rows.map((row) => formatStatDate(row.date)),
    syncRuns,
  });
}

function assertPositiveInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function normalizeStatDate(value: string) {
  const trimmed = value.trim();

  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.replaceAll("-", "");
  }

  return null;
}

function isBackfillRunRawJson(
  value: unknown,
): value is { mode: string; syncKind: string; statDates: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as {
    mode?: unknown;
    syncKind?: unknown;
    statDates?: unknown;
  };

  return (
    record.mode === "performance-read-only" &&
    (record.syncKind === "backfill" ||
      record.syncKind === "scheduled-backfill") &&
    Array.isArray(record.statDates) &&
    record.statDates.every((date) => typeof date === "string")
  );
}

function statDateToKstDate(value: string) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
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

function formatStatDate(date: Date) {
  return formatKstDate(date).replaceAll("-", "");
}
