import { hashSync } from "bcryptjs";
import { getProviderHistoryPolicy, type CommerceAggregateSnapshot, type ProviderSyncReport } from "@/lib/domain";
import {
  buildSmartstoreReadinessReport,
  NAVER_COMMERCE_AUTH_DOC_URL,
  NAVER_COMMERCE_ORDER_DOC_URL,
  resolveFirstEnv,
} from "@/lib/integrations/providers/readiness";

type EnvMap = Record<string, string | undefined>;
type FetchLike = typeof fetch;
type JsonRecord = Record<string, unknown>;

export const NAVER_COMMERCE_BASE_URL = "https://api.commerce.naver.com";
export const NAVER_COMMERCE_TOKEN_PATH = "/external/v1/oauth2/token";
export const NAVER_COMMERCE_LAST_CHANGED_PATH = "/external/v1/pay-order/seller/product-orders/last-changed-statuses";
export const NAVER_COMMERCE_PRODUCT_ORDER_QUERY_PATH = "/external/v1/pay-order/seller/product-orders/query";
export const NAVER_COMMERCE_ORIGIN_PRODUCT_PATH = "/external/v2/products/origin-products";

export type CommerceTokenRequest = {
  method: "POST";
  url: string;
  headers: Record<"Content-Type" | "Accept", string>;
  body: URLSearchParams;
};

type CommerceAccessToken = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds?: number;
  httpStatus: number;
};

