import { prisma } from "@/lib/db/prisma";

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
    account,
    lastRun,
    recentRuns,
    campaignSnapshotCount,
    adgroupSnapshotCount,
    keywordSnapshotCount,
  ] = await Promise.all([
    prisma.marketingAccount.findFirst({
      where: { provider: "NAVER_SEARCH_AD" },
      orderBy: { createdAt: "asc" },
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
  ]);

  return {
    credentials: getSearchAdCredentialStatus(),
    account,
    lastRun,
    recentRuns,
    campaignSnapshotCount,
    adgroupSnapshotCount,
    keywordSnapshotCount,
    snapshotCount: keywordSnapshotCount,
  };
}
