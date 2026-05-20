import { prisma } from "@/lib/db/prisma";
import { NaverSearchAdClient } from "@/lib/integrations/naver-search-ad/client";
import { readSearchAdCredentials } from "@/lib/integrations/naver-search-ad/auth";
import { sanitizeSearchAdErrorMessage } from "@/lib/integrations/naver-search-ad/errors";
import {
  collectKeywordsSequentially,
  getKeywordRequestDelayMs,
} from "@/lib/integrations/naver-search-ad/rate-limit";
import {
  toAdgroupSnapshotRows,
  toCampaignSnapshotRows,
  toKeywordSnapshotRows,
  toSyncCounts,
} from "./snapshots";

interface SyncOptions {
  client?: NaverSearchAdClient;
  collectedDate?: Date;
  keywordRequestDelayMs?: number;
}

export async function syncNaverSearchAdDryRun(options: SyncOptions = {}) {
  return syncNaverSearchAdPersisted(options);
}

export async function syncNaverSearchAdPersisted(options: SyncOptions = {}) {
  const credentials = readSearchAdCredentials();
  const client = options.client ?? new NaverSearchAdClient(credentials);
  const collectedDate = options.collectedDate ?? new Date();
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
        mode: "persisted-read-only",
        source: "Naver Search Ad read-only APIs",
        endpoints: [
          "GET /ncc/campaigns",
          "GET /ncc/adgroups",
          "GET /ncc/keywords",
        ],
      },
    },
  });

  try {
    const campaigns = await client.getCampaigns();
    const adgroups = await client.getAdgroups();
    const adgroupCampaignMap = new Map(
      adgroups.map((adgroup) => [adgroup.id, adgroup.campaignId]),
    );
    const keywords = await collectKeywordsSequentially({
      adgroups,
      adgroupCampaignMap,
      delayMs:
        options.keywordRequestDelayMs ?? getKeywordRequestDelayMs(process.env),
      fetchKeywords: (adgroupId, campaignMap) =>
        client.getKeywords(adgroupId, campaignMap),
    });
    const campaignSnapshots = toCampaignSnapshotRows({
      accountId: account.id,
      collectedAt: collectedDate,
      campaigns,
    });
    const adgroupSnapshots = toAdgroupSnapshotRows({
      accountId: account.id,
      collectedAt: collectedDate,
      adgroups,
    });
    const keywordSnapshots = toKeywordSnapshotRows({
      accountId: account.id,
      collectedDate,
      keywords,
    });
    const counts = toSyncCounts({
      campaigns,
      adgroups,
      keywords,
      snapshots: [...campaignSnapshots, ...adgroupSnapshots, ...keywordSnapshots],
    });

    if (campaignSnapshots.length > 0) {
      await prisma.adCampaignSnapshot.createMany({
        data: campaignSnapshots,
      });
    }

    if (adgroupSnapshots.length > 0) {
      await prisma.adAdgroupSnapshot.createMany({
        data: adgroupSnapshots,
      });
    }

    if (keywordSnapshots.length > 0) {
      await prisma.adKeywordSnapshot.createMany({
        data: keywordSnapshots,
        skipDuplicates: true,
      });
    }

    await prisma.integrationSyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        ...counts,
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: "KEYWORD_STRATEGIST",
        reportType: "NAVER_SEARCH_AD_SYNC",
        summary: `검색광고 읽기 전용 동기화 완료: 캠페인 ${counts.campaignsCount}개, 광고그룹 ${counts.adgroupsCount}개, 키워드 ${counts.keywordsCount}개를 저장했습니다.`,
        detailJson: {
          characterName: "키키",
          roleName: "키워드 전략 AI",
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
      ...counts,
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
        agentKey: "KEYWORD_STRATEGIST",
        reportType: "NAVER_SEARCH_AD_SYNC",
        summary: `검색광고 읽기 전용 동기화 실패: ${errorMessage}`,
        detailJson: {
          characterName: "키키",
          roleName: "키워드 전략 AI",
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
      campaignsCount: 0,
      adgroupsCount: 0,
      keywordsCount: 0,
      snapshotsCount: 0,
    };
  }
}
