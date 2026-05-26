import { searchAdFetch } from "./client";

export type NaverCampaign = {
  nccCampaignId: string;
  name: string;
  campaignTp?: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
  [key: string]: unknown;
};

export type NaverAdgroup = {
  nccAdgroupId: string;
  nccCampaignId?: string;
  name: string;
  adgroupType?: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
  [key: string]: unknown;
};

export type NaverKeyword = {
  nccKeywordId: string;
  nccAdgroupId?: string;
  keyword: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
};

export type NaverAd = {
  nccAdId: string;
  nccAdgroupId?: string;
  type?: string;
  adType?: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
  inspectStatus?: string;
  ad?: Record<string, unknown>;
  [key: string]: unknown;
};

export function listSearchAdCampaigns() {
  return searchAdFetch<NaverCampaign[]>("/ncc/campaigns");
}

export async function getSearchAdCampaign(campaignId: string) {
  const rows = await searchAdFetch<NaverCampaign[]>(`/ncc/campaigns?ids=${encodeURIComponent(campaignId)}`);
  const campaign = rows.find((row) => row.nccCampaignId === campaignId) ?? rows[0];
  if (!campaign) {
    throw new Error("SEARCH_AD_CAMPAIGN_NOT_FOUND");
  }

  return campaign;
}

export async function updateSearchAdCampaignUserLock(campaignId: string, userLock: boolean) {
  const current = await getSearchAdCampaign(campaignId);
  return searchAdFetch<NaverCampaign>(`/ncc/campaigns/${encodeURIComponent(campaignId)}?fields=userLock`, {
    method: "PUT",
    body: JSON.stringify({
      ...current,
      userLock,
    }),
  });
}

export function listSearchAdAdgroups() {
  return searchAdFetch<NaverAdgroup[]>("/ncc/adgroups");
}

export async function getSearchAdAdgroup(adgroupId: string) {
  const rows = await searchAdFetch<NaverAdgroup[]>(`/ncc/adgroups?ids=${encodeURIComponent(adgroupId)}`);
  const adgroup = rows.find((row) => row.nccAdgroupId === adgroupId) ?? rows[0];
  if (!adgroup) {
    throw new Error("SEARCH_AD_ADGROUP_NOT_FOUND");
  }

  return adgroup;
}

export async function updateSearchAdAdgroupUserLock(adgroupId: string, userLock: boolean) {
  const current = await getSearchAdAdgroup(adgroupId);
  return searchAdFetch<NaverAdgroup>(`/ncc/adgroups/${encodeURIComponent(adgroupId)}?fields=userLock`, {
    method: "PUT",
    body: JSON.stringify({
      ...current,
      userLock,
    }),
  });
}

export function listSearchAdKeywords(adgroupId?: string) {
  const query = adgroupId ? `?nccAdgroupId=${encodeURIComponent(adgroupId)}` : "";
  return searchAdFetch<NaverKeyword[]>(`/ncc/keywords${query}`);
}

export function listSearchAdAds(adgroupId?: string) {
  const query = adgroupId ? `?nccAdgroupId=${encodeURIComponent(adgroupId)}` : "";
  return searchAdFetch<NaverAd[]>(`/ncc/ads${query}`);
}
