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
    const rows = await this.requestJson("/ncc/campaigns");
    return normalizeCampaigns(arrayResponse(rows, "/ncc/campaigns"));
  }

  async getAdgroups(campaignId?: string): Promise<SearchAdAdgroup[]> {
    const rows = await this.requestJson(
      "/ncc/adgroups",
      campaignId ? { nccCampaignId: campaignId } : undefined,
    );

    return normalizeAdgroups(arrayResponse(rows, "/ncc/adgroups"));
  }

  async getKeywords(
    adgroupId: string,
    adgroupCampaignMap: Map<string, string>,
  ): Promise<SearchAdKeyword[]> {
    const rows = await this.requestJson("/ncc/keywords", {
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

    const rows = await this.requestJson("/stats", {
      ids,
      fields: JSON.stringify(fields),
      timeRange: JSON.stringify({ since, until }),
    });

    return statsResponse(rows);
  }

  private async requestJson(
    uri: string,
    params?: QueryParams,
  ): Promise<unknown> {
    const method = "GET";
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
        uri,
      }),
    });

    if (!response.ok) {
      const body = await safeResponseText(response);
      throw new Error(
        `Naver Search Ad API failed: ${method} ${uri} ${response.status} ${body}`,
      );
    }

    return response.json();
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

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: unknown[] }).data;
  }

  throw new Error("Naver Search Ad API /stats response must include data array.");
}

async function safeResponseText(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 400);
  } catch {
    return "";
  }
}
