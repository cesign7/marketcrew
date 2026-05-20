import { prisma } from "@/lib/db/prisma";
import { getNaverSearchAdPerformanceBackfillProgress } from "@/lib/integrations/naver-search-ad/backfill";
import { selectSearchAdStatusAccount } from "@/lib/integrations/naver-search-ad/status-helpers";

const credentialGroups = [
  ["NAVER_SEARCH_AD_ACCESS_LICENSE", "NAVER_SEARCHAD_API_KEY", "NAVER_SEARCH_AD_API_KEY"],
  ["NAVER_SEARCH_AD_SECRET_KEY", "NAVER_SEARCHAD_SECRET_KEY"],
  ["NAVER_SEARCH_AD_CUSTOMER_ID", "NAVER_SEARCHAD_CUSTOMER_ID"],
] as const;

export function getSearchAdCredentialStatus(
  env: Partial<Record<string, string | undefined>> = process.env,
) {
  const missing = credentialGroups
    .filter((names) => names.every((name) => !env[name]?.trim()))
    .map((names) => names[0]);

  return {
    configured: missing.length === 0,
    missing,
  };
}

export async function getSearchAdSyncStatus() {
  const [
    accounts,
    lastRun,
    recentRuns,
    campaignSnapshotCount,
    adgroupSnapshotCount,
    keywordSnapshotCount,
    keywordPerformanceCount,
  ] = await Promise.all([
    prisma.marketingAccount.findMany({
      where: { provider: "NAVER_SEARCH_AD" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.integrationSyncRun.findFirst({
      where: { provider: "NAVER_SEARCH_AD" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.integrationSyncRun.findMany({
      where: { provider: "NAVER_SEARCH_AD" },
      orderBy: { startedAt: "desc" },
      take: 6,
    }),
    prisma.adCampaignSnapshot.count(),
    prisma.adAdgroupSnapshot.count(),
    prisma.adKeywordSnapshot.count(),
    prisma.adKeywordDailyPerformance.count(),
  ]);
  const account = selectSearchAdStatusAccount(accounts, lastRun);
  const recentPerformanceRuns = recentRuns
    .filter((run) => isPerformanceRun(run.rawJson))
    .slice(0, 6);
  const backfillProgress = await getNaverSearchAdPerformanceBackfillProgress({
    accountId: account?.id,
  });

  return {
    credentials: getSearchAdCredentialStatus(),
    account,
    lastRun,
    lastPerformanceRun: recentPerformanceRuns[0] ?? null,
    recentRuns,
    recentPerformanceRuns,
    campaignSnapshotCount,
    adgroupSnapshotCount,
    keywordSnapshotCount,
    keywordPerformanceCount,
    backfillProgress,
    snapshotCount: keywordSnapshotCount,
  };
}

function isPerformanceRun(value: unknown) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { mode?: unknown }).mode === "performance-read-only"
  );
}
