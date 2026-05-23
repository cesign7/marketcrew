import { createHmac } from "node:crypto";
import {
  getProviderHistoryPolicy,
  type KeywordDemandSnapshot,
  type ProviderSyncReport,
  type SearchAdPerformanceSnapshot,
  type ShoppingSearchAdPerformanceSnapshot,
} from "@/lib/domain";
import {
  buildSearchAdReadinessReport,
  SEARCH_AD_API_SPEC_URL,
  SEARCH_AD_READINESS_SOURCE_URL,
  resolveSearchAdAccessLicense,
  resolveSearchAdBaseUrl,
} from "./readiness";

type EnvMap = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export const SEARCH_AD_KEYWORD_TOOL_PATH = "/keywordstool";
export const SEARCH_AD_STATS_PATH = "/stats";
export const SEARCH_AD_CAMPAIGNS_PATH = "/ncc/campaigns";
export const SEARCH_AD_ADGROUPS_PATH = "/ncc/adgroups";
export const SEARCH_AD_KEYWORDS_PATH = "/ncc/keywords";
export const SEARCH_AD_PRODUCT_GROUPS_PATH = "/ncc/product-groups";
export const SEARCH_AD_KEYWORD_TOOL_SOURCE_NOTE =
  "네이버 검색광고 API는 X-Timestamp, X-API-KEY, X-Customer, X-Signature 헤더 조합을 사용한다.";
export const SEARCH_AD_STATS_SOURCE_NOTE =
  "네이버 검색광고 /stats는 fields JSON 문자열과 datePreset 또는 timeRange를 받아 집계 성과를 반환한다.";
export const SEARCH_AD_SHOPPING_SEARCH_SOURCE_NOTE =
  "쇼핑검색광고 검색어 성과는 /stats의 statType=NPLA_SCH_KEYWORD 조회로 최근 30일 검색어 클릭과 직접 전환율을 반환한다.";

export type SearchAdKeywordToolRequest = {
  method: "GET";
  url: string;
  path: string;
  headers: Record<"Content-Type" | "X-Timestamp" | "X-API-KEY" | "X-Customer" | "X-Signature", string>;
};

export type SearchAdStatsRequest = SearchAdKeywordToolRequest & {
  path: typeof SEARCH_AD_STATS_PATH;
};

export type SearchAdShoppingKeywordStatsRequest = SearchAdKeywordToolRequest & {
  path: typeof SEARCH_AD_STATS_PATH;
};

type SearchAdKeywordToolResponse = {
  keywordList?: Array<{
    relKeyword?: string;
    monthlyPcQcCnt?: string | number;
    monthlyMobileQcCnt?: string | number;
    monthlyAvePcClkCnt?: string | number;
    monthlyAveMobileClkCnt?: string | number;
    compIdx?: string;
    monthlyAvePcCtr?: string | number;
    monthlyAveMobileCtr?: string | number;
    plAvgDepth?: string | number;
  }>;
};

type SearchAdEntityResponse = Array<Record<string, unknown>>;

type SearchAdStatBreakdown = {
  name?: string;
  impCnt?: number;
  clkCnt?: number;
  salesAmt?: number;
  ccnt?: number;
  convAmt?: number;
  purchaseCcnt?: number;
  purchaseConvAmt?: number;
};

type SearchAdStatRow = SearchAdStatBreakdown & {
  id?: string;
  breakdowns?: SearchAdStatBreakdown[];
};

type SearchAdStatsResponse = {
  summaryStatResponse?: {
    data?: SearchAdStatRow[];
    cycleBaseTm?: string;
  };
  dailyStatResponse?: {
    data?: SearchAdStatRow[];
    cycleBaseTm?: string;
  };
  data?: SearchAdStatRow[];
};

type SearchAdShoppingKeywordStatRow = {
  schKeyword?: string;
  clkCnt?: number | string;
  drtCrto?: number | string;
  salesAmt?: number | string;
};

type SearchAdStatTarget = {
  id: string;
  brandKey: string;
  campaignId?: string;
  campaignName: string;
  adGroupId?: string;
  adGroupName: string;
  keyword: string;
  targetCpa?: number;
  targetRoas?: number;
  trackingVerified: boolean;
};

type SearchAdStatsSyncResult = {
  snapshots: SearchAdPerformanceSnapshot[];
  shoppingSnapshots: ShoppingSearchAdPerformanceSnapshot[];
  notes: string[];
  requestedTargetCount: number;
  discoveredTargetCount: number;
  httpStatus?: number;
  failureReason?: string;
};

type SearchAdShoppingTarget = {
  id: string;
  brandKey: string;
  campaignName: string;
  adGroupName: string;
  adGroupId: string;
  productGroupId?: string;
  productGroupName?: string;
  mallName?: string;
  registeredProductType?: string;
};

const SEARCH_AD_STATS_FIELDS = [
  "impCnt",
  "clkCnt",
  "salesAmt",
  "ccnt",
  "convAmt",
  "purchaseCcnt",
  "purchaseConvAmt",
] as const;

export function buildSearchAdReadOnlySyncReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport {
  const readiness = buildSearchAdReadinessReport(env, checkedAt);
  const endpoint = `${resolveSearchAdBaseUrl(env)}${SEARCH_AD_KEYWORD_TOOL_PATH} · ${resolveSearchAdBaseUrl(env)}${SEARCH_AD_STATS_PATH}`;

  if (!readiness.canRead) {
    return {
      id: `provider-sync-search-ad-${checkedAt}`,
      provider: "search_ad",
      label: "네이버 키워드광고 읽기 전용 수집",
      status: "SKIPPED_MISSING_CONFIG",
      readOnly: true,
      networkAttempted: false,
      writeAttempted: false,
      endpoint,
      sourceUrl: SEARCH_AD_READINESS_SOURCE_URL,
      missingEnvKeys: readiness.missingEnvKeys,
      evidenceNotes: [
        "API 키/시크릿/고객 ID가 없어서 네트워크 호출을 시도하지 않았습니다.",
        SEARCH_AD_KEYWORD_TOOL_SOURCE_NOTE,
        SEARCH_AD_STATS_SOURCE_NOTE,
        SEARCH_AD_SHOPPING_SEARCH_SOURCE_NOTE,
        "쓰기 작업은 이 수집에서 호출하지 않습니다.",
      ],
      checkedAt,
      historyPolicy: getProviderHistoryPolicy("search_ad"),
      generatedSignal: buildProviderMissingConfigSignal({
        id: "signal-provider-search-ad-missing-config",
        title: "네이버 키워드광고 읽기 동기화 대기",
        provider: "search_ad",
        evidenceRowId: "provider-sync-search-ad-missing-config",
        checkedAt,
      }),
    };
  }

  return {
    id: `provider-sync-search-ad-${checkedAt}`,
    provider: "search_ad",
    label: "네이버 키워드광고 읽기 전용 수집",
    status: "READY_READ_ONLY",
    readOnly: true,
    networkAttempted: false,
    writeAttempted: false,
    endpoint,
    sourceUrl: SEARCH_AD_API_SPEC_URL,
    missingEnvKeys: [],
    evidenceNotes: [
      "읽기 전용 요청을 만들 수 있는 인증 재료가 준비됐습니다.",
      "실제 호출은 대표가 제공한 서버 환경 설정으로만 수행하며, 응답은 키워드 수요, 광고 성과, 쇼핑검색광고 검색어 성과 요약 후보로 정규화합니다.",
      "외부 반영 잠금과 무관하게 이 단계에서는 키워드/입찰/예산 변경 요청을 만들지 않습니다.",
    ],
    checkedAt,
    historyPolicy: getProviderHistoryPolicy("search_ad"),
  };
}

