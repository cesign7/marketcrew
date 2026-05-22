import type { ProviderKey, ProviderReadinessReport } from "@/lib/domain";
import { buildDatalabReadinessReport } from "@/lib/integrations/datalab/readiness";
import { buildSearchAdReadinessReport } from "@/lib/integrations/search-ad/readiness";

type EnvMap = Record<string, string | undefined>;

const PROVIDER_READINESS_SOURCE = "docs/02-design/features/ai-marketing-character-ops.design.md#module-6";
export const NAVER_COMMERCE_AUTH_DOC_URL = "https://apicenter.commerce.naver.com/docs/auth";
export const NAVER_COMMERCE_ORDER_DOC_URL =
  "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C";
export const YOUNGCART_BRIDGE_SOURCE_URL = "integrations/youngcart-bridge/README.md";

// Design Ref: §6 + §7 — provider readiness is visible, server-side, and does not open write gates.
export function buildProviderReadinessReports(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderReadinessReport[] {
  return [
    buildSearchAdReadinessReport(env, checkedAt),
    buildDatalabReadinessReport(env, checkedAt),
    buildSmartstoreReadinessReport(env, checkedAt),
    buildShopReadinessReport(env, checkedAt),
    buildLlmReadinessReport(env, checkedAt),
  ];
}

export function buildSmartstoreReadinessReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderReadinessReport {
  return buildSimpleProviderReadiness({
    provider: "smartstore",
    label: "스마트스토어(스티커씨)",
    requiredEnvGroups: [
      { label: "NAVER_COMMERCE_CLIENT_ID", keys: ["NAVER_COMMERCE_CLIENT_ID", "NAVER_SMARTSTORE_CLIENT_ID"] },
      { label: "NAVER_COMMERCE_CLIENT_SECRET", keys: ["NAVER_COMMERCE_CLIENT_SECRET", "NAVER_SMARTSTORE_CLIENT_SECRET"] },
      {
        label: "MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED=true",
        keys: ["MARKETCREW_COMMERCE_READ_ONLY_CONFIRMED"],
        validator: isTrue,
      },
      {
        label: "MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY=true",
        keys: ["MARKETCREW_COMMERCE_SIGNATURE_DRIVER_READY"],
        validator: isTrue,
      },
      {
        label: "MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED=true",
        keys: ["MARKETCREW_COMMERCE_TOKEN_PROBE_APPROVED"],
        validator: isTrue,
      },
    ],
    readScopeReady: "스티커씨 스마트스토어 주문 집계 읽기 준비",
    readScopeMissing: "네이버 커머스 읽기 키, 서명 런타임, 읽기 전용 승인 확인 필요",
    writeScope: "상품/노출/주문 상태 변경은 별도 외부 반영 잠금 전까지 차단",
    env,
    checkedAt,
    sourceUrl: NAVER_COMMERCE_AUTH_DOC_URL,
    notes: [
      "NAVER_COMMERCE_* 환경 설정을 우선 사용하고 기존 NAVER_SMARTSTORE_* 이름도 함께 허용합니다.",
      "토큰 발급은 bcrypt 기반 client_secret_sign을 쓰며 토큰/서명/secret은 저장하지 않습니다.",
      "현재 단계는 스티커씨 주문 집계 읽기 전용 수집만 수행하며 상품/노출/주문 상태 변경은 차단합니다.",
    ],
  });
}

export function buildShopReadinessReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderReadinessReport {
  return buildSimpleProviderReadiness({
    provider: "shop",
    label: "쇼핑몰(커피프린트)",
    requiredEnvGroups: [
      { label: "YOUNGCART_BRIDGE_URL", keys: ["YOUNGCART_BRIDGE_URL", "SHOP_READONLY_BRIDGE_URL"] },
      { label: "YOUNGCART_BRIDGE_TOKEN", keys: ["YOUNGCART_BRIDGE_TOKEN", "SHOP_READONLY_BRIDGE_TOKEN"] },
      {
        label: "MARKETCREW_YOUNGCART_BRIDGE_APPROVED=true",
        keys: ["MARKETCREW_YOUNGCART_BRIDGE_APPROVED", "MARKETCREW_YOUNGCART_READ_ONLY_USER_CONFIRMED"],
        validator: isTrue,
      },
      {
        label: "MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED=true",
        keys: ["MARKETCREW_YOUNGCART_PII_MINIMIZATION_CONFIRMED"],
        validator: isTrue,
      },
    ],
    readScopeReady: "커피프린트 주문/재구매/매출 집계 연결 준비",
    readScopeMissing: "영카트 읽기 전용 연결 주소/토큰, 승인, 개인정보 최소화 확인 필요",
    writeScope: "자체 쇼핑몰 외부 반영 연결은 아직 구현하지 않음",
    env,
    checkedAt,
    sourceUrl: YOUNGCART_BRIDGE_SOURCE_URL,
    notes: [
      "YOUNGCART_BRIDGE_* 환경 설정을 우선 사용하고 SHOP_READONLY_BRIDGE_* 이름도 함께 허용합니다.",
      "직접 DB 접속보다 토큰 보호 연결을 기본 후보로 둡니다.",
      "커피프린트 연결 응답은 집계만 허용하고 고객/주문 원문 행을 저장하지 않습니다.",
    ],
  });
}

export function resolveFirstEnv(env: EnvMap, keys: readonly string[]): string | undefined {
  return keys.map((key) => env[key]).find(hasValue);
}

function buildLlmReadinessReport(env: EnvMap, checkedAt: string): ProviderReadinessReport {
  const missingEnvKeys = [
    ...(!hasValue(env.AI_LLM_PROVIDER) ? ["AI_LLM_PROVIDER"] : []),
    ...missingLlmCredentialKeys(env),
  ];
  const canRead = missingEnvKeys.length === 0;

  return {
    provider: "llm",
    label: "AI 모델 계획기",
    status: canRead ? "READ_ONLY_READY" : "MISSING_CONFIG",
    canRead,
    canWrite: false,
    readScope: canRead ? "집계 요약 기반 AI 계획 호출 준비" : "AI 모델 연동 정보/키 미설정, 규칙 기반 대체 사용",
    writeScope: "AI 모델은 외부 채널에 직접 쓰지 않음",
    missingEnvKeys,
    checkedAt,
    sourceUrl: PROVIDER_READINESS_SOURCE,
    evidenceNotes: [
      "AI 모델 입력은 후보 요약, 신뢰도, 위험도, 근거 ID만 포함합니다.",
      "원천 행과 고객 식별 정보는 계획 입력에 포함하지 않습니다.",
    ],
    disabledReason: canRead ? undefined : "AI 모델 설정이 없어도 규칙 기반 대체로 오피 종합을 계속 생성합니다.",
  };
}

function buildSimpleProviderReadiness(input: {
  provider: ProviderKey;
  label: string;
  requiredEnvGroups: Array<{
    label: string;
    keys: string[];
    validator?: (value: string | undefined) => boolean;
  }>;
  readScopeReady: string;
  readScopeMissing: string;
  writeScope: string;
  env: EnvMap;
  checkedAt: string;
  sourceUrl: string;
  notes: string[];
}): ProviderReadinessReport {
  const missingEnvKeys = input.requiredEnvGroups
    .filter((group) => !group.keys.some((key) => (group.validator ?? hasValue)(input.env[key])))
    .map((group) => group.label);
  const canRead = missingEnvKeys.length === 0;

  return {
    provider: input.provider,
    label: input.label,
    status: canRead ? "READ_ONLY_READY" : "MISSING_CONFIG",
    canRead,
    canWrite: false,
    readScope: canRead ? input.readScopeReady : input.readScopeMissing,
    writeScope: input.writeScope,
    missingEnvKeys,
    checkedAt: input.checkedAt,
    sourceUrl: input.sourceUrl,
    evidenceNotes: input.notes,
    disabledReason: canRead ? undefined : "읽기 준비 전까지 샘플/캐시 근거로만 안건을 생성합니다.",
  };
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isTrue(value: string | undefined): boolean {
  return value === "true";
}

function missingLlmCredentialKeys(env: EnvMap): string[] {
  if (env.AI_LLM_PROVIDER === "gemini" && !hasValue(env.GEMINI_API_KEY)) {
    return ["GEMINI_API_KEY"];
  }

  if (env.AI_LLM_PROVIDER === "openai" && !hasValue(env.OPENAI_API_KEY)) {
    return ["OPENAI_API_KEY"];
  }

  return [];
}
