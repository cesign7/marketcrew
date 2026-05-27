import { isBackendRuntime } from "@/lib/backend/proxy";
import {
  getSearchAdOperationsView,
  getSearchAdActionLogsView,
  getSearchAdReportArchiveView,
  getSearchAdReportDetailView,
  getSearchAdRuleResultDetailView,
  getSearchAdRuleResultsView,
  getSearchAdSearchTermsView,
  getSearchAdStateView,
  listSearchAdRuleCriteria,
} from "@/lib/persistence/searchAdRepository";
import type { AdProductFilter, BrandFilter, SearchAdActionLogsView, SearchAdFilters, SearchAdReportArchiveView, SearchAdReportDetailView, SearchAdRuleResultDetailView, SearchAdRuleResultsView, SearchAdSearchTermsView, SearchAdStateView } from "./domain/types";
import type { SearchAdOperationsView, SearchAdRuleCriteria, SearchAdRuleResultFilters } from "./domain/types";
import { parseRuleActionIntentFilter } from "./domain/ruleActionIntents";

export function parseSearchAdFilters(searchParams: Record<string, string | string[] | undefined>): SearchAdFilters {
  return {
    brand: parseBrandFilter(firstValue(searchParams.brand)),
    adProduct: parseAdProductFilter(firstValue(searchParams.adProduct)),
  };
}

export function parseSearchAdRuleResultFilters(searchParams: Record<string, string | string[] | undefined>): SearchAdRuleResultFilters {
  return {
    ...parseSearchAdFilters(searchParams),
    actionIntent: parseRuleActionIntentFilter(firstValue(searchParams.actionIntent)),
  };
}

export async function loadSearchAdOperationsView(filters: SearchAdFilters): Promise<SearchAdOperationsView> {
  const remote = await fetchBackendJson<SearchAdOperationsView>(`/api/search-ad/overview?${toQuery(filters)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdOperationsView(filters);
}

export async function loadSearchAdReportArchiveView(filters: SearchAdFilters): Promise<SearchAdReportArchiveView> {
  const remote = await fetchBackendJson<SearchAdReportArchiveView>(`/api/search-ad/reports?${toQuery(filters)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdReportArchiveView(filters);
}

export async function loadSearchAdRuleResultsView(filters: SearchAdRuleResultFilters): Promise<SearchAdRuleResultsView> {
  const remote = await fetchBackendJson<SearchAdRuleResultsView>(`/api/search-ad/rule-results?${toQuery(filters)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdRuleResultsView(filters);
}

export async function loadSearchAdReportDetailView(id: string): Promise<SearchAdReportDetailView | undefined> {
  const normalizedId = normalizeRouteParam(id);
  const remote = await fetchBackendJson<SearchAdReportDetailView>(`/api/search-ad/reports/${encodeURIComponent(normalizedId)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdReportDetailView(normalizedId);
}

export async function loadSearchAdRuleResultDetailView(id: string): Promise<SearchAdRuleResultDetailView | undefined> {
  const normalizedId = normalizeRouteParam(id);
  const remote = await fetchBackendJson<SearchAdRuleResultDetailView>(`/api/search-ad/rule-results/${encodeURIComponent(normalizedId)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdRuleResultDetailView(normalizedId);
}

export async function loadSearchAdRuleCriteria(): Promise<SearchAdRuleCriteria[]> {
  const remote = await fetchBackendJson<SearchAdRuleCriteria[]>("/api/search-ad/rule-criteria");
  if (remote) {
    return remote;
  }

  return listSearchAdRuleCriteria();
}

export async function loadSearchAdStateView(filters: SearchAdFilters): Promise<SearchAdStateView> {
  const remote = await fetchBackendJson<SearchAdStateView>(`/api/search-ad/state?${toQuery(filters)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdStateView(filters);
}

export async function loadSearchAdSearchTermsView(filters: SearchAdFilters): Promise<SearchAdSearchTermsView> {
  const remote = await fetchBackendJson<SearchAdSearchTermsView>(`/api/search-ad/search-terms?${toQuery(filters)}`);
  if (remote) {
    return remote;
  }

  return getSearchAdSearchTermsView(filters);
}

export async function loadSearchAdActionLogsView(): Promise<SearchAdActionLogsView> {
  const remote = await fetchBackendJson<SearchAdActionLogsView>("/api/search-ad/action-logs");
  if (remote) {
    return remote;
  }

  return getSearchAdActionLogsView();
}

async function fetchBackendJson<T>(path: string): Promise<T | undefined> {
  if (isBackendRuntime()) {
    return undefined;
  }

  const baseUrl = process.env.MARKETCREW_BACKEND_API_URL ?? process.env.MARKETCREW_API_BASE_URL;
  const token = process.env.MARKETCREW_BACKEND_API_TOKEN ?? process.env.MARKETCREW_API_TOKEN;
  const shouldFailClosed = process.env.VERCEL === "1";
  if (!baseUrl || !token) {
    return undefined;
  }

  try {
    const response = await fetch(new URL(path, baseUrl), {
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (shouldFailClosed) {
        throw new Error(`MARKETCREW_BACKEND_UNAVAILABLE:${response.status}`);
      }

      return undefined;
    }

    const payload = (await response.json()) as { ok?: boolean; data?: T };
    return payload.ok === true ? payload.data : undefined;
  } catch (error) {
    if (shouldFailClosed) {
      throw error;
    }

    return undefined;
  }
}

function toQuery(filters: SearchAdFilters & Partial<Pick<SearchAdRuleResultFilters, "actionIntent">>) {
  const params = new URLSearchParams();
  params.set("brand", filters.brand);
  params.set("adProduct", filters.adProduct);
  if (filters.actionIntent && filters.actionIntent !== "all") {
    params.set("actionIntent", filters.actionIntent);
  }
  return params.toString();
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRouteParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseBrandFilter(value: string | undefined): BrandFilter {
  return value === "coffeeprint" || value === "stickersee" ? value : "all";
}

function parseAdProductFilter(value: string | undefined): AdProductFilter {
  return value === "powerlink" || value === "shopping_search" ? value : "all";
}
