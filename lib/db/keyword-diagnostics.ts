import type { Prisma } from "@/app/generated/prisma/client";
import { getAgentProfile } from "@/lib/domain/agent-profiles";
import {
  analyzeKeywordDiagnostics,
  type DiagnosticProposalInput,
  type DiagnosticReportInput,
  type KeywordDiagnosticMetric,
} from "@/lib/domain/keyword-diagnostics";
import {
  evaluatePerformanceDataQuality,
  type LatestPerformanceRunLike,
  type PerformanceQualityResult,
} from "@/lib/domain/performance-quality";

const DIAGNOSTIC_LOOKBACK_DAYS = 90;

interface PerformanceRowLike {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adgroupId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number | null;
  conversionSales: number | null;
  avgRank: number | null;
}

export interface KeywordDiagnosticsOverview {
  quality: PerformanceQualityResult;
  keywordSnapshotCount: number;
  performanceRowCount: number;
  latestPerformanceRun: LatestPerformanceRunLike | null;
}

export async function getKeywordDiagnosticsOverview(now = new Date()) {
  const prisma = await getPrisma();
  const since = addDays(now, -DIAGNOSTIC_LOOKBACK_DAYS);
  const [keywordSnapshotCount, performanceRowCount, recentRuns] =
    await Promise.all([
      prisma.adKeywordSnapshot.count(),
      prisma.adKeywordDailyPerformance.count({
        where: { date: { gte: since } },
      }),
      prisma.integrationSyncRun.findMany({
        where: { provider: "NAVER_SEARCH_AD" },
        orderBy: { startedAt: "desc" },
        take: 12,
      }),
    ]);
  const latestPerformanceRun =
    recentRuns.find((run) => isPerformanceRun(run.rawJson)) ?? null;
  const quality = evaluatePerformanceDataQuality({
    keywordSnapshotCount,
    performanceRowCount,
    latestPerformanceRun,
    now,
  });

  return {
    quality,
    keywordSnapshotCount,
    performanceRowCount,
    latestPerformanceRun,
  };
}

export async function runKeywordDiagnostics(now = new Date()) {
  const prisma = await getPrisma();
  const overview = await getKeywordDiagnosticsOverview(now);
  const performanceRows = overview.quality.canDiagnose
    ? await prisma.adKeywordDailyPerformance.findMany({
        where: { date: { gte: addDays(now, -DIAGNOSTIC_LOOKBACK_DAYS) } },
        orderBy: [{ keyword: "asc" }, { date: "desc" }],
        take: 3_000,
      })
    : [];
  const diagnostic = analyzeKeywordDiagnostics({
    quality: overview.quality,
    keywords: toKeywordDiagnosticMetrics(performanceRows),
  });
  const proposalIdsByTitle = await persistDiagnosticProposals(
    diagnostic.proposals,
  );

  await persistDiagnosticReports(diagnostic.reports, proposalIdsByTitle);

  return {
    quality: overview.quality,
    reportsCount: diagnostic.reports.length,
    proposalsCount: diagnostic.proposals.length,
  };
}

export function toKeywordDiagnosticMetrics(
  rows: PerformanceRowLike[],
): KeywordDiagnosticMetric[] {
  const byKeyword = new Map<
    string,
    KeywordDiagnosticMetric & { rankTotal: number; rankCount: number }
  >();

  for (const row of rows) {
    const current =
      byKeyword.get(row.keywordId) ??
      ({
        keywordId: row.keywordId,
        keyword: row.keyword,
        campaignId: row.campaignId,
        adgroupId: row.adgroupId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionSales: 0,
        avgRank: 0,
        avgCpc: 0,
        rankTotal: 0,
        rankCount: 0,
      } satisfies KeywordDiagnosticMetric & {
        rankTotal: number;
        rankCount: number;
      });

    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.cost += row.cost;
    current.conversions += row.conversions ?? 0;
    current.conversionSales += row.conversionSales ?? 0;

    if (row.avgRank !== null) {
      current.rankTotal += row.avgRank;
      current.rankCount += 1;
    }

    current.avgRank =
      current.rankCount > 0 ? round(current.rankTotal / current.rankCount) : 0;
    current.avgCpc = current.clicks > 0 ? round(current.cost / current.clicks) : 0;

    byKeyword.set(row.keywordId, current);
  }

  return [...byKeyword.values()].map((metric) => ({
    keywordId: metric.keywordId,
    keyword: metric.keyword,
    campaignId: metric.campaignId,
    adgroupId: metric.adgroupId,
    impressions: metric.impressions,
    clicks: metric.clicks,
    cost: metric.cost,
    conversions: metric.conversions,
    conversionSales: metric.conversionSales,
    avgRank: metric.avgRank,
    avgCpc: metric.avgCpc,
  }));
}

async function persistDiagnosticProposals(
  proposals: DiagnosticProposalInput[],
) {
  const prisma = await getPrisma();
  const idsByTitle = new Map<string, string>();

  for (const proposal of proposals) {
    const existing = await prisma.actionProposal.findFirst({
      where: {
        title: proposal.title,
        status: { in: ["NEEDS_APPROVAL", "HELD"] },
      },
    });

    if (existing) {
      idsByTitle.set(proposal.title, existing.id);
      continue;
    }

    const created = await prisma.actionProposal.create({
      data: {
        agentKey: proposal.agentKey,
        actionType: proposal.actionType,
        riskLevel: proposal.riskLevel,
        title: proposal.title,
        reason: proposal.reason,
        expectedImpact: proposal.expectedImpact,
        beforeJson: proposal.beforeJson,
        afterJson: proposal.afterJson,
        status: proposal.status,
      },
    });
    idsByTitle.set(proposal.title, created.id);
  }

  return idsByTitle;
}

async function persistDiagnosticReports(
  reports: DiagnosticReportInput[],
  proposalIdsByTitle: Map<string, string>,
) {
  const prisma = await getPrisma();
  if (reports.length === 0) {
    return;
  }

  await prisma.agentReport.createMany({
    data: reports.map((report) => {
      const profile = getAgentProfile(report.agentKey);
      const relatedProposalIds = report.relatedProposalTitles
        .map((title) => proposalIdsByTitle.get(title))
        .filter((id): id is string => Boolean(id));

      return {
        agentKey: report.agentKey,
        reportType: "KEYWORD_DIAGNOSTIC",
        summary: report.summary,
        detailJson: {
          characterName: profile.characterName,
          roleName: profile.roleName,
          status: report.status,
          mood: report.mood,
          relatedProposalIds,
        } satisfies Prisma.InputJsonObject,
      };
    }),
  });
}

function isPerformanceRun(value: unknown) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { mode?: unknown }).mode === "performance-read-only"
  );
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}
