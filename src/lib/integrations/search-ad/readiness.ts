import type { ProviderReadinessReport } from "@/lib/domain";

export const SEARCH_AD_READINESS_SOURCE_URL = "https://github.com/naver/searchad-apidoc";
export const SEARCH_AD_API_SPEC_URL = "http://naver.github.io/searchad-apidoc/";
export const SEARCH_AD_BASE_URL = "https://api.searchad.naver.com";
export const SEARCH_AD_ACCESS_LICENSE_ENV_KEYS = ["NAVER_SEARCH_AD_ACCESS_LICENSE", "NAVER_SEARCH_AD_API_KEY"] as const;
export const SEARCH_AD_WRITE_GATE_ENV_KEYS = ["NAVER_SEARCH_AD_WRITE_ENABLED", "SEARCH_AD_WRITE_ENABLED"] as const;
export const SEARCH_AD_REQUIRED_HEADERS = [
  "Content-Type",
  "X-Timestamp",
  "X-API-KEY",
  "X-Customer",
  "X-Signature",
] as const;

type EnvMap = Record<string, string | undefined>;

// Design Ref: §7 — Search Ad credentials stay server-only and write is gate-protected.
export function buildSearchAdReadinessReport(env: EnvMap = process.env, checkedAt = new Date().toISOString()): ProviderReadinessReport {
  const missingEnvKeys = [
    ...(!resolveSearchAdAccessLicense(env) ? ["NAVER_SEARCH_AD_ACCESS_LICENSE"] : []),
    ...(!hasValue(env.NAVER_SEARCH_AD_SECRET_KEY) ? ["NAVER_SEARCH_AD_SECRET_KEY"] : []),
    ...(!hasValue(env.NAVER_SEARCH_AD_CUSTOMER_ID) ? ["NAVER_SEARCH_AD_CUSTOMER_ID"] : []),
  ];
  const canRead = missingEnvKeys.length === 0;
  const writeGateOpen = SEARCH_AD_WRITE_GATE_ENV_KEYS.some((key) => env[key] === "true");
  const canWrite = canRead && writeGateOpen;

  return {
    provider: "search_ad",
    label: "네이버 키워드광고",
    status: canRead ? (canWrite ? "READY" : "READ_ONLY_READY") : "MISSING_CONFIG",
    canRead,
    canWrite,
    readScope: canRead ? "통계, 고객 링크, 캠페인/그룹/키워드 조회 준비" : "Access License/시크릿/고객 ID 확인 필요",
    writeScope: canWrite ? "외부 반영 잠금 해제" : "키워드/입찰/예산 변경은 외부 반영 잠금으로 차단",
    missingEnvKeys,
    checkedAt,
    sourceUrl: SEARCH_AD_READINESS_SOURCE_URL,
    requiredHeaders: [...SEARCH_AD_REQUIRED_HEADERS],
    evidenceNotes: [
      `공식 샘플 기준 Base URL은 ${SEARCH_AD_BASE_URL}입니다.`,
      "인증 헤더는 시간값, 접근 라이선스, 고객 ID, HMAC-SHA256 서명 조합입니다.",
      "접근 라이선스 환경 설정은 NAVER_SEARCH_AD_ACCESS_LICENSE를 우선 사용하고 기존 NAVER_SEARCH_AD_API_KEY도 함께 허용합니다.",
      "쓰기 작업은 별도 잠금이 열리기 전까지 차단합니다.",
    ],
    disabledReason: canRead && !canWrite ? "대표 승인 후에도 외부 반영 잠금이 별도로 열려야 실제 변경이 가능합니다." : undefined,
  };
}

export function resolveSearchAdAccessLicense(env: EnvMap): string | undefined {
  return SEARCH_AD_ACCESS_LICENSE_ENV_KEYS.map((key) => env[key]).find(hasValue);
}

export function resolveSearchAdBaseUrl(env: EnvMap): string {
  return stripTrailingSlash(env.NAVER_SEARCH_AD_BASE_URL ?? SEARCH_AD_BASE_URL);
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