export function buildCommerceReadOnlySyncReport(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport {
  const readiness = buildSmartstoreReadinessReport(env, checkedAt);
  const endpoint = `${resolveCommerceBaseUrl(env)}${NAVER_COMMERCE_LAST_CHANGED_PATH}`;

  if (!readiness.canRead) {
    return {
      id: `provider-sync-smartstore-${checkedAt}`,
      provider: "smartstore",
      label: "스마트스토어(스티커씨) 읽기 전용 수집",
      status: "SKIPPED_MISSING_CONFIG",
      readOnly: true,
      networkAttempted: false,
      writeAttempted: false,
      endpoint,
      sourceUrl: NAVER_COMMERCE_AUTH_DOC_URL,
      missingEnvKeys: readiness.missingEnvKeys,
      evidenceNotes: [
        "커머스 인증/승인/서명 준비가 부족해 네트워크 호출을 시도하지 않았습니다.",
        "쓰기 작업은 이 수집에서 호출하지 않습니다.",
      ],
      checkedAt,
      historyPolicy: getProviderHistoryPolicy("smartstore"),
      generatedSignal: {
        id: "signal-provider-smartstore-missing-config",
        source: "smartstore",
        signalType: "target_gap",
        entityType: "product",
        entityId: "smartstore",
        title: "스티커씨 스마트스토어 읽기 동기화 대기",
        periodStart: checkedAt.slice(0, 10),
        periodEnd: checkedAt.slice(0, 10),
        evidenceRowIds: ["provider-sync-smartstore-missing-config"],
        createdAt: checkedAt,
      },
    };
  }

  return {
    id: `provider-sync-smartstore-${checkedAt}`,
    provider: "smartstore",
    label: "스마트스토어(스티커씨) 읽기 전용 수집",
    status: "READY_READ_ONLY",
    readOnly: true,
    networkAttempted: false,
    writeAttempted: false,
    endpoint,
    sourceUrl: NAVER_COMMERCE_ORDER_DOC_URL,
    missingEnvKeys: [],
    evidenceNotes: [
      "커머스 토큰과 주문 조회 주소를 사용할 수 있는 인증 재료가 준비됐습니다.",
      "토큰/서명/시크릿/주문번호/주문 원문 행은 저장하지 않고 집계값만 남깁니다.",
      "상품/노출/주문 상태 변경은 이 수집에서 호출하지 않습니다.",
    ],
    checkedAt,
    historyPolicy: getProviderHistoryPolicy("smartstore"),
  };
}

export async function syncCommerceOrderAggregate(input: {
  env?: EnvMap;
  checkedAt?: string;
  fetchImpl?: FetchLike;
  now?: Date;
} = {}): Promise<ProviderSyncReport> {
  const env = input.env ?? process.env;
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const readinessReport = buildCommerceReadOnlySyncReport(env, checkedAt);
  if (readinessReport.status === "SKIPPED_MISSING_CONFIG") {
    return readinessReport;
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const now = input.now ?? new Date(checkedAt);
  const windowDays = parsePositiveInteger(env.NAVER_COMMERCE_AGGREGATE_WINDOW_DAYS, 30);
  const orderLimit = parsePositiveInteger(env.NAVER_COMMERCE_AGGREGATE_ORDER_LIMIT, 100);

  try {
    const token = await issueCommerceAccessToken({ env, fetchImpl });
    const productOrderIds = await fetchLastChangedProductOrderIds({
      accessToken: token.accessToken,
      baseUrl: resolveCommerceBaseUrl(env),
      fetchImpl,
      now,
      orderLimit,
      windowDays,
    });
    const productOrders =
      productOrderIds.length > 0
        ? await fetchProductOrderDetails({
            accessToken: token.accessToken,
            baseUrl: resolveCommerceBaseUrl(env),
            fetchImpl,
            productOrderIds,
          })
        : { productOrders: [], httpStatus: token.httpStatus };
    const productImageLookup = await fetchTopProductImageUrl({
      accessToken: token.accessToken,
      baseUrl: resolveCommerceBaseUrl(env),
      env,
      fetchImpl,
      productOrders: productOrders.productOrders,
    });
    const snapshot = buildCommerceAggregateSnapshot({
      brandKey: resolveFirstEnv(env, ["NAVER_COMMERCE_TARGET_BRANDS"])?.split(",")[0]?.trim() || "STICKERSEE",
      checkedAt,
      dataSolutionAvailable: env.NAVER_COMMERCE_DATA_SOLUTION_AVAILABLE === "true",
      productOrderIds,
      productOrders: productOrders.productOrders,
      topProductImageUrl: productImageLookup.imageUrl,
      windowDays,
    });

    return {
      ...readinessReport,
      status: "SYNCED",
      networkAttempted: true,
      httpStatus: productOrders.httpStatus,
      commerceAggregateSnapshot: snapshot,
      generatedSignal: buildCommerceAggregateSignal(snapshot, checkedAt),
      evidenceNotes: [
        ...readinessReport.evidenceNotes,
        `최근 ${windowDays.toLocaleString("ko-KR")}일 변경 주문 ${snapshot.paidOrderCount.toLocaleString("ko-KR")}건을 집계 전용으로 정규화했습니다.`,
        ...(productImageLookup.evidenceNote ? [productImageLookup.evidenceNote] : []),
        "토큰, 서명, 주문번호 목록, 주문 원문 행은 저장하지 않았습니다.",
      ],
    };
  } catch (error) {
    return {
      ...readinessReport,
      status: "FAILED",
      networkAttempted: true,
      failureReason: sanitizeErrorMessage(errorMessage(error), env),
      evidenceNotes: [...readinessReport.evidenceNotes, "읽기 전용 커머스 요청 중 예외가 발생했지만 외부 쓰기는 시도하지 않았습니다."],
    };
  }
}

export function buildCommerceTokenRequest(input: {
  env: EnvMap;
  timestamp: string;
}): CommerceTokenRequest {
  const clientId = requiredCommerceEnv(input.env, ["NAVER_COMMERCE_CLIENT_ID", "NAVER_SMARTSTORE_CLIENT_ID"]);
  const clientSecret = normalizeCommerceClientSecret(
    requiredCommerceEnv(input.env, ["NAVER_COMMERCE_CLIENT_SECRET", "NAVER_SMARTSTORE_CLIENT_SECRET"]),
  );
  const tokenType = input.env.NAVER_COMMERCE_TOKEN_TYPE ?? "SELF";
  const body = new URLSearchParams({
    client_id: clientId,
    timestamp: input.timestamp,
    client_secret_sign: createCommerceClientSecretSign({
      clientId,
      clientSecret,
      timestamp: input.timestamp,
    }),
    grant_type: "client_credentials",
    type: tokenType,
  });
  if (tokenType === "SELLER" && input.env.NAVER_COMMERCE_ACCOUNT_ID) {
    body.set("account_id", input.env.NAVER_COMMERCE_ACCOUNT_ID);
  }

  return {
    method: "POST",
    url: `${resolveCommerceBaseUrl(input.env)}${NAVER_COMMERCE_TOKEN_PATH}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
    },
    body,
  };
}

export function createCommerceClientSecretSign(input: {
  clientId: string;
  clientSecret: string;
  timestamp: string;
}): string {
  const hashed = hashSync(`${input.clientId}_${input.timestamp}`, normalizeCommerceClientSecret(input.clientSecret));

  return Buffer.from(hashed, "utf8").toString("base64");
}

function normalizeCommerceClientSecret(clientSecret: string): string {
  return clientSecret.trim().replaceAll("\\$", "$");
}

function resolveCommerceBaseUrl(env: EnvMap): string {
  return stripTrailingSlash(env.NAVER_COMMERCE_API_BASE_URL ?? NAVER_COMMERCE_BASE_URL);
}

async function issueCommerceAccessToken(input: {
  env: EnvMap;
  fetchImpl: FetchLike;
}): Promise<CommerceAccessToken> {
  const request = buildCommerceTokenRequest({
    env: input.env,
    timestamp: `${Date.now()}`,
  });
  const response = await input.fetchImpl(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  const responseJson = await parseResponseJson(response);
  if (!response.ok) {
    throw new Error(`${stringOrFallback(responseJson.code, "COMMERCE_TOKEN_HTTP_ERROR")}: ${stringOrFallback(responseJson.message, response.statusText)}`);
  }

  const accessToken = stringOrNull(responseJson.access_token ?? responseJson.accessToken);
  if (!accessToken) {
    throw new Error("COMMERCE_TOKEN_RESPONSE_MISSING_ACCESS_TOKEN");
  }

  return {
    accessToken,
    tokenType: stringOrFallback(responseJson.token_type ?? responseJson.tokenType, "Bearer"),
    expiresInSeconds: numberOrUndefined(responseJson.expires_in ?? responseJson.expiresIn),
    httpStatus: response.status,
  };
}

async function fetchLastChangedProductOrderIds(input: {
  accessToken: string;
  baseUrl: string;
  fetchImpl: FetchLike;
  now: Date;
  orderLimit: number;
  windowDays: number;
}): Promise<string[]> {
  const productOrderIds: string[] = [];

  for (const window of buildDailyWindows({ now: input.now, windowDays: input.windowDays })) {
    const params = new URLSearchParams({
      lastChangedFrom: window.from.toISOString(),
      lastChangedTo: window.to.toISOString(),
      limitCount: `${Math.min(input.orderLimit, 300)}`,
    });
    const response = await input.fetchImpl(`${input.baseUrl}${NAVER_COMMERCE_LAST_CHANGED_PATH}?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
    });
    const responseJson = await parseResponseJson(response);
    if (!response.ok) {
      throw new Error(`${stringOrFallback(responseJson.code, "COMMERCE_LAST_CHANGED_HTTP_ERROR")}: ${stringOrFallback(responseJson.message, response.statusText)}`);
    }

    for (const productOrderId of extractLastChangedStatuses(responseJson).map(extractProductOrderId)) {
      if (productOrderId) {
        productOrderIds.push(productOrderId);
      }
    }
    if (new Set(productOrderIds).size >= input.orderLimit) {
      break;
    }
  }

  return [...new Set(productOrderIds)].slice(0, input.orderLimit);
}