export async function syncSearchAdKeywordTool(input: {
  env?: EnvMap;
  checkedAt?: string;
  hintKeywords?: string[];
  fetchImpl?: FetchLike;
} = {}): Promise<ProviderSyncReport> {
  const env = input.env ?? process.env;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const readinessReport = buildSearchAdReadOnlySyncReport(env, checkedAt);
  if (readinessReport.status === "SKIPPED_MISSING_CONFIG") {
    return readinessReport;
  }

  const timestamp = `${Date.now()}`;
  const request = buildSearchAdKeywordToolRequest({
    env,
    hintKeywords: input.hintKeywords ?? defaultHintKeywords(env),
    timestamp,
  });
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(request.url, {
      method: request.method,
      headers: request.headers,
    });
    const httpStatus = response.status;
    if (!response.ok) {
      return {
        ...readinessReport,
        status: "FAILED",
        networkAttempted: true,
        httpStatus,
        failureReason: `SEARCH_AD_HTTP_${httpStatus}`,
        evidenceNotes: [
          ...readinessReport.evidenceNotes,
          `읽기 전용 요청이 응답 ${httpStatus}로 실패했습니다. 응답 원문은 저장하지 않았습니다.`,
        ],
      };
    }

    const responseBody = (await response.json()) as SearchAdKeywordToolResponse;
    const keywordDemandSnapshots = mapSearchAdKeywordToolResponseToSnapshots({
      response: responseBody,
      collectedAt: checkedAt,
      cachedUntil: addDays(checkedAt.slice(0, 10), 1),
    });
    const statsResult = await syncSearchAdPerformanceStats({
      env,
      checkedAt,
      fetchImpl,
      timestampFactory: () => `${Date.now()}`,
    });

    return {
      ...readinessReport,
      status: "SYNCED",
      networkAttempted: true,
      httpStatus: statsResult.httpStatus ?? httpStatus,
      keywordDemandSnapshots,
      ...(statsResult.snapshots.length > 0 ? { searchAdPerformanceSnapshots: statsResult.snapshots } : {}),
      ...(statsResult.shoppingSnapshots.length > 0 ? { shoppingSearchAdPerformanceSnapshots: statsResult.shoppingSnapshots } : {}),
      ...(statsResult.failureReason ? { failureReason: statsResult.failureReason } : {}),
      evidenceNotes: [
        ...readinessReport.evidenceNotes,
        `읽기 전용 키워드 도구 응답 ${keywordDemandSnapshots.length.toLocaleString("ko-KR")}건을 키워드 수요 요약으로 정규화했습니다.`,
        ...statsResult.notes,
      ],
    };
  } catch (error) {
    return {
      ...readinessReport,
      status: "FAILED",
      networkAttempted: true,
      failureReason: error instanceof Error ? sanitizeErrorMessage(error.message) : "SEARCH_AD_UNKNOWN_ERROR",
      evidenceNotes: [...readinessReport.evidenceNotes, "읽기 전용 요청 중 예외가 발생했지만 외부 쓰기는 시도하지 않았습니다."],
    };
  }
}

export function buildSearchAdKeywordToolRequest(input: {
  env: EnvMap;
  hintKeywords: string[];
  timestamp: string;
}): SearchAdKeywordToolRequest {
  const apiKey = requiredSearchAdAccessLicense(input.env);
  const secretKey = requiredEnv(input.env, "NAVER_SEARCH_AD_SECRET_KEY");
  const customerId = requiredEnv(input.env, "NAVER_SEARCH_AD_CUSTOMER_ID");
  const query = new URLSearchParams({
    hintKeywords: input.hintKeywords.map(normalizeSearchAdHintKeyword).filter(Boolean).join(","),
    showDetail: "1",
  });

  return {
    method: "GET",
    url: `${resolveSearchAdBaseUrl(input.env)}${SEARCH_AD_KEYWORD_TOOL_PATH}?${query.toString()}`,
    path: SEARCH_AD_KEYWORD_TOOL_PATH,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": input.timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": createSearchAdSignature(input.timestamp, "GET", SEARCH_AD_KEYWORD_TOOL_PATH, secretKey),
    },
  };
}

export function buildSearchAdStatsRequest(input: {
  env: EnvMap;
  ids: string[];
  timestamp: string;
  datePreset?: string;
  breakdown?: "pcMblTp" | "hh24";
}): SearchAdStatsRequest {
  const query = new URLSearchParams({
    ids: input.ids.join(","),
    fields: JSON.stringify(SEARCH_AD_STATS_FIELDS),
    datePreset: normalizeStatsDatePreset(input.datePreset),
    timeIncrement: "allDays",
  });
  if (input.breakdown) {
    query.set("breakdown", input.breakdown);
  }

  return {
    ...buildSearchAdSignedGetRequest({
      env: input.env,
      path: SEARCH_AD_STATS_PATH,
      query,
      timestamp: input.timestamp,
    }),
    path: SEARCH_AD_STATS_PATH,
  };
}

