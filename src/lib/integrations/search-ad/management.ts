import { searchAdFetch } from "./client";

export type NaverCampaign = {
  nccCampaignId: string;
  name: string;
  campaignTp?: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
};

export type NaverAdgroup = {
  nccAdgroupId: string;
  nccCampaignId?: string;
  name: string;
  adgroupType?: string;
  userLock?: boolean;
  status?: string;
  statusReason?: string;
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

export function listSearchAdAdgroups() {
  return searchAdFetch<NaverAdgroup[]>("/ncc/adgroups");
}

export function listSearchAdKeywords(adgroupId?: string) {
  const query = adgroupId ? `?nccAdgroupId=${encodeURIComponent(adgroupId)}` : "";
  return searchAdFetch<NaverKeyword[]>(`/ncc/keywords${query}`);
}

export function listSearchAdAds(adgroupId?: string) {
  const query = adgroupId ? `?nccAdgroupId=${encodeURIComponent(adgroupId)}` : "";
  return searchAdFetch<NaverAd[]>(`/ncc/ads${query}`);
}
