import { inferAdProductType, inferBrandKey } from "@/features/search-ad/domain/stateMapping";
import { getSearchAdCredentials, SearchAdApiError } from "@/lib/integrations/search-ad/client";
import { listSearchAdAdgroups, listSearchAdAds, listSearchAdCampaigns, listSearchAdKeywords, listSearchAdTargets, listSearchAdTargetsByOwnerIds } from "@/lib/integrations/search-ad/management";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import { saveSearchAdStateSnapshots, saveSearchAdTargetSnapshots } from "@/lib/persistence/searchAdRepository";
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
  const keywords = await listKeywordsForAdgroups(adgroups.map((adgroup) => adgroup.nccAdgroupId));
  const ads = await listAdsForAdgroups(adgroups.map((adgroup) => adgroup.nccAdgroupId));
  const targets = await listTargetsForAdgroups(adgroups.map((adgroup) => adgroup.nccAdgroupId));
  const campaignMeta = new Map<string, { brandKey?: BrandKey; adProductType?: AdProductType }>();
  const adgroupMeta = new Map<string, { brandKey?: BrandKey; adProductType?: AdProductType; name?: string }>();

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
    adgroupMeta.set(adgroup.nccAdgroupId, { brandKey, adProductType, name: adgroup.name });
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

  const adSnapshots = ads.map((ad) => {
    const parent = ad.nccAdgroupId ? adgroupMeta.get(ad.nccAdgroupId) : undefined;
    return {
      targetType: "ad" as const,
      providerId: ad.nccAdId,
      parentProviderId: ad.nccAdgroupId,
      brandKey: parent?.brandKey ?? inferBrandKey(readAdName(ad)),
      adProductType: parent?.adProductType ?? inferAdProductType(readAdName(ad), readString(ad, "type") ?? readString(ad, "adType")),
      name: readAdName(ad) ?? ad.nccAdId,
      userLock: ad.userLock ?? null,
      status: ad.status ?? ad.inspectStatus,
      statusReason: ad.statusReason,
      pcFinalUrl: readLandingUrl(ad, "pc"),
      mobileFinalUrl: readLandingUrl(ad, "mobile"),
      rawPayload: ad as unknown as Record<string, unknown>,
    };
  });

  const targetSnapshots = targets.map((target) => {
    const parent = adgroupMeta.get(target.ownerId);
    return {
      providerTargetId: target.nccTargetId,
      ownerId: target.ownerId,
      ownerType: "adgroup" as const,
      ownerName: parent?.name,
      brandKey: parent?.brandKey,
      adProductType: parent?.adProductType,
      targetType: target.targetTp,
      targetPayload: readTargetPayload(target),
      rawPayload: target as unknown as Record<string, unknown>,
    };
  });

  const collectedAt = new Date().toISOString();
  const saved = await saveSearchAdStateSnapshots([...campaignSnapshots, ...adgroupSnapshots, ...keywordSnapshots, ...adSnapshots], collectedAt);
  const savedTargets = await saveSearchAdTargetSnapshots(targetSnapshots, collectedAt);

  return {
    ok: true as const,
    data: {
      collectedAt: saved.collectedAt,
      campaigns: campaignSnapshots.length,
      adgroups: adgroupSnapshots.length,
      keywords: keywordSnapshots.length,
      ads: adSnapshots.length,
      targetSettings: targetSnapshots.length,
      saved: saved.saved,
      savedTargetSettings: savedTargets.saved,
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

async function listKeywordsForAdgroups(adgroupIds: string[]) {
  return collectAdgroupResources(adgroupIds, listSearchAdKeywords);
}

async function listAdsForAdgroups(adgroupIds: string[]) {
  return collectAdgroupResources(adgroupIds, listSearchAdAds);
}

async function listTargetsForAdgroups(adgroupIds: string[]) {
  const uniqueAdgroupIds = [...new Set(adgroupIds.filter(Boolean))];
  const rows = [];

  for (const ids of chunk(uniqueAdgroupIds, 20)) {
    try {
      rows.push(...(await listSearchAdTargetsByOwnerIds(ids)));
    } catch {
      rows.push(...(await collectAdgroupResources(ids, listSearchAdTargets)));
    }
    await sleep(getStateSyncRequestDelayMs());
  }

  return rows;
}

async function collectAdgroupResources<T>(adgroupIds: string[], loader: (adgroupId: string) => Promise<T[]>) {
  const uniqueAdgroupIds = [...new Set(adgroupIds.filter(Boolean))];
  const rows: T[] = [];

  for (const adgroupId of uniqueAdgroupIds) {
    rows.push(...(await loadAdgroupResourceWithRetry(adgroupId, loader)));
    await sleep(getStateSyncRequestDelayMs());
  }

  return rows;
}

async function loadAdgroupResourceWithRetry<T>(adgroupId: string, loader: (adgroupId: string) => Promise<T[]>) {
  try {
    return await loader(adgroupId);
  } catch (error) {
    if (!isSearchAdRateLimit(error)) {
      return [];
    }

    await sleep(getStateSyncRateLimitDelayMs());
    try {
      return await loader(adgroupId);
    } catch {
      return [];
    }
  }
}

function isSearchAdRateLimit(error: unknown) {
  return error instanceof SearchAdApiError && error.status === 429;
}

function getStateSyncRequestDelayMs() {
  const raw = Number.parseInt(process.env.SEARCH_AD_STATE_SYNC_DELAY_MS ?? process.env.NAVER_SEARCH_AD_STATE_SYNC_DELAY_MS ?? "", 10);
  return Number.isFinite(raw) ? Math.max(0, raw) : 50;
}

function getStateSyncRateLimitDelayMs() {
  const raw = Number.parseInt(process.env.SEARCH_AD_STATE_SYNC_RATE_LIMIT_DELAY_MS ?? process.env.NAVER_SEARCH_AD_STATE_SYNC_RATE_LIMIT_DELAY_MS ?? "", 10);
  return Number.isFinite(raw) ? Math.max(500, raw) : 1_500;
}

function sleep(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readAdName(source: unknown) {
  const ad = readRecord(source, "ad");
  const referenceData = readRecord(source, "referenceData");
  return (
    readString(source, "name") ??
    readString(source, "headline") ??
    readString(ad, "headline") ??
    readString(ad, "productName") ??
    readString(ad, "description") ??
    readString(referenceData, "productTitle") ??
    readString(referenceData, "productName")
  );
}

function readLandingUrl(source: unknown, device: "pc" | "mobile") {
  const ad = readRecord(source, "ad");
  const referenceData = readRecord(source, "referenceData");
  const devicePayload = readRecord(ad, device) ?? readRecord(source, device);
  const capitalized = device === "pc" ? "Pc" : "Mobile";
  const productUrlKey = device === "pc" ? "mallProductUrl" : "mallProdMblUrl";

  return (
    readString(devicePayload, "final") ??
    readString(devicePayload, "finalUrl") ??
    readString(referenceData, productUrlKey) ??
    readString(source, `${device}FinalUrl`) ??
    readString(source, `final${capitalized}Url`) ??
    readString(source, "finalUrl")
  );
}

function readRecord(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function readString(source: unknown, key: string) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readTargetPayload(source: unknown) {
  const target = readRecord(source, "target");
  return target ?? {};
}