export function buildSearchAdShoppingKeywordStatsRequest(input: {
  env: EnvMap;
  id: string;
  timestamp: string;
}): SearchAdShoppingKeywordStatsRequest {
  return {
    ...buildSearchAdSignedGetRequest({
      env: input.env,
      path: SEARCH_AD_STATS_PATH,
      query: new URLSearchParams({
        id: input.id,
        statType: "NPLA_SCH_KEYWORD",
      }),
      timestamp: input.timestamp,
    }),
    path: SEARCH_AD_STATS_PATH,
  };
}

function buildSearchAdSignedGetRequest(input: {
  env: EnvMap;
  path: string;
  query?: URLSearchParams;
  timestamp: string;
}): SearchAdKeywordToolRequest {
  const apiKey = requiredSearchAdAccessLicense(input.env);
  const secretKey = requiredEnv(input.env, "NAVER_SEARCH_AD_SECRET_KEY");
  const customerId = requiredEnv(input.env, "NAVER_SEARCH_AD_CUSTOMER_ID");
  const queryString = input.query?.toString();

  return {
    method: "GET",
    url: `${resolveSearchAdBaseUrl(input.env)}${input.path}${queryString ? `?${queryString}` : ""}`,
    path: input.path,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": input.timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": createSearchAdSignature(input.timestamp, "GET", input.path, secretKey),
    },
  };
}

export function createSearchAdSignature(timestamp: string, method: string, path: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(`${timestamp}.${method}.${path}`).digest("base64");
}

export function mapSearchAdKeywordToolResponseToSnapshots(input: {
  response: SearchAdKeywordToolResponse;
  collectedAt: string;
  cachedUntil: string;
}): KeywordDemandSnapshot[] {
  return (input.response.keywordList ?? [])
    .filter((item) => typeof item.relKeyword === "string" && item.relKeyword.trim().length > 0)
    .map((item) => ({
      id: `kw-demand-search-ad-${slugify(item.relKeyword!)}-${input.collectedAt.slice(0, 10)}`,
      keyword: item.relKeyword!.trim(),
      provider: "naver_keyword_tool",
      monthlyPcSearches: parseKeywordToolCount(item.monthlyPcQcCnt),
      monthlyMobileSearches: parseKeywordToolCount(item.monthlyMobileQcCnt),
      competitionIndex: normalizeCompetitionIndex(item.compIdx),
      averagePcCtr: parseKeywordToolNumber(item.monthlyAvePcCtr),
      averageMobileCtr: parseKeywordToolNumber(item.monthlyAveMobileCtr),
      cachedUntil: input.cachedUntil,
      collectedAt: input.collectedAt,
      rateLimitState: "OK",
    }));
}

async function syncSearchAdPerformanceStats(input: {
  env: EnvMap;
  checkedAt: string;
  fetchImpl: FetchLike;
  timestampFactory: () => string;
}): Promise<SearchAdStatsSyncResult> {
  try {
    const targetResult = await resolveSearchAdStatTargets(input);
    const targets = targetResult.targets.slice(0, searchAdStatMaxKeywordCount(input.env));
    if (targets.length === 0) {
      const shoppingResult = await syncShoppingSearchAdPerformanceStats(input);
      return {
        snapshots: [],
        shoppingSnapshots: shoppingResult.snapshots,
        requestedTargetCount: 0,
        discoveredTargetCount: targetResult.discoveredTargetCount,
        ...(shoppingResult.httpStatus !== undefined ? { httpStatus: shoppingResult.httpStatus } : {}),
        notes: [
          ...targetResult.notes,
          "검색광고 성과 조회 대상 ID가 없어 /stats 호출은 건너뛰었습니다. 자동 발견을 켜거나 MARKETCREW_SEARCH_AD_STAT_IDS를 설정하면 규칙 엔진 입력이 생성됩니다.",
          ...shoppingResult.notes,
        ],
      };
    }

    const datePreset = normalizeStatsDatePreset(input.env.MARKETCREW_SEARCH_AD_STAT_DATE_PRESET);
    const targetMap = new Map(targets.map((target) => [target.id, target]));
    const snapshots: SearchAdPerformanceSnapshot[] = [];
    let httpStatus: number | undefined;

    for (const targetChunk of chunk(targets, searchAdStatRequestChunkSize(input.env))) {
      for (const breakdown of [undefined, "pcMblTp", "hh24"] as const) {
        const request = buildSearchAdStatsRequest({
          env: input.env,
          ids: targetChunk.map((target) => target.id),
          timestamp: input.timestampFactory(),
          datePreset,
          breakdown,
        });
        const response = await input.fetchImpl(request.url, {
          method: request.method,
          headers: request.headers,
        });
        httpStatus = response.status;
        if (!response.ok) {
          return {
            snapshots,
            shoppingSnapshots: [],
            requestedTargetCount: targets.length,
            discoveredTargetCount: targetResult.discoveredTargetCount,
            httpStatus,
            failureReason: `SEARCH_AD_STATS_HTTP_${httpStatus}`,
            notes: [
              ...targetResult.notes,
              `검색광고 성과 /stats 조회가 응답 ${httpStatus}로 실패했습니다. 이미 수집한 요약만 유지하고 원문은 저장하지 않았습니다.`,
            ],
          };
        }

        const responseBody = (await response.json()) as SearchAdStatsResponse;
        snapshots.push(
          ...mapSearchAdStatsResponseToSnapshots({
            response: responseBody,
            targets: targetChunk,
            targetMap,
            collectedAt: input.checkedAt,
            windowDays: statsDatePresetWindowDays(datePreset),
            breakdown,
          }),
        );
      }
    }
    const shoppingResult = await syncShoppingSearchAdPerformanceStats(input);
    if (shoppingResult.httpStatus !== undefined) {
      httpStatus = shoppingResult.httpStatus;
    }

    return {
      snapshots,
      shoppingSnapshots: shoppingResult.snapshots,
      requestedTargetCount: targets.length,
      discoveredTargetCount: targetResult.discoveredTargetCount,
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      notes: [
        ...targetResult.notes,
        `검색광고 성과 /stats 대상 ${targets.length.toLocaleString("ko-KR")}개에서 성과 스냅샷 ${snapshots.length.toLocaleString("ko-KR")}건을 정규화했습니다.`,
        ...shoppingResult.notes,
      ],
    };
  } catch (error) {
    return {
      snapshots: [],
      shoppingSnapshots: [],
      requestedTargetCount: 0,
      discoveredTargetCount: 0,
      failureReason: error instanceof SearchAdReadOnlyHttpError ? error.reason : "SEARCH_AD_STATS_UNKNOWN_ERROR",
      ...(error instanceof SearchAdReadOnlyHttpError ? { httpStatus: error.httpStatus } : {}),
      notes: [
        error instanceof SearchAdReadOnlyHttpError
          ? `검색광고 성과 대상 발견 중 응답 ${error.httpStatus}가 발생했습니다. 성과 스냅샷은 저장하지 않았습니다.`
          : "검색광고 성과 조회 중 예외가 발생했습니다. 키워드 수요 수집은 유지하고 외부 쓰기는 시도하지 않았습니다.",
      ],
    };
  }
}