async function fetchProductOrderDetails(input: {
  accessToken: string;
  baseUrl: string;
  fetchImpl: FetchLike;
  productOrderIds: readonly string[];
}): Promise<{ productOrders: JsonRecord[]; httpStatus: number }> {
  const response = await input.fetchImpl(`${input.baseUrl}${NAVER_COMMERCE_PRODUCT_ORDER_QUERY_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({ productOrderIds: input.productOrderIds }),
  });
  const responseJson = await parseResponseJson(response);
  if (!response.ok) {
    throw new Error(`${stringOrFallback(responseJson.code, "COMMERCE_PRODUCT_ORDER_HTTP_ERROR")}: ${stringOrFallback(responseJson.message, response.statusText)}`);
  }

  return {
    productOrders: extractProductOrderDetails(responseJson),
    httpStatus: response.status,
  };
}

function buildCommerceAggregateSnapshot(input: {
  brandKey: string;
  checkedAt: string;
  dataSolutionAvailable: boolean;
  productOrderIds: readonly string[];
  productOrders: readonly JsonRecord[];
  topProductImageUrl?: string;
  windowDays: number;
}): CommerceAggregateSnapshot {
  return {
    id: `commerce-aggregate-${slugify(input.brandKey)}-${input.checkedAt.slice(0, 10)}`,
    provider: "naver_commerce",
    brandKey: input.brandKey,
    windowDays: input.windowDays,
    paidOrderCount: input.productOrderIds.length,
    grossSales: sumProductOrderAmounts(input.productOrders),
    topProductName: getTopProductName(input.productOrders) ?? undefined,
    topProductImageUrl: input.topProductImageUrl ?? getTopProductImageUrl(input.productOrders) ?? undefined,
    dataSolutionAvailable: input.dataSolutionAvailable,
    collectedAt: input.checkedAt,
    dataScope: "aggregate_only",
  };
}

async function fetchTopProductImageUrl(input: {
  accessToken: string;
  baseUrl: string;
  env: EnvMap;
  fetchImpl: FetchLike;
  productOrders: readonly JsonRecord[];
}): Promise<{ imageUrl?: string; evidenceNote?: string }> {
  if (input.productOrders.length === 0) {
    return {};
  }

  const inlineImageUrl = getTopProductImageUrl(input.productOrders);
  if (inlineImageUrl) {
    return {
      imageUrl: inlineImageUrl,
      evidenceNote: "주문 상세에 포함된 상위 상품 대표 이미지를 집계 스냅샷에 반영했습니다.",
    };
  }

  const topProductOrder = input.productOrders.find((item) => Boolean(getProductOrderName(item))) ?? input.productOrders[0];
  const originProductNo = getProductOrderOriginalProductId(topProductOrder);
  if (!originProductNo) {
    return {
      evidenceNote: "상위 상품 원상품 번호가 없어 대표 이미지는 화면 자동 썸네일로 대체됩니다.",
    };
  }

  try {
    const imageUrl = await fetchOriginProductImageUrl({
      accessToken: input.accessToken,
      baseUrl: input.baseUrl,
      fetchImpl: input.fetchImpl,
      originProductNo,
    });

    return imageUrl
      ? {
          imageUrl,
          evidenceNote: "원상품 조회로 상위 상품 대표 이미지를 확인해 집계 스냅샷에 반영했습니다.",
        }
      : {
          evidenceNote: "원상품 조회 응답에 대표 이미지가 없어 화면 자동 썸네일로 대체됩니다.",
        };
  } catch (error) {
    return {
      evidenceNote: `상위 상품 대표 이미지 조회는 실패했지만 주문 집계는 유지했습니다. (${sanitizeErrorMessage(errorMessage(error), input.env)})`,
    };
  }
}

async function fetchOriginProductImageUrl(input: {
  accessToken: string;
  baseUrl: string;
  fetchImpl: FetchLike;
  originProductNo: string;
}): Promise<string | null> {
  const response = await input.fetchImpl(
    `${input.baseUrl}${NAVER_COMMERCE_ORIGIN_PRODUCT_PATH}/${encodeURIComponent(input.originProductNo)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );
  const responseJson = await parseResponseJson(response);
  if (!response.ok) {
    throw new Error(`${stringOrFallback(responseJson.code, "COMMERCE_ORIGIN_PRODUCT_HTTP_ERROR")}: ${stringOrFallback(responseJson.message, response.statusText)}`);
  }

  return extractOriginProductImageUrl(responseJson);
}

function buildCommerceAggregateSignal(snapshot: CommerceAggregateSnapshot, checkedAt: string): ProviderSyncReport["generatedSignal"] {
  return {
    id: `signal-commerce-aggregate-${slugify(snapshot.brandKey)}-${checkedAt.slice(0, 10)}`,
    source: "smartstore",
    signalType: "weekly_trend",
    entityType: "product",
    entityId: snapshot.brandKey,
    title: `${commerceBrandLabel(snapshot.brandKey)} 스마트스토어 주문 집계 동기화`,
    currentValue: snapshot.grossSales,
    periodStart: addDays(checkedAt.slice(0, 10), -snapshot.windowDays).slice(0, 10),
    periodEnd: checkedAt.slice(0, 10),
    evidenceRowIds: [snapshot.id],
    createdAt: checkedAt,
  };
}

function commerceBrandLabel(brandKey: string): string {
  const labels: Record<string, string> = {
    STICKERSEE: "스티커씨",
    SMARTSTORE: "스티커씨",
  };

  return labels[brandKey.trim().toUpperCase()] ?? brandKey;
}

function extractLastChangedStatuses(responseJson: JsonRecord): unknown[] {
  const data = responseJson.data;
  const candidates = [
    responseJson.lastChangeStatuses,
    responseJson.lastChangedStatuses,
    Array.isArray(data) ? data : null,
    isRecord(data) ? data.lastChangeStatuses : null,
    isRecord(data) ? data.lastChangedStatuses : null,
  ];

  return candidates.find(Array.isArray) ?? [];
}

function extractProductOrderDetails(responseJson: JsonRecord): JsonRecord[] {
  const data = responseJson.data;
  const candidates = [
    responseJson.productOrders,
    responseJson.contents,
    Array.isArray(data) ? data : null,
    isRecord(data) ? data.productOrders : null,
    isRecord(data) ? data.contents : null,
  ];

  return (candidates.find(Array.isArray) ?? []).filter(isRecord);
}

function extractProductOrderId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return stringOrNull(value.productOrderId ?? (isRecord(value.productOrder) ? value.productOrder.productOrderId : null));
}

