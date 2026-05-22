import type { ProviderSyncReport, ShopAggregateSnapshot } from "@/lib/domain";
import { buildShopReadinessReport, resolveFirstEnv, YOUNGCART_BRIDGE_SOURCE_URL } from "@/lib/integrations/providers/readiness";

type EnvMap = Record<string, string | undefined>;
type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

export function buildYoungcartReadOnlySyncReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport {
  const readiness = buildShopReadinessReport(env, checkedAt);
  const endpoint = resolveYoungcartBridgeUrl(env) ?? "YOUNGCART_BRIDGE_URL?action=aggregate";

  if (!readiness.canRead) {
    return {
      id: `provider-sync-shop-${checkedAt}`,
      provider: "shop",
      label: "쇼핑몰(커피프린트) 읽기 전용 수집",
      status: "SKIPPED_MISSING_CONFIG",
      readOnly: true,
      networkAttempted: false,
      writeAttempted: false,
      endpoint,
      sourceUrl: YOUNGCART_BRIDGE_SOURCE_URL,
      missingEnvKeys: readiness.missingEnvKeys,
      evidenceNotes: [
        "연결 주소/토큰/승인 또는 개인정보 최소화 확인이 부족해 네트워크 호출을 시도하지 않았습니다.",
        "쓰기 작업은 이 수집에서 호출하지 않습니다.",
      ],
      checkedAt,
      generatedSignal: {
        id: "signal-provider-shop-missing-config",
        source: "shop",
        signalType: "target_gap",
        entityType: "customer_segment",
        entityId: "youngcart",
        title: "커피프린트 쇼핑몰 연결 수집 대기",
        periodStart: checkedAt.slice(0, 10),
        periodEnd: checkedAt.slice(0, 10),
        evidenceRowIds: ["provider-sync-shop-missing-config"],
        createdAt: checkedAt,
      },
    };
  }

  return {
    id: `provider-sync-shop-${checkedAt}`,
    provider: "shop",
    label: "쇼핑몰(커피프린트) 읽기 전용 수집",
    status: "READY_READ_ONLY",
    readOnly: true,
    networkAttempted: false,
    writeAttempted: false,
    endpoint,
    sourceUrl: YOUNGCART_BRIDGE_SOURCE_URL,
    missingEnvKeys: [],
    evidenceNotes: [
      "토큰 보호 연결 주소를 호출할 준비가 됐습니다.",
      "응답은 주문/재구매/매출 집계로만 저장하고 고객/주문 원문 행은 저장하지 않습니다.",
      "자체 쇼핑몰 외부 반영 연결은 이 수집에서 호출하지 않습니다.",
    ],
    checkedAt,
  };
}

export async function syncYoungcartBridgeAggregate(input: {
  env?: EnvMap;
  checkedAt?: string;
  fetchImpl?: FetchLike;
} = {}): Promise<ProviderSyncReport> {
  const env = input.env ?? process.env;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const readinessReport = buildYoungcartReadOnlySyncReport(env, checkedAt);
  if (readinessReport.status === "SKIPPED_MISSING_CONFIG") {
    return readinessReport;
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const windowDays = parsePositiveInteger(env.YOUNGCART_BRIDGE_WINDOW_DAYS ?? env.SHOP_READONLY_WINDOW_DAYS, 30);

  try {
    const response = await fetchImpl(buildYoungcartBridgeUrl(env, { action: "aggregate", windowDays: `${windowDays}` }), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-MarketCrew-Token": requiredYoungcartBridgeToken(env),
      },
    });
    const responseJson = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(`${stringOrFallback(responseJson.reason ?? responseJson.code, `YOUNGCART_BRIDGE_HTTP_${response.status}`)}: ${stringOrFallback(responseJson.message, response.statusText)}`);
    }

    const snapshot = buildShopAggregateSnapshot({
      checkedAt,
      responseJson,
      windowDays,
    });

    return {
      ...readinessReport,
      status: "SYNCED",
      networkAttempted: true,
      httpStatus: response.status,
      shopAggregateSnapshot: snapshot,
      generatedSignal: buildShopAggregateSignal(snapshot, checkedAt),
      evidenceNotes: [
        ...readinessReport.evidenceNotes,
        `최근 ${snapshot.windowDays.toLocaleString("ko-KR")}일 주문 ${snapshot.orderCount.toLocaleString("ko-KR")}건, 재구매 고객 ${snapshot.repeatCustomerCount.toLocaleString("ko-KR")}명을 집계 전용으로 정규화했습니다.`,
        "연결 토큰, DB 정보, 고객/주문 원문 행은 저장하지 않았습니다.",
      ],
    };
  } catch (error) {
    return {
      ...readinessReport,
      status: "FAILED",
      networkAttempted: true,
      failureReason: sanitizeErrorMessage(errorMessage(error), env),
      evidenceNotes: [...readinessReport.evidenceNotes, "읽기 전용 영카트 연결 요청 중 예외가 발생했지만 외부 쓰기는 시도하지 않았습니다."],
    };
  }
}