async function syncShoppingSearchAdPerformanceStats(input: {
  env: EnvMap;
  checkedAt: string;
  fetchImpl: FetchLike;
  timestampFactory: () => string;
}): Promise<{ snapshots: ShoppingSearchAdPerformanceSnapshot[]; notes: string[]; httpStatus?: number }> {
  if (!shoppingSearchAdStatsEnabled(input.env)) {
    return {
      snapshots: [],
      notes: ["쇼핑검색광고 검색어 성과 수집이 설정으로 꺼져 있습니다."],
    };
  }

  try {
    const targetResult = await resolveShoppingSearchAdTargets(input);
    const targets = targetResult.targets.slice(0, shoppingSearchAdStatMaxAdGroupCount(input.env));
    if (targets.length === 0) {
      return {
        snapshots: [],
        notes: [
          ...targetResult.notes,
          "쇼핑검색광고 성과 조회 대상 광고그룹이 없어 NPLA_SCH_KEYWORD 호출은 건너뛰었습니다.",
        ],
      };
    }

    const snapshots: ShoppingSearchAdPerformanceSnapshot[] = [];
    let httpStatus: number | undefined;

    for (const target of targets) {
      const request = buildSearchAdShoppingKeywordStatsRequest({
        env: input.env,
        id: target.id,
        timestamp: input.timestampFactory(),
      });
      const response = await input.fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
      });
      httpStatus = response.status;
      if (!response.ok) {
        return {
          snapshots,
          httpStatus,
          notes: [
            ...targetResult.notes,
            `쇼핑검색광고 검색어 성과 조회가 응답 ${httpStatus}로 실패했습니다. 이미 수집한 요약만 유지하고 원문은 저장하지 않았습니다.`,
          ],
        };
      }

      const responseBody = (await response.json()) as unknown;
      snapshots.push(
        ...mapShoppingSearchAdStatsResponseToSnapshots({
          response: responseBody,
          target,
          collectedAt: input.checkedAt,
        }),
      );
    }

    const cappedSnapshots = capShoppingSearchAdSnapshots(snapshots, input.env);

    return {
      snapshots: cappedSnapshots,
      ...(httpStatus !== undefined ? { httpStatus } : {}),
      notes: [
        ...targetResult.notes,
        `쇼핑검색광고 검색어 성과 대상 ${targets.length.toLocaleString("ko-KR")}개에서 성과 스냅샷 ${snapshots.length.toLocaleString(
          "ko-KR",
        )}건을 정규화했습니다.`,
        ...(cappedSnapshots.length < snapshots.length
          ? [
              `화면/AI 입력 비용 보호를 위해 클릭·광고비 기준 상위 ${cappedSnapshots.length.toLocaleString(
                "ko-KR",
              )}건만 저장했습니다.`,
            ]
          : []),
      ],
    };
  } catch {
    return {
      snapshots: [],
      notes: ["쇼핑검색광고 검색어 성과 조회 중 예외가 발생했습니다. 외부 쓰기는 시도하지 않았습니다."],
    };
  }
}

async function resolveShoppingSearchAdTargets(input: {
  env: EnvMap;
  fetchImpl: FetchLike;
  timestampFactory: () => string;
}): Promise<{ targets: SearchAdShoppingTarget[]; notes: string[] }> {
  const maxCampaigns = searchAdStatMaxCampaignCount(input.env);
  const maxAdGroups = shoppingSearchAdStatMaxAdGroupCount(input.env);
  const campaigns = sortSearchAdEntitiesByActiveFirst(await fetchSearchAdEntities({
    env: input.env,
    path: SEARCH_AD_CAMPAIGNS_PATH,
    query: new URLSearchParams({ campaignType: "SHOPPING", recordSize: `${maxCampaigns}` }),
    fetchImpl: input.fetchImpl,
    timestamp: input.timestampFactory(),
  }).then((entities) => entities.filter(isActiveSearchAdEntity).filter(isShoppingCampaignEntity)));
  const productGroups = await fetchShoppingProductGroups(input);
  const productGroupMap = new Map(
    productGroups
      .map((productGroup) => [readString(productGroup["nccProductGroupId"]), productGroup] as const)
      .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry[0])),
  );
  const targets: SearchAdShoppingTarget[] = [];

  for (const campaign of campaigns.slice(0, maxCampaigns)) {
    const campaignId = readString(campaign["nccCampaignId"]);
    if (!campaignId) {
      continue;
    }

    const adGroups = sortSearchAdEntitiesByActiveFirst(await fetchSearchAdEntities({
      env: input.env,
      path: SEARCH_AD_ADGROUPS_PATH,
      query: new URLSearchParams({ nccCampaignId: campaignId, recordSize: `${maxAdGroups}` }),
      fetchImpl: input.fetchImpl,
      timestamp: input.timestampFactory(),
    }).then((entities) => entities.filter(isActiveSearchAdEntity).filter(isShoppingAdGroupEntity)));

    for (const adGroup of adGroups.slice(0, maxAdGroups)) {
      const adGroupId = readString(adGroup["nccAdgroupId"]);
      if (!adGroupId) {
        continue;
      }

      const inlineProductGroup = readRecord(adGroup["productGroup"]);
      const productGroupId = readString(adGroup["nccProductGroupId"]) ?? readString(inlineProductGroup?.["nccProductGroupId"]);
      const productGroup = inlineProductGroup ?? (productGroupId ? productGroupMap.get(productGroupId) : undefined);
      targets.push({
        id: adGroupId,
        adGroupId,
        brandKey: inferSearchAdBrandKey(input.env, [
          readString(campaign["name"]) ?? "",
          readString(adGroup["name"]) ?? "",
          readString(productGroup?.["mallName"]) ?? "",
          readString(productGroup?.["brandName"]) ?? "",
        ]),
        campaignName: readString(campaign["name"]) ?? campaignId,
        adGroupName: readString(adGroup["name"]) ?? adGroupId,
        ...(productGroupId ? { productGroupId } : {}),
        ...(readString(productGroup?.["name"]) ? { productGroupName: readString(productGroup?.["name"]) } : {}),
        ...(readString(productGroup?.["mallName"]) ? { mallName: readString(productGroup?.["mallName"]) } : {}),
        ...(readString(productGroup?.["registeredProductType"]) ? { registeredProductType: readString(productGroup?.["registeredProductType"]) } : {}),
      });

      if (targets.length >= maxAdGroups) {
        return {
          targets,
          notes: [
            `쇼핑검색광고 캠페인/광고그룹을 읽어 검색어 성과 대상 ${targets.length.toLocaleString("ko-KR")}개를 자동 발견했습니다.`,
            productGroups.length > 0
              ? `쇼핑검색광고 상품 그룹 ${productGroups.length.toLocaleString("ko-KR")}개를 읽어 몰/상품 그룹 근거로 연결했습니다.`
              : "쇼핑검색광고 상품 그룹 목록은 없거나 읽지 못해 광고그룹 기준으로만 연결했습니다.",
          ],
        };
      }
    }
  }

  return {
    targets,
    notes: [
      `쇼핑검색광고 캠페인/광고그룹을 읽어 검색어 성과 대상 ${targets.length.toLocaleString("ko-KR")}개를 자동 발견했습니다.`,
      productGroups.length > 0
        ? `쇼핑검색광고 상품 그룹 ${productGroups.length.toLocaleString("ko-KR")}개를 읽어 몰/상품 그룹 근거로 연결했습니다.`
        : "쇼핑검색광고 상품 그룹 목록은 없거나 읽지 못해 광고그룹 기준으로만 연결했습니다.",
    ],
  };
}

