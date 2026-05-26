import { inferAdProductType, inferBrandKey } from "@/features/search-ad/domain/stateMapping";
import { getSearchAdCredentials } from "@/lib/integrations/search-ad/client";
import { listSearchAdAdgroups, listSearchAdCampaigns, listSearchAdKeywords } from "@/lib/integrations/search-ad/management";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import { saveSearchAdStateSnapshots } from "@/lib/persistence/searchAdRepository";
import type { AdProductType, BrandKey, SearchAdTargetType } from "@/features/search-ad/domain/types";

export async function syncSearchAdState() {
  if (!getSearchAdCredentials()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_CREDENTIALS_MISSING",
      message: "네이버 검색광고 API 설정이 필요합니다.",
    };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_DATABASE_MISSING",
      message: "광고 상태 스냅샷을 저장할 DB 연결이 필요합니다.",
    };
  }

  const campaigns = await listSearchAdCampaigns();
  const adgroups = await listSearchAdAdgroups();
  const keywords = await listSearchAdKeywords();
  const campaignMeta = new Map<string, { brandKey?: BrandKey; adProductType?: AdProductType }>();
  const adgroupMeta = new Map<string, { brandKey?: BrandKey; adProductType?: AdProductType }>();

  const campaignSnapshots = campaigns.map((campaign) => {
    const brandKey = inferBrandKey(campaign.name);
    const adProductType = inferAdProductType(campaign.name, campaign.campaignTp);
    campaignMeta.set(campaign.nccCampaignId, { brandKey, adProductType });
    return {
      targetType: "campaign" as SearchAdTargetType,
      providerId: campaign.nccCampaignId,
      brandKey,
      adProductType,
      name: campaign.name,
      userLock: campaign.userLock ?? null,
      status: campaign.status,
      statusReason: campaign.statusReason,
      rawPayload: campaign as unknown as Record<string, unknown>,
    };
  });

  const adgroupSnapshots = adgroups.map((adgroup) => {
    const parent = adgroup.nccCampaignId ? campaignMeta.get(adgroup.nccCampaignId) : undefined;
    const brandKey = inferBrandKey(adgroup.name) ?? parent?.brandKey;
    const adProductType = inferAdProductType(adgroup.name, adgroup.adgroupType) ?? parent?.adProductType;
    adgroupMeta.set(adgroup.nccAdgroupId, { brandKey, adProductType });
    return {
      targetType: "adgroup" as SearchAdTargetType,
      providerId: adgroup.nccAdgroupId,
      parentProviderId: adgroup.nccCampaignId,
      brandKey,
      adProductType,
      name: adgroup.name,
      userLock: adgroup.userLock ?? null,
      status: adgroup.status,
      statusReason: adgroup.statusReason,
      bidAmount: readNumber(adgroup, "bidAmt"),
      dailyBudget: readNumber(adgroup, "dailyBudget"),
      rawPayload: adgroup as unknown as Record<string, unknown>,
    };
  });

  const keywordSnapshots = keywords.map((keyword) => {
    const parent = keyword.nccAdgroupId ? adgroupMeta.get(keyword.nccAdgroupId) : undefined;
    return {
      targetType: "keyword" as SearchAdTargetType,
      providerId: keyword.nccKeywordId,
      parentProviderId: keyword.nccAdgroupId,
      brandKey: parent?.brandKey,
      adProductType: parent?.adProductType,
      name: keyword.keyword,
      userLock: keyword.userLock ?? null,
      status: keyword.status,
      statusReason: keyword.statusReason,
      bidAmount: readNumber(keyword, "bidAmt"),
      rawPayload: keyword as unknown as Record<string, unknown>,
    };
  });

  const saved = await saveSearchAdStateSnapshots([...campaignSnapshots, ...adgroupSnapshots, ...keywordSnapshots]);

  return {
    ok: true as const,
    data: {
      collectedAt: saved.collectedAt,
      campaigns: campaignSnapshots.length,
      adgroups: adgroupSnapshots.length,
      keywords: keywordSnapshots.length,
      saved: saved.saved,
    },
  };
}

function readNumber(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const value = (source as Record<string, unknown>)[key];
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