export function buildYoungcartBridgeUrl(env: EnvMap, params: Record<string, string>): string {
  const url = new URL(requiredYoungcartBridgeUrl(env));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function buildShopAggregateSnapshot(input: {
  checkedAt: string;
  responseJson: JsonRecord;
  windowDays: number;
}): ShopAggregateSnapshot {
  return {
    id: `shop-aggregate-youngcart-${input.checkedAt.slice(0, 10)}`,
    provider: "youngcart_bridge",
    brandKey: stringOrFallback(input.responseJson.brandKey, "COFFEEPRINT"),
    windowDays: numberOrDefault(input.responseJson.windowDays, input.windowDays),
    orderCount: numberOrDefault(input.responseJson.orderCount, 0),
    repeatCustomerCount: numberOrDefault(input.responseJson.repeatCustomerCount, 0),
    grossSales: numberOrDefault(input.responseJson.grossSales, 0),
    averageOrderValue: numberOrDefault(input.responseJson.averageOrderValue, 0),
    collectedAt: stringOrFallback(input.responseJson.collectedAt, input.checkedAt),
    dataScope: "aggregate_only",
  };
}

function buildShopAggregateSignal(snapshot: ShopAggregateSnapshot, checkedAt: string): ProviderSyncReport["generatedSignal"] {
  return {
    id: `signal-shop-aggregate-${slugify(snapshot.brandKey)}-${checkedAt.slice(0, 10)}`,
    source: "shop",
    signalType: "weekly_trend",
    entityType: "customer_segment",
    entityId: snapshot.brandKey,
    title: `${shopBrandLabel(snapshot.brandKey)} 쇼핑몰 주문/재구매 집계 동기화`,
    currentValue: snapshot.repeatCustomerCount,
    baselineValue: snapshot.orderCount,
    periodStart: addDays(checkedAt.slice(0, 10), -snapshot.windowDays).slice(0, 10),
    periodEnd: checkedAt.slice(0, 10),
    evidenceRowIds: [snapshot.id],
    createdAt: checkedAt,
  };
}

function resolveYoungcartBridgeUrl(env: EnvMap): string | undefined {
  return resolveFirstEnv(env, ["YOUNGCART_BRIDGE_URL", "SHOP_READONLY_BRIDGE_URL"]);
}

function requiredYoungcartBridgeUrl(env: EnvMap): string {
  const value = resolveYoungcartBridgeUrl(env);
  if (!value) {
    throw new Error("YOUNGCART_BRIDGE_URL is required for Youngcart read-only request");
  }

  return value;
}

function requiredYoungcartBridgeToken(env: EnvMap): string {
  const value = resolveFirstEnv(env, ["YOUNGCART_BRIDGE_TOKEN", "SHOP_READONLY_BRIDGE_TOKEN"]);
  if (!value) {
    throw new Error("YOUNGCART_BRIDGE_TOKEN is required for Youngcart read-only request");
  }

  return value;
}

async function parseResponseJson(response: Response): Promise<JsonRecord> {
  try {
    const parsed = await response.json();

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function shopBrandLabel(brandKey: string): string {
  const labels: Record<string, string> = {
    COFFEEPRINT: "커피프린트",
    YOUNGCART: "커피프린트",
  };

  return labels[brandKey.trim().toUpperCase()] ?? brandKey;
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

function sanitizeErrorMessage(message: string, env: EnvMap): string {
  let sanitized = message;
  for (const secret of [env.YOUNGCART_BRIDGE_TOKEN, env.SHOP_READONLY_BRIDGE_TOKEN]) {
    if (secret && secret.length >= 4) {
      sanitized = sanitized.split(secret).join("[redacted]");
    }
  }

  return sanitized
    .replace(/\b(?:mysql|mariadb|postgres|postgresql):\/\/\S+/gi, "[redacted-db-url]")
    .replace(/\b(access[_-]?token|bridge[_-]?token|token|password|passwd|pwd)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