async function fetchShoppingProductGroups(input: {
  env: EnvMap;
  fetchImpl: FetchLike;
  timestampFactory: () => string;
}): Promise<SearchAdEntityResponse> {
  try {
    return await fetchSearchAdEntities({
      env: input.env,
      path: SEARCH_AD_PRODUCT_GROUPS_PATH,
      query: new URLSearchParams(),
      fetchImpl: input.fetchImpl,
      timestamp: input.timestampFactory(),
    });
  } catch {
    return [];
  }
}

function mapShoppingSearchAdStatsResponseToSnapshots(input: {
  response: unknown;
  target: SearchAdShoppingTarget;
  collectedAt: string;
}): ShoppingSearchAdPerformanceSnapshot[] {
  return (Array.isArray(input.response) ? input.response : [])
    .filter((row): row is SearchAdShoppingKeywordStatRow => isRecord(row))
    .filter((row) => readString(row.schKeyword))
    .map((row) => {
      const searchKeyword = readString(row.schKeyword) ?? input.target.id;
      return {
        id: `shopping-search-ad-performance-${slugify(input.target.brandKey)}-${slugify(input.target.id)}-${slugify(searchKeyword)}-${input.collectedAt.slice(0, 10)}`,
        provider: "naver_search_ad",
        brandKey: input.target.brandKey,
        campaignName: input.target.campaignName,
        adGroupName: input.target.adGroupName,
        adGroupId: input.target.adGroupId,
        searchKeyword,
        ...(input.target.productGroupId ? { productGroupId: input.target.productGroupId } : {}),
        ...(input.target.productGroupName ? { productGroupName: input.target.productGroupName } : {}),
        ...(input.target.mallName ? { mallName: input.target.mallName } : {}),
        ...(input.target.registeredProductType ? { registeredProductType: input.target.registeredProductType } : {}),
        windowDays: 30,
        clicks: parseStatNumber(row.clkCnt) ?? 0,
        directConversionRate: normalizeDirectConversionRate(row.drtCrto),
        cost: parseStatNumber(row.salesAmt) ?? 0,
        collectedAt: input.collectedAt,
        dataScope: "aggregate_only",
      };
    });
}

function capShoppingSearchAdSnapshots(
  snapshots: ShoppingSearchAdPerformanceSnapshot[],
  env: EnvMap,
): ShoppingSearchAdPerformanceSnapshot[] {
  const maxSnapshots = shoppingSearchAdStatMaxSnapshotCount(env);
  return snapshots
    .slice()
    .sort((left, right) => shoppingSearchAdSnapshotPriority(right) - shoppingSearchAdSnapshotPriority(left))
    .slice(0, maxSnapshots);
}

function shoppingSearchAdSnapshotPriority(snapshot: ShoppingSearchAdPerformanceSnapshot): number {
  const noConversionPenalty = snapshot.directConversionRate <= 0 ? 1_000_000 : 0;
  return noConversionPenalty + snapshot.cost + snapshot.clicks * 100;
}

function mapSearchAdStatsResponseToSnapshots(input: {
  response: SearchAdStatsResponse;
  targets: SearchAdStatTarget[];
  targetMap: Map<string, SearchAdStatTarget>;
  collectedAt: string;
  windowDays: number;
  breakdown?: "pcMblTp" | "hh24";
}): SearchAdPerformanceSnapshot[] {
  return searchAdStatRows(input.response).flatMap((row) => {
    const target = resolveStatRowTarget(row, input.targets, input.targetMap);
    if (!target) {
      return [];
    }

    if (input.breakdown && row.breakdowns?.length) {
      return row.breakdowns.map((breakdown) =>
        buildSearchAdPerformanceSnapshot({
          target,
          row: breakdown,
          collectedAt: input.collectedAt,
          windowDays: input.windowDays,
          breakdown: input.breakdown,
        }),
      );
    }

    return [
      buildSearchAdPerformanceSnapshot({
        target,
        row,
        collectedAt: input.collectedAt,
        windowDays: input.windowDays,
      }),
    ];
  });
}

