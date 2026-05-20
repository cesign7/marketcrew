import { Prisma } from "@/app/generated/prisma/client";
import type {
  SearchAdAdgroup,
  SearchAdCampaign,
  SearchAdKeyword,
  SearchAdStat,
} from "@/lib/integrations/naver-search-ad/normalize";

export interface KeywordSnapshotInput {
  accountId: string;
  collectedDate: Date;
  keywords: SearchAdKeyword[];
}

export interface CampaignSnapshotInput {
  accountId: string;
  collectedAt: Date;
  campaigns: SearchAdCampaign[];
}

export interface AdgroupSnapshotInput {
  accountId: string;
  collectedAt: Date;
  adgroups: SearchAdAdgroup[];
}

export interface KeywordPerformanceMeta {
  campaignId: string;
  adgroupId: string;
  keywordId: string;
  keyword: string;
}

export interface KeywordPerformanceInput {
  accountId: string;
  performanceDate: Date;
  stats: SearchAdStat[];
  keywordMetaById: Map<string, KeywordPerformanceMeta>;
}

export function toCampaignSnapshotRows({
  accountId,
  collectedAt,
  campaigns,
}: CampaignSnapshotInput) {
  return campaigns.map((campaign) => ({
    accountId,
    campaignId: campaign.id,
    campaignName: campaign.name,
    brandKey: inferBrandKey(campaign.name),
    collectedAt,
    rawJson: toInputJson(campaign.raw),
  }));
}

export function toAdgroupSnapshotRows({
  accountId,
  collectedAt,
  adgroups,
}: AdgroupSnapshotInput) {
  return adgroups.map((adgroup) => ({
    accountId,
    campaignId: adgroup.campaignId,
    adgroupId: adgroup.id,
    adgroupName: adgroup.name,
    brandKey: inferBrandKey(adgroup.name),
    collectedAt,
    rawJson: toInputJson(adgroup.raw),
  }));
}

export function toKeywordSnapshotRows({
  accountId,
  collectedDate,
  keywords,
}: KeywordSnapshotInput) {
  return keywords.map((keyword) => ({
    accountId,
    campaignId: keyword.campaignId,
    adgroupId: keyword.adgroupId,
    keywordId: keyword.id,
    keyword: keyword.keyword,
    bidAmount: keyword.bidAmount,
    impressions: 0,
    clicks: 0,
    cost: 0,
    collectedDate,
    rawJson: toInputJson(keyword.raw),
  }));
}

export function toKeywordPerformanceRows({
  accountId,
  performanceDate,
  stats,
  keywordMetaById,
}: KeywordPerformanceInput) {
  return stats.flatMap((stat) => {
    const meta = keywordMetaById.get(stat.id);

    if (!meta) {
      return [];
    }

    return [
      {
        accountId,
        campaignId: meta.campaignId,
        adgroupId: meta.adgroupId,
        keywordId: meta.keywordId,
        keyword: meta.keyword,
        date: performanceDate,
        impressions: stat.impressions,
        clicks: stat.clicks,
        cost: stat.cost,
        ctr: stat.ctr,
        avgCpc: stat.avgCpc,
        avgRank: stat.avgRank,
        conversions: stat.conversions,
        conversionRate: stat.conversionRate,
        conversionSales: stat.conversionSales,
        roas: stat.roas,
        costPerConversion: stat.costPerConversion,
        rawJson: toInputJson(stat.raw),
      },
    ];
  });
}

export function toSyncCounts({
  campaigns,
  adgroups,
  keywords,
  snapshots,
}: {
  campaigns: SearchAdCampaign[] | unknown[];
  adgroups: SearchAdAdgroup[] | unknown[];
  keywords: SearchAdKeyword[] | unknown[];
  snapshots: unknown[];
}) {
  return {
    campaignsCount: campaigns.length,
    adgroupsCount: adgroups.length,
    keywordsCount: keywords.length,
    snapshotsCount: snapshots.length,
  };
}

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export function inferBrandKey(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("stickersee") || normalized.includes("스티커씨")) {
    return "STICKERSEE" as const;
  }

  if (normalized.includes("coffeeprint") || normalized.includes("커피프린트")) {
    return "COFFEEPRINT" as const;
  }

  return null;
}