function sumProductOrderAmounts(productOrders: readonly JsonRecord[]): number {
  return productOrders.reduce((sum, item) => sum + getProductOrderAmount(item), 0);
}

function getProductOrderAmount(item: JsonRecord): number {
  const productOrder = isRecord(item.productOrder) ? item.productOrder : item;
  const payment = isRecord(item.payment) ? item.payment : null;
  const order = isRecord(item.order) ? item.order : null;
  const candidates = [
    productOrder.totalPaymentAmount,
    productOrder.totalProductAmount,
    productOrder.totalOrderAmount,
    productOrder.paymentAmount,
    productOrder.productOrderAmount,
    payment?.totalPaymentAmount,
    order?.generalPaymentAmount,
  ];

  for (const candidate of candidates) {
    const numberValue = numberOrUndefined(candidate);
    if (numberValue !== undefined) {
      return numberValue;
    }
  }

  return 0;
}

function getTopProductName(productOrders: readonly JsonRecord[]): string | null {
  const names = productOrders.map(getProductOrderName).filter((name): name is string => Boolean(name));

  return names[0] ?? null;
}

function getProductOrderName(item: JsonRecord): string | null {
  const productOrder = isRecord(item.productOrder) ? item.productOrder : item;

  return stringOrNull(productOrder.productName ?? item.productName);
}