function buildSearchAdPerformanceSnapshot(input: {
  target: SearchAdStatTarget;
  row: SearchAdStatBreakdown;
  collectedAt: string;
  windowDays: number;
  breakdown?: "pcMblTp" | "hh24";
}): SearchAdPerformanceSnapshot {
  const device = input.breakdown === "pcMblTp" ? normalizeSearchAdDevice(input.row.name) : "ALL";
  const timeSlot = input.breakdown === "hh24" ? normalizeSearchAdHour(input.row.name) : undefined;
  const scope = input.breakdown ? `${input.breakdown}-${slugify(input.row.name ?? "unknown")}` : "all";
  const conversions = parseStatNumber(input.row.purchaseCcnt) ?? parseStatNumber(input.row.ccnt) ?? 0;
  const revenue = parseStatNumber(input.row.purchaseConvAmt) ?? parseStatNumber(input.row.convAmt) ?? 0;

  return {
    id: `search-ad-performance-${slugify(input.target.brandKey)}-${slugify(input.target.id)}-${scope}-${input.collectedAt.slice(0, 10)}`,
    provider: "naver_search_ad",
    brandKey: input.target.brandKey,
    campaignName: input.target.campaignName,
    adGroupName: input.target.adGroupName,
    keyword: input.target.keyword,
    device,
    ...(timeSlot ? { timeSlot } : {}),
    windowDays: input.windowDays,
    impressions: parseStatNumber(input.row.impCnt) ?? 0,
    clicks: parseStatNumber(input.row.clkCnt) ?? 0,
    cost: parseStatNumber(input.row.salesAmt) ?? 0,
    conversions,
    revenue,
    ...(input.target.targetCpa !== undefined ? { targetCpa: input.target.targetCpa } : {}),
    ...(input.target.targetRoas !== undefined ? { targetRoas: input.target.targetRoas } : {}),
    trackingVerified: input.target.trackingVerified,
    collectedAt: input.collectedAt,
    dataScope: "aggregate_only",
  };
}

async function resolveSearchAdStatTargets(input: {
  env: EnvMap;
  checkedAt: string;
  fetchImpl: FetchLike;
  timestampFactory: () => string;
}): Promise<{ targets: SearchAdStatTarget[]; discoveredTargetCount: number; notes: string[] }> {
  const configuredTargets = configuredSearchAdStatTargets(input.env);
  if (configuredTargets.length > 0) {
    return {
      targets: configuredTargets,
      discoveredTargetCount: 0,
      notes: [`설정된 검색광고 성과 대상 ${configuredTargets.length.toLocaleString("ko-KR")}개를 사용합니다.`],
    };
  }

  if (!searchAdStatDiscoveryEnabled(input.env)) {
    return {
      targets: [],
      discoveredTargetCount: 0,
      notes: ["검색광고 성과 대상 자동 발견이 꺼져 있습니다."],
    };
  }

  const maxCampaigns = searchAdStatMaxCampaignCount(input.env);
  const maxAdGroups = searchAdStatMaxAdGroupCount(input.env);
  const maxKeywords = searchAdStatMaxKeywordCount(input.env);
  const campaigns = sortSearchAdEntitiesByActiveFirst(await fetchSearchAdEntities({
    env: input.env,
    path: SEARCH_AD_CAMPAIGNS_PATH,
    query: new URLSearchParams({ recordSize: `${maxCampaigns}` }),
    fetchImpl: input.fetchImpl,
    timestamp: input.timestampFactory(),
  }).then((entities) => entities.filter(isActiveSearchAdEntity)));
  const targets: SearchAdStatTarget[] = [];

  for (const campaign of campaigns.slice(0, maxCampaigns)) {
    const campaignId = readString(campaign["nccCampaignId"]);
    if (!campaignId) {
      continue;
    }

    const adGroups = sortSearchAdEntitiesByActiveFirst(await fetchSearchAdEntities({
      env: input.env,
      path: SEARCH_AD_ADGROUPS_PATH,
      query: new URLSearchParams({ nccCampaignId: campaignId, recordSize: `${maxAdGroups}` }),
      fetchImpl: input.fetchImpl,
      timestamp: input.timestampFactory(),
    }).then((entities) => entities.filter(isActiveSearchAdEntity)));

    for (const adGroup of adGroups.slice(0, maxAdGroups)) {
      const adGroupId = readString(adGroup["nccAdgroupId"]);
      if (!adGroupId) {
        continue;
      }

      const keywords = sortSearchAdEntitiesByActiveFirst(await fetchSearchAdEntities({
        env: input.env,
        path: SEARCH_AD_KEYWORDS_PATH,
        query: new URLSearchParams({ nccAdgroupId: adGroupId, recordSize: `${Math.min(maxKeywords, 1000)}` }),
        fetchImpl: input.fetchImpl,
        timestamp: input.timestampFactory(),
      }).then((entities) => entities.filter(isActiveSearchAdEntity)));

      for (const keyword of keywords) {
        const keywordId = readString(keyword["nccKeywordId"]);
        if (!keywordId) {
          continue;
        }

        targets.push(
          buildSearchAdStatTarget({
            env: input.env,
            id: keywordId,
            keyword: readString(keyword["keyword"]) ?? keywordId,
            campaignId,
            campaignName: readString(campaign["name"]) ?? campaignId,
            adGroupId,
            adGroupName: readString(adGroup["name"]) ?? adGroupId,
            trackingMode: readString(campaign["trackingMode"]),
          }),
        );

        if (targets.length >= maxKeywords) {
          return {
            targets,
            discoveredTargetCount: targets.length,
            notes: [`검색광고 캠페인/광고그룹/키워드를 읽어 성과 대상 ${targets.length.toLocaleString("ko-KR")}개를 자동 발견했습니다.`],
          };
        }
      }
    }
  }

  return {
    targets,
    discoveredTargetCount: targets.length,
    notes: [`검색광고 캠페인/광고그룹/키워드를 읽어 성과 대상 ${targets.length.toLocaleString("ko-KR")}개를 자동 발견했습니다.`],
  };
}

async function fetchSearchAdEntities(input: {
  env: EnvMap;
  path: string;
  query: URLSearchParams;
  fetchImpl: FetchLike;
  timestamp: string;
}): Promise<SearchAdEntityResponse> {
  const request = buildSearchAdSignedGetRequest(input);
  const response = await input.fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
  });
  if (!response.ok) {
    throw new SearchAdReadOnlyHttpError(response.status, `SEARCH_AD_ENTITY_HTTP_${response.status}`);
  }

  const body = await response.json();
  return Array.isArray(body) ? (body as SearchAdEntityResponse) : [];
}

