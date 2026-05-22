import { getProviderHistoryPolicy, type ProviderSyncReport, type SearchTrendSnapshot } from "@/lib/domain";
import { buildDatalabReadinessReport, DATALAB_READINESS_SOURCE_URL, DATALAB_SEARCH_URL } from "./readiness";

type EnvMap = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export type DatalabSearchRequestBody = {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  keywordGroups: Array<{
    groupName: string;
    keywords: string[];
  }>;
};

type DatalabSearchResponse = {
  startDate: string;
  endDate: string;
  timeUnit: "date" | "week" | "month";
  results: Array<{
    title: string;
    keywords: string[];
    data: Array<{ period: string; ratio: number }>;
  }>;
};

export function buildDatalabReadOnlySyncReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport {
  const readiness = buildDatalabReadinessReport(env, checkedAt);

  if (!readiness.canRead) {
    return {
      id: `provider-sync-datalab-${checkedAt}`,
      provider: "datalab",
      label: "네이버 데이터랩 읽기 전용 수집",
      status: "SKIPPED_MISSING_CONFIG",
      readOnly: true,
      networkAttempted: false,
      writeAttempted: false,
      endpoint: DATALAB_SEARCH_URL,
      sourceUrl: DATALAB_READINESS_SOURCE_URL,
      missingEnvKeys: readiness.missingEnvKeys,
      evidenceNotes: [
        "Client ID/Secret이 없어서 네트워크 호출을 시도하지 않았습니다.",
        "공식 DataLab 응답 ratio는 절대 검색량이 아니라 조회 구간 최대값 100 기준 상대값입니다.",
        "데이터랩은 쓰기 채널이 아니므로 외부 변경 요청을 만들지 않습니다.",
      ],
      checkedAt,
      historyPolicy: getProviderHistoryPolicy("datalab"),
      generatedSignal: {
        id: "signal-provider-datalab-missing-config",
        source: "datalab",
        signalType: "target_gap",
        entityType: "keyword",
        entityId: "datalab",
        title: "네이버 데이터랩 검색 트렌드 동기화 대기",
        periodStart: checkedAt.slice(0, 10),
        periodEnd: checkedAt.slice(0, 10),
        evidenceRowIds: ["provider-sync-datalab-missing-config"],
        createdAt: checkedAt,
      },
    };
  }

  return {
    id: `provider-sync-datalab-${checkedAt}`,
    provider: "datalab",
    label: "네이버 데이터랩 읽기 전용 수집",
    status: "READY_READ_ONLY",
    readOnly: true,
    networkAttempted: false,
    writeAttempted: false,
    endpoint: DATALAB_SEARCH_URL,
    sourceUrl: DATALAB_READINESS_SOURCE_URL,
    missingEnvKeys: [],
    evidenceNotes: [
      "검색어 트렌드 조회 요청을 만들 수 있는 인증 재료가 준비됐습니다.",
      "응답은 검색 추이 요약으로 정규화하고 절대 검색량으로 쓰지 않습니다.",
      "쓰기 작업이 없는 읽기 전용 연동입니다.",
    ],
    checkedAt,
    historyPolicy: getProviderHistoryPolicy("datalab"),
  };
}

export async function syncDatalabSearchTrends(input: {
  env?: EnvMap;
  checkedAt?: string;
  requestBody?: DatalabSearchRequestBody;
  fetchImpl?: FetchLike;
} = {}): Promise<ProviderSyncReport> {
  const env = input.env ?? process.env;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const readinessReport = buildDatalabReadOnlySyncReport(env, checkedAt);
  if (readinessReport.status === "SKIPPED_MISSING_CONFIG") {
    return readinessReport;
  }

  const requestBody = buildDatalabSearchRequestBody(input.requestBody ?? buildDefaultDatalabRequestBody(checkedAt, env));
  const fetchImpl = input.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(DATALAB_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": env.NAVER_DATALAB_CLIENT_ID ?? "",
        "X-Naver-Client-Secret": env.NAVER_DATALAB_CLIENT_SECRET ?? "",
      },
      body: JSON.stringify(requestBody),
    });
    const httpStatus = response.status;
    if (!response.ok) {
      return {
        ...readinessReport,
        status: "FAILED",
        networkAttempted: true,
        httpStatus,
        failureReason: `DATALAB_HTTP_${httpStatus}`,
        evidenceNotes: [
          ...readinessReport.evidenceNotes,
          `읽기 전용 요청이 응답 ${httpStatus}로 실패했습니다. 응답 원문은 저장하지 않았습니다.`,
        ],
      };
    }

    const responseBody = (await response.json()) as DatalabSearchResponse;
    const searchTrendSnapshots = mapDatalabSearchResponseToSnapshots({
      response: responseBody,
      collectedAt: checkedAt,
    });

    return {
      ...readinessReport,
      status: "SYNCED",
      networkAttempted: true,
      httpStatus,
      searchTrendSnapshots,
      evidenceNotes: [
        ...readinessReport.evidenceNotes,
        `읽기 전용 데이터랩 응답 ${searchTrendSnapshots.length.toLocaleString("ko-KR")}건을 검색 추이 요약으로 정규화했습니다.`,
      ],
    };
  } catch (error) {
    return {
      ...readinessReport,
      status: "FAILED",
      networkAttempted: true,
      failureReason: error instanceof Error ? sanitizeErrorMessage(error.message) : "DATALAB_UNKNOWN_ERROR",
      evidenceNotes: [...readinessReport.evidenceNotes, "읽기 전용 요청 중 예외가 발생했지만 외부 쓰기는 시도하지 않았습니다."],
    };
  }
}

export function buildDatalabSearchRequestBody(input: DatalabSearchRequestBody): DatalabSearchRequestBody {
  return {
    ...input,
    keywordGroups: input.keywordGroups.slice(0, 5).map((group) => ({
      groupName: group.groupName,
      keywords: group.keywords.slice(0, 20),
    })),
  };
}

export function mapDatalabSearchResponseToSnapshots(input: {
  response: DatalabSearchResponse;
  collectedAt: string;
}): SearchTrendSnapshot[] {
  return input.response.results.map((result) => ({
    id: `trend-datalab-${slugify(result.title)}-${input.response.startDate}-${input.response.endDate}`,
    keywordGroupName: result.title,
    provider: "naver_datalab",
    timeUnit: input.response.timeUnit,
    startDate: input.response.startDate,
    endDate: input.response.endDate,
    ratios: result.data.map((item) => ({
      period: item.period,
      ratio: item.ratio,
    })),
    collectedAt: input.collectedAt,
    note: "relative_ratio_not_absolute_volume",
  }));
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDefaultDatalabRequestBody(checkedAt: string, env: EnvMap): DatalabSearchRequestBody {
  const endDate = checkedAt.slice(0, 10);
  const startDate = addDays(endDate, -30).slice(0, 10);
  const keywords = (env.MARKETCREW_PROVIDER_SYNC_HINT_KEYWORDS ?? "부처님오신날 선물카드,추석 선물카드")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    startDate,
    endDate,
    timeUnit: "date",
    keywordGroups: keywords.map((keyword) => ({
      groupName: keyword,
      keywords: [keyword],
    })),
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function sanitizeErrorMessage(message: string): string {
  return message.slice(0, 160).replace(/[A-Za-z0-9+/=_-]{24,}/g, "[redacted]");
}
