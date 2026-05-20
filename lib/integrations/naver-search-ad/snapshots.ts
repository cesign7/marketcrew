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