function configuredSearchAdStatTargets(env: EnvMap): SearchAdStatTarget[] {
  const jsonTargets = parseConfiguredSearchAdStatTargetsJson(env);
  if (jsonTargets.length > 0) {
    return jsonTargets.slice(0, searchAdStatMaxKeywordCount(env));
  }

  return parseCsv(env.MARKETCREW_SEARCH_AD_STAT_IDS ?? env.NAVER_SEARCH_AD_STAT_IDS)
    .slice(0, searchAdStatMaxKeywordCount(env))
    .map((id) =>
      buildSearchAdStatTarget({
        env,
        id,
        keyword: searchAdStatKeywordLabel(env, id) ?? id,
        campaignName: env.MARKETCREW_SEARCH_AD_STAT_CAMPAIGN_LABEL ?? "검색광고 캠페인",
        adGroupName: env.MARKETCREW_SEARCH_AD_STAT_ADGROUP_LABEL ?? "검색광고 광고그룹",
        trackingMode: undefined,
      }),
    );
}

function parseConfiguredSearchAdStatTargetsJson(env: EnvMap): SearchAdStatTarget[] {
  const raw = env.MARKETCREW_SEARCH_AD_STAT_TARGETS;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!isRecord(item)) {
          return undefined;
        }

        const id = readString(item["id"]) ?? readString(item["nccKeywordId"]) ?? readString(item["nccAdgroupId"]);
        if (!id) {
          return undefined;
        }

        return buildSearchAdStatTarget({
          env,
          id,
          keyword: readString(item["keyword"]) ?? id,
          campaignId: readString(item["campaignId"]) ?? readString(item["nccCampaignId"]),
          campaignName: readString(item["campaignName"]) ?? "검색광고 캠페인",
          adGroupId: readString(item["adGroupId"]) ?? readString(item["nccAdgroupId"]),
          adGroupName: readString(item["adGroupName"]) ?? "검색광고 광고그룹",
          brandKey: readString(item["brandKey"]),
          targetCpa: parseStatNumber(item["targetCpa"]) ?? parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_TARGET_CPA),
          targetRoas: parseStatNumber(item["targetRoas"]) ?? parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_TARGET_ROAS),
          trackingVerified: parseBooleanLike(item["trackingVerified"]) ?? defaultSearchAdTrackingVerified(env, undefined),
          trackingMode: undefined,
        });
      })
      .filter((target): target is SearchAdStatTarget => Boolean(target));
  } catch {
    return [];
  }
}

function buildSearchAdStatTarget(input: {
  env: EnvMap;
  id: string;
  keyword: string;
  campaignId?: string | undefined;
  campaignName: string;
  adGroupId?: string | undefined;
  adGroupName: string;
  brandKey?: string | undefined;
  targetCpa?: number | undefined;
  targetRoas?: number | undefined;
  trackingVerified?: boolean | undefined;
  trackingMode?: string | undefined;
}): SearchAdStatTarget {
  const brandKey =
    input.brandKey ?? inferSearchAdBrandKey(input.env, [input.campaignName, input.adGroupName, input.keyword]);
  const targetCpa = input.targetCpa ?? parseOptionalEnvNumber(input.env.MARKETCREW_SEARCH_AD_TARGET_CPA);
  const targetRoas = input.targetRoas ?? parseOptionalEnvNumber(input.env.MARKETCREW_SEARCH_AD_TARGET_ROAS);
  const trackingVerified = input.trackingVerified ?? defaultSearchAdTrackingVerified(input.env, input.trackingMode);

  return {
    id: input.id,
    brandKey,
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    campaignName: input.campaignName,
    ...(input.adGroupId ? { adGroupId: input.adGroupId } : {}),
    adGroupName: input.adGroupName,
    keyword: input.keyword,
    ...(targetCpa !== undefined ? { targetCpa } : {}),
    ...(targetRoas !== undefined ? { targetRoas } : {}),
    trackingVerified,
  };
}

function searchAdStatRows(response: SearchAdStatsResponse): SearchAdStatRow[] {
  return (
    response.summaryStatResponse?.data ??
    response.dailyStatResponse?.data ??
    response.data ??
    []
  ).filter((row) => isRecord(row)) as SearchAdStatRow[];
}

function resolveStatRowTarget(
  row: SearchAdStatRow,
  targets: SearchAdStatTarget[],
  targetMap: Map<string, SearchAdStatTarget>,
): SearchAdStatTarget | undefined {
  if (row.id && targetMap.has(row.id)) {
    return targetMap.get(row.id);
  }

  return targets.length === 1 ? targets[0] : undefined;
}

function normalizeSearchAdDevice(value: string | undefined): SearchAdPerformanceSnapshot["device"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("mobile") || normalized.includes("mbl") || normalized.includes("모바일")) {
    return "MOBILE";
  }

  if (normalized.includes("pc") || normalized.includes("피씨") || normalized.includes("컴퓨터")) {
    return "PC";
  }

  return "ALL";
}

function normalizeSearchAdHour(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const hour = value.match(/\d{1,2}/)?.[0];
  if (!hour) {
    return value.slice(0, 24);
  }

  return `${Number(hour).toString().padStart(2, "0")}시`;
}

function normalizeStatsDatePreset(value: string | undefined): string {
  const allowed = new Set(["today", "yesterday", "last7days", "last30days", "lastweek", "lastmonth", "lastquarter"]);
  return value && allowed.has(value) ? value : "last7days";
}

function statsDatePresetWindowDays(value: string): number {
  const windows: Record<string, number> = {
    today: 1,
    yesterday: 1,
    last7days: 7,
    last30days: 30,
    lastweek: 7,
    lastmonth: 30,
    lastquarter: 90,
  };

  return windows[value] ?? 7;
}

function inferSearchAdBrandKey(env: EnvMap, values: string[]): string {
  const joined = values.join(" ").toLowerCase();
  if (joined.includes("커피프린트") || joined.includes("coffeeprint") || joined.includes("coffee print")) {
    return "coffeeprint";
  }

  if (joined.includes("스티커씨") || joined.includes("stickersee") || joined.includes("sticker")) {
    return "stickersee";
  }

  return env.MARKETCREW_SEARCH_AD_STAT_BRAND_KEY ?? "stickersee";
}

function defaultSearchAdTrackingVerified(env: EnvMap, trackingMode: string | undefined): boolean {
  const configured = parseBooleanLike(env.MARKETCREW_SEARCH_AD_TRACKING_VERIFIED);
  if (configured !== undefined) {
    return configured;
  }

  return Boolean(trackingMode && trackingMode !== "TRACKING_DISABLED");
}

