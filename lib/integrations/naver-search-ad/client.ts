import type { SearchAdCredentials } from "@/lib/integrations/naver-search-ad/auth";
import { buildSearchAdHeaders } from "@/lib/integrations/naver-search-ad/auth";
import {
  normalizeAdgroups,
  normalizeCampaigns,
  normalizeKeywords,
  type SearchAdAdgroup,
  type SearchAdCampaign,
  type SearchAdKeyword,
} from "@/lib/integrations/naver-search-ad/normalize";
import { assertReadOnlySearchAdRequest } from "@/lib/integrations/naver-search-ad/safety";

type Fetcher = typeof fetch;
type QueryParams = Record<string, string | string[]>;
type RequestMethod = "GET" | "POST";

interface ClientOptions {
  fetcher?: Fetcher;
  now?: () => number;
}

export interface SearchAdStatsRequest {
  ids: string[];
  fields: string[];
  since: string;
  until: string;
}

export type SearchAdReportType =
  | "AD"
  | "AD_DETAIL"
  | "AD_CONVERSION"
  | "AD_CONVERSION_DETAIL"
  | "ADEXTENSION"
  | "ADEXTENSION_CONVERSION"
  | "EXPKEYWORD"
  | "SHOPPINGKEYWORD_DETAIL"
  | "SHOPPINGKEYWORD_CONVERSION_DETAIL"
  | "SHOPPINGBRANDPRODUCT"
  | "SHOPPINGBRANDPRODUCT_CONVERSION"
  | "CRITERION"
  | "CRITERION_CONVERSION";

export type SearchAdReportStatus =
  | "REGIST"
  | "RUNNING"
  | "BUILT"
  | "NONE"
  | "ERROR"
  | "WAITING"
  | "AGGREGATING";

export interface SearchAdReportJobRequest {
  reportType: SearchAdReportType;
  statDate: string;
}

export interface SearchAdReportJob {
  reportJobId: string;
  reportType: SearchAdReportType;
  statDate: string | null;
  status: SearchAdReportStatus;
  downloadUrl: string | null;
  raw: Record<string, unknown>;
}

export class NaverSearchAdClient {
  private readonly fetcher: Fetcher;
  private readonly now: () => number;

