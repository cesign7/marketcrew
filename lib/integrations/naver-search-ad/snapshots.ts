import { Prisma } from "@/app/generated/prisma/client";
import type {
  SearchAdAdgroup,
  SearchAdCampaign,
  SearchAdKeyword,
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