function searchAdStatKeywordLabel(env: EnvMap, id: string): string | undefined {
  const entries = parseCsv(env.MARKETCREW_SEARCH_AD_STAT_KEYWORD_MAP);
  const entry = entries.find((value) => value.startsWith(`${id}=`));
  return entry?.slice(id.length + 1).trim() || undefined;
}

function isActiveSearchAdEntity(entity: Record<string, unknown>): boolean {
  const status = readString(entity["status"]);
  const statusReason = readString(entity["statusReason"]);
  if (status === "DELETED" || statusReason?.includes("DELETED")) {
    return false;
  }

  return true;
}

function isShoppingCampaignEntity(entity: Record<string, unknown>): boolean {
  const campaignType = readString(entity["campaignTp"]) ?? readString(entity["campaignType"]);
  return campaignType === "SHOPPING" || campaignType === undefined;
}

function isShoppingAdGroupEntity(entity: Record<string, unknown>): boolean {
  const adGroupType = readString(entity["adgroupType"]);
  if (!adGroupType) {
    return true;
  }

  return ["SHOPPING", "CATALOG", "SHOPPING_BRAND"].includes(adGroupType);
}

function sortSearchAdEntitiesByActiveFirst(entities: SearchAdEntityResponse): SearchAdEntityResponse {
  return [...entities].sort((a, b) => searchAdEntityPriority(a) - searchAdEntityPriority(b));
}

function searchAdEntityPriority(entity: Record<string, unknown>): number {
  const status = readString(entity["status"]);
  if (status === "ELIGIBLE" || status === "LIMITED_ELIGIBLE") {
    return 0;
  }

  if (status === "PAUSED") {
    return 1;
  }

  return 2;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseStatNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/[^\d.-]/g, "");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDirectConversionRate(value: unknown): number {
  const parsed = parseStatNumber(value);
  if (!parsed || parsed <= 0) {
    return 0;
  }

  return parsed > 1 ? parsed / 100 : parsed;
}

function parseOptionalEnvNumber(value: string | undefined): number | undefined {
  const parsed = parseStatNumber(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (["true", "1", "yes", "y"].includes(value.toLowerCase())) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(value.toLowerCase())) {
    return false;
  }

  return undefined;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function searchAdStatDiscoveryEnabled(env: EnvMap): boolean {
  return parseBooleanLike(env.MARKETCREW_SEARCH_AD_STAT_DISCOVERY_ENABLED) ?? true;
}

function shoppingSearchAdStatsEnabled(env: EnvMap): boolean {
  return parseBooleanLike(env.MARKETCREW_SEARCH_AD_SHOPPING_STATS_ENABLED) ?? true;
}

function searchAdStatMaxCampaignCount(env: EnvMap): number {
  return clampCount(parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_STAT_MAX_CAMPAIGNS), 1, 20, 5);
}

function searchAdStatMaxAdGroupCount(env: EnvMap): number {
  return clampCount(parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_STAT_MAX_ADGROUPS), 1, 50, 10);
}

function shoppingSearchAdStatMaxAdGroupCount(env: EnvMap): number {
  return clampCount(
    parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_SHOPPING_STAT_MAX_ADGROUPS) ??
      parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_STAT_MAX_ADGROUPS),
    1,
    50,
    10,
  );
}

function shoppingSearchAdStatMaxSnapshotCount(env: EnvMap): number {
  return clampCount(parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_SHOPPING_STAT_MAX_SNAPSHOTS), 20, 2_000, 500);
}

function searchAdStatMaxKeywordCount(env: EnvMap): number {
  return clampCount(parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_STAT_MAX_KEYWORDS), 1, 200, 50);
}

function searchAdStatRequestChunkSize(env: EnvMap): number {
  return clampCount(parseOptionalEnvNumber(env.MARKETCREW_SEARCH_AD_STAT_REQUEST_CHUNK_SIZE), 1, 50, 20);
}

function clampCount(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

class SearchAdReadOnlyHttpError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly reason: string,
  ) {
    super(reason);
  }
}

function requiredSearchAdAccessLicense(env: EnvMap): string {
  const value = resolveSearchAdAccessLicense(env);
  if (!value) {
    throw new Error("NAVER_SEARCH_AD_ACCESS_LICENSE is required for Search Ad read-only request");
  }

  return value;
}

function requiredEnv(env: EnvMap, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required for Search Ad read-only request`);
  }

  return value;
}

function defaultHintKeywords(env: EnvMap): string[] {
  return (env.MARKETCREW_PROVIDER_SYNC_HINT_KEYWORDS ?? "부처님오신날 선물카드,추석 선물카드")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseKeywordToolCount(value: string | number | undefined): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return undefined;
  }

  if (value.trim().startsWith("<")) {
    return 0;
  }

  const normalized = value.replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : undefined;
}

function parseKeywordToolNumber(value: string | number | undefined): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/[^\d.]/g, "");
  return normalized ? Number(normalized) : undefined;
}

function normalizeCompetitionIndex(value: string | undefined): KeywordDemandSnapshot["competitionIndex"] {
  if (value === "높음" || value === "HIGH") {
    return "HIGH";
  }

  if (value === "중간" || value === "MEDIUM") {
    return "MEDIUM";
  }

  if (value === "낮음" || value === "LOW") {
    return "LOW";
  }

  return "UNKNOWN";
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeErrorMessage(message: string): string {
  return message.slice(0, 160).replace(/[A-Za-z0-9+/=_-]{24,}/g, "[redacted]");
}

function normalizeSearchAdHintKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, "").trim();
}

function buildProviderMissingConfigSignal(input: {
  id: string;
  title: string;
  provider: "search_ad" | "datalab";
  evidenceRowId: string;
  checkedAt: string;
}): ProviderSyncReport["generatedSignal"] {
  return {
    id: input.id,
    source: input.provider,
    signalType: "target_gap",
    entityType: input.provider === "search_ad" ? "campaign" : "keyword",
    entityId: input.provider,
    title: input.title,
    periodStart: input.checkedAt.slice(0, 10),
    periodEnd: input.checkedAt.slice(0, 10),
    evidenceRowIds: [input.evidenceRowId],
    createdAt: input.checkedAt,
  };
}
