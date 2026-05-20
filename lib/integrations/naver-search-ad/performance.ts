import { readSearchAdCredentials } from "@/lib/integrations/naver-search-ad/auth";
import { NaverSearchAdClient } from "@/lib/integrations/naver-search-ad/client";
import { sanitizeSearchAdErrorMessage } from "@/lib/integrations/naver-search-ad/errors";
import { normalizeStats } from "@/lib/integrations/naver-search-ad/normalize";
import {
  toKeywordPerformanceRows,
  type KeywordPerformanceMeta,
} from "@/lib/integrations/naver-search-ad/snapshots";

const DEFAULT_KEYWORD_LIMIT = 500;
const DEFAULT_BATCH_SIZE = 50;

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
  client?: Pick<NaverSearchAdClient, "getStatsByIds">;
  now?: Date;
  since?: string;
  until?: string;
  keywordLimit?: number;
  batchSize?: number;
}

export interface KeywordSnapshotLike {
  campaignId: string;
  adgroupId: string;
  keywordId: string;
  keyword: string;
  createdAt: Date;
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
  const account = await prisma.marketingAccount.upsert({
    where: {
      provider_customerId: {
        provider: "NAVER_SEARCH_AD",
        customerId: credentials.customerId,
      },
    },
    update: {
      alias: "커피프린트/스티커씨 통합 검색광고 계정",
      status: "ACTIVE",
    },
    create: {
      provider: "NAVER_SEARCH_AD",
      customerId: credentials.customerId,
      alias: "커피프린트/스티커씨 통합 검색광고 계정",
    },
  });
  const run = await prisma.integrationSyncRun.create({
    data: {
      provider: "NAVER_SEARCH_AD",
      accountId: account.id,
      status: "PENDING",
      rawJson: {
        mode: "performance-read-only",
        source: "Naver Search Ad read-only stats API",
        endpoints: ["GET /stats"],
        since: range.since,
        until: range.until,
        keywordLimit,
        batchSize,
      },
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
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: "BID_OPTIMIZER",
        reportType: "NAVER_SEARCH_AD_PERFORMANCE_SYNC",
        summary: `검색광고 성과 동기화 완료: ${range.since}~${range.until}, 키워드 ${keywordIds.length.toLocaleString()}개 성과 ${performanceRows.length.toLocaleString()}건을 저장했습니다.`,
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
    };
  }
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

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}