function getProductOrderOriginalProductId(item: JsonRecord): string | null {
  const productOrder = isRecord(item.productOrder) ? item.productOrder : item;
  const product = isRecord(item.product) ? item.product : null;
  const candidates = [
    productOrder.originalProductId,
    productOrder.originProductNo,
    productOrder.originProductId,
    productOrder.originalProductNo,
    product?.originalProductId,
    product?.originProductNo,
    item.originalProductId,
    item.originProductNo,
  ];

  for (const candidate of candidates) {
    const value = stringOrNull(candidate);
    if (value) {
      return value;
    }
  }

  return null;
}

function getTopProductImageUrl(productOrders: readonly JsonRecord[]): string | null {
  const imageUrls = productOrders.map(getProductOrderImageUrl).filter((url): url is string => Boolean(url));

  return imageUrls[0] ?? null;
}

function getProductOrderImageUrl(item: JsonRecord): string | null {
  const productOrder = isRecord(item.productOrder) ? item.productOrder : item;
  const product = isRecord(item.product) ? item.product : null;
  const candidates = [
    productOrder.productImageUrl,
    productOrder.productImgUrl,
    productOrder.productThumbnailUrl,
    productOrder.imageUrl,
    productOrder.thumbnailUrl,
    product?.productImageUrl,
    product?.imageUrl,
    item.productImageUrl,
    item.productImgUrl,
    item.imageUrl,
    item.thumbnailUrl,
  ];

  for (const candidate of candidates) {
    const url = stringOrNull(candidate);
    if (url) {
      return url;
    }
  }

  return null;
}

