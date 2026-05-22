import { createHmac } from "node:crypto";
import { getProviderHistoryPolicy, type KeywordDemandSnapshot, type ProviderSyncReport } from "@/lib/domain";
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
export const SEARCH_AD_KEYWORD_TOOL_SOURCE_NOTE =
  "네이버 검색광고 API는 X-Timestamp, X-API-KEY, X-Customer, X-Signature 헤더 조합을 사용한다.";

export type SearchAdKeywordToolRequest = {
  method: "GET";
  url: string;
  path: typeof SEARCH_AD_KEYWORD_TOOL_PATH;
  headers: Record<"Content-Type" | "X-Timestamp" | "X-API-KEY" | "X-Customer" | "X-Signature", string>;
};

type SearchAdKeywordToolResponse = {
  keywordList?: Array<{
    relKeyword?: string;
    monthlyPcQcCnt?: string | number;
    monthlyMobileQcCnt?: string | number;
    compIdx?: string;
    monthlyAvePcCtr?: string | number;
    monthlyAveMobileCtr?: string | number;
  }>;
};

export function buildSearchAdReadOnlySyncReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport {
  const readiness = buildSearchAdReadinessReport(env, checkedAt);
  const endpoint = `${resolveSearchAdBaseUrl(env)}${SEARCH_AD_KEYWORD_TOOL_PATH}`;

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
      "실제 호출은 대표가 제공한 서버 환경 설정으로만 수행하며, 응답은 키워드 수요 요약 후보로 정규화합니다.",
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

    return {
      ...readinessReport,
      status: "SYNCED",
      networkAttempted: true,
      httpStatus,
      keywordDemandSnapshots,
      evidenceNotes: [
        ...readinessReport.evidenceNotes,
        `읽기 전용 키워드 도구 응답 ${keywordDemandSnapshots.length.toLocaleString("ko-KR")}건을 키워드 수요 요약으로 정규화했습니다.`,
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