  constructor(
    private readonly credentials: SearchAdCredentials,
    options: ClientOptions = {},
  ) {
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async getCampaigns(): Promise<SearchAdCampaign[]> {
    const rows = await this.requestJson("GET", "/ncc/campaigns");
    return normalizeCampaigns(arrayResponse(rows, "/ncc/campaigns"));
  }

  async getAdgroups(campaignId?: string): Promise<SearchAdAdgroup[]> {
    const rows = await this.requestJson(
      "GET",
      "/ncc/adgroups",
      campaignId ? { nccCampaignId: campaignId } : undefined,
    );

    return normalizeAdgroups(arrayResponse(rows, "/ncc/adgroups"));
  }

  async getKeywords(
    adgroupId: string,
    adgroupCampaignMap: Map<string, string>,
  ): Promise<SearchAdKeyword[]> {
    const rows = await this.requestJson("GET", "/ncc/keywords", {
      nccAdgroupId: adgroupId,
    });

    return normalizeKeywords(
      arrayResponse(rows, "/ncc/keywords"),
      adgroupCampaignMap,
    );
  }

  async getStatsByIds({
    ids,
    fields,
    since,
    until,
  }: SearchAdStatsRequest): Promise<unknown[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.requestJson("GET", "/stats", {
      ids,
      fields: JSON.stringify(fields),
      timeRange: JSON.stringify({ since, until }),
    });

    return statsResponse(rows);
  }

  async createStatReportJob({
    reportType,
    statDate,
  }: SearchAdReportJobRequest): Promise<SearchAdReportJob> {
    const row = await this.requestJson("POST", "/stat-reports", undefined, {
      reportTp: reportType,
      statDt: statDate,
    });

    return reportJobResponse(row);
  }

  async getStatReportJob(reportJobId: string): Promise<SearchAdReportJob> {
    const row = await this.requestJson("GET", `/stat-reports/${reportJobId}`);

    return reportJobResponse(row);
  }

  async downloadStatReport(downloadUrl: string): Promise<string> {
    const baseUrl = new URL(this.credentials.baseUrl);
    const url = new URL(downloadUrl, baseUrl);

    if (url.protocol !== "https:" || url.hostname !== baseUrl.hostname) {
      throw new Error(
        "Naver Search Ad stat report download URL is outside the reviewed API host.",
      );
    }

    return this.requestText("GET", `${url.pathname}${url.search}`);
  }

  private async requestJson(
    method: RequestMethod,
    uri: string,
    params?: QueryParams,
    body?: unknown,
  ): Promise<unknown> {
    assertReadOnlySearchAdRequest(method, uri);
    const url = buildUrl(this.credentials.baseUrl, uri, params);
    const response = await this.fetcher(url, {
      method,
      headers: buildSearchAdHeaders({
        apiKey: this.credentials.apiKey,
        secretKey: this.credentials.secretKey,
        customerId: this.credentials.customerId,
        timestamp: String(this.now()),
        method,
        uri: uri.split("?")[0],
      }),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const body = await safeResponseText(response);
      throw new Error(
        `Naver Search Ad API failed: ${method} ${uri} ${response.status} ${body}`,
      );
    }

    return response.json();
  }

  private async requestText(method: RequestMethod, uri: string): Promise<string> {
    assertReadOnlySearchAdRequest(method, uri);
    const url = buildUrl(this.credentials.baseUrl, uri);
    const response = await this.fetcher(url, {
      method,
      headers: buildSearchAdHeaders({
        apiKey: this.credentials.apiKey,
        secretKey: this.credentials.secretKey,
        customerId: this.credentials.customerId,
        timestamp: String(this.now()),
        method,
        uri: uri.split("?")[0],
      }),
    });

    if (!response.ok) {
      const body = await safeResponseText(response);
      throw new Error(
        `Naver Search Ad API failed: ${method} ${uri.split("?")[0]} ${response.status} ${body}`,
      );
    }

    return response.text();
  }
}

function buildUrl(baseUrl: string, uri: string, params?: QueryParams) {
  const url = new URL(uri, baseUrl);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
    } else {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function arrayResponse(value: unknown, uri: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Naver Search Ad API ${uri} response must be an array.`);
  }

  return value;
}

function statsResponse(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const object = recordResponse(value, "/stats");
  const candidates = [
    object.data,
    nestedData(object.summaryStatResponse),
    nestedData(object.dailyStatResponse),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  throw new Error("Naver Search Ad API /stats response must include data array.");
}

function nestedData(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return (value as { data?: unknown }).data;
  }

  return undefined;
}

function reportJobResponse(value: unknown): SearchAdReportJob {
  const object = recordResponse(value, "/stat-reports");
  const reportJobId = object.reportJobId;
  const reportType = object.reportTp;
  const status = object.status;

  if (
    (typeof reportJobId !== "string" && typeof reportJobId !== "number") ||
    typeof reportType !== "string" ||
    typeof status !== "string"
  ) {
    throw new Error(
      "Naver Search Ad API /stat-reports response is missing report job fields.",
    );
  }

  return {
    reportJobId: String(reportJobId),
    reportType: reportType as SearchAdReportType,
    statDate: typeof object.statDt === "string" ? object.statDt : null,
    status: status as SearchAdReportStatus,
    downloadUrl:
      typeof object.downloadUrl === "string" && object.downloadUrl.trim()
        ? object.downloadUrl
        : null,
    raw: object,
  };
}

function recordResponse(value: unknown, uri: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Naver Search Ad API ${uri} response must be an object.`);
  }

  return value as Record<string, unknown>;
}

async function safeResponseText(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 400);
  } catch {
    return "";
  }
}