function extractOriginProductImageUrl(responseJson: JsonRecord): string | null {
  const originProduct = isRecord(responseJson.originProduct) ? responseJson.originProduct : responseJson;
  const images = isRecord(originProduct.images) ? originProduct.images : isRecord(responseJson.images) ? responseJson.images : null;
  const representativeImage = isRecord(images?.representativeImage)
    ? images.representativeImage
    : isRecord(originProduct.representativeImage)
      ? originProduct.representativeImage
      : isRecord(responseJson.representativeImage)
        ? responseJson.representativeImage
        : null;
  const candidates = [
    representativeImage?.url,
    images?.representativeImageUrl,
    originProduct.representativeImageUrl,
    originProduct.productImageUrl,
    originProduct.imageUrl,
    responseJson.representativeImageUrl,
    responseJson.productImageUrl,
    responseJson.imageUrl,
  ];

  for (const candidate of candidates) {
    const url = stringOrNull(candidate);
    if (url) {
      return url;
    }
  }

  return null;
}

function requiredCommerceEnv(env: EnvMap, keys: readonly string[]): string {
  const value = resolveFirstEnv(env, keys);
  if (!value) {
    throw new Error(`${keys[0]} is required for Naver Commerce read-only request`);
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

function buildDailyWindows(input: { now: Date; windowDays: number }): Array<{ from: Date; to: Date }> {
  const windows: Array<{ from: Date; to: Date }> = [];
  const start = new Date(input.now.getTime() - input.windowDays * 24 * 60 * 60 * 1000);

  for (let from = start; from.getTime() < input.now.getTime(); from = new Date(from.getTime() + 24 * 60 * 60 * 1000)) {
    const to = new Date(Math.min(from.getTime() + 24 * 60 * 60 * 1000, input.now.getTime()));
    windows.push({ from, to });
  }

  return windows;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function sanitizeErrorMessage(message: string, env: EnvMap): string {
  let sanitized = message;
  for (const secret of [
    env.NAVER_COMMERCE_CLIENT_SECRET,
    env.NAVER_SMARTSTORE_CLIENT_SECRET,
    env.NAVER_COMMERCE_CLIENT_ID,
    env.NAVER_SMARTSTORE_CLIENT_ID,
  ]) {
    if (secret && secret.length >= 4) {
      sanitized = sanitized.split(secret).join("[redacted]");
    }
  }

  return sanitized
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(access[_-]?token|client[_-]?secret|client[_-]?secret[_-]?sign|password|token)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 180);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
