import type { ProviderReadinessReport } from "@/lib/domain";

export const DATALAB_READINESS_SOURCE_URL = "https://developers.naver.com/docs/serviceapi/datalab/search/search.md";
export const DATALAB_SEARCH_URL = "https://openapi.naver.com/v1/datalab/search";
export const DATALAB_REQUIRED_ENV_KEYS = ["NAVER_DATALAB_CLIENT_ID", "NAVER_DATALAB_CLIENT_SECRET"] as const;
export const DATALAB_REQUIRED_HEADERS = ["X-Naver-Client-Id", "X-Naver-Client-Secret", "Content-Type"] as const;

type EnvMap = Record<string, string | undefined>;

// Design Ref: §1.2 + §7 — DataLab is read-only trend evidence, not an execution channel.
export function buildDatalabReadinessReport(env: EnvMap = process.env, checkedAt = new Date().toISOString()): ProviderReadinessReport {
  const missingEnvKeys = DATALAB_REQUIRED_ENV_KEYS.filter((key) => !hasValue(env[key]));
  const canRead = missingEnvKeys.length === 0;

  return {
    provider: "datalab",
    label: "네이버 데이터랩",
    status: canRead ? "READ_ONLY_READY" : "MISSING_CONFIG",
    canRead,
    canWrite: false,
    readScope: canRead ? "검색어 트렌드 조회 준비" : "Client ID/Secret 확인 필요",
    writeScope: "데이터랩은 쓰기 채널이 아니므로 외부 변경 없음",
    missingEnvKeys,
    checkedAt,
    sourceUrl: DATALAB_READINESS_SOURCE_URL,
    requiredHeaders: [...DATALAB_REQUIRED_HEADERS],
    evidenceNotes: [
      `공식 요청 URL은 ${DATALAB_SEARCH_URL}입니다.`,
      "응답 ratio는 절대 검색량이 아니라 조회 구간의 최대값을 100으로 둔 상대 비율입니다.",
      "시즌 키워드 판단에는 상품/광고 성과와 결합한 보조 근거로만 사용합니다.",
    ],
  };
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
