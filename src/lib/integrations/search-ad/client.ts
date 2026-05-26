import { createSearchAdSignature, normalizeSignatureUri } from "./signer";

const SEARCH_AD_BASE_URL = "https://api.searchad.naver.com";
const DEFAULT_SEARCH_AD_REQUEST_TIMEOUT_MS = 45_000;

export type SearchAdCredentials = {
  accessLicense: string;
  secretKey: string;
  customerId: string;
};

export class SearchAdApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
    readonly responseText: string,
  ) {
    super(message);
    this.name = "SearchAdApiError";
  }
}

export function getSearchAdCredentials(env: NodeJS.ProcessEnv = process.env): SearchAdCredentials | undefined {
  const accessLicense = env.NAVER_SEARCH_AD_ACCESS_LICENSE;
  const secretKey = env.NAVER_SEARCH_AD_SECRET_KEY;
  const customerId = env.NAVER_SEARCH_AD_CUSTOMER_ID;
  if (!accessLicense || !secretKey || !customerId) {
    return undefined;
  }

  return { accessLicense, secretKey, customerId };
}

export function hasSearchAdCredentials(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(getSearchAdCredentials(env));
}

export async function searchAdFetch<T>(path: string, init: RequestInit = {}, credentials = getSearchAdCredentials()): Promise<T> {
  if (!credentials) {
    throw new Error("SEARCH_AD_CREDENTIALS_MISSING");
  }

  const method = (init.method ?? "GET").toUpperCase();
  const timestamp = Date.now().toString();
  const signatureUri = normalizeSignatureUri(path);
  const timeout = createSearchAdTimeout(init.signal);
  try {
    const response = await fetch(new URL(path, SEARCH_AD_BASE_URL), {
      ...init,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "content-type": init.body ? "application/json; charset=utf-8" : "application/json",
        ...(init.headers ?? {}),
        "X-API-KEY": credentials.accessLicense,
        "X-Customer": credentials.customerId,
        "X-Signature": createSearchAdSignature({
          method,
          secretKey: credentials.secretKey,
          timestamp,
          uri: signatureUri,
        }),
        "X-Timestamp": timestamp,
      },
      method,
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new SearchAdApiError("네이버 검색광고 API 요청에 실패했습니다.", response.status, path, await response.text());
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  } finally {
    timeout.cleanup();
  }
}

export async function searchAdDownload(path: string, credentials = getSearchAdCredentials()) {
  if (!credentials) {
    throw new Error("SEARCH_AD_CREDENTIALS_MISSING");
  }

  const method = "GET";
  const timestamp = Date.now().toString();
  const signatureUri = normalizeSignatureUri(path);
  const timeout = createSearchAdTimeout();
  try {
    const response = await fetch(new URL(path, SEARCH_AD_BASE_URL), {
      cache: "no-store",
      headers: {
        "X-API-KEY": credentials.accessLicense,
        "X-Customer": credentials.customerId,
        "X-Signature": createSearchAdSignature({
          method,
          secretKey: credentials.secretKey,
          timestamp,
          uri: signatureUri,
        }),
        "X-Timestamp": timestamp,
      },
      method,
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new SearchAdApiError("네이버 검색광고 보고서 다운로드에 실패했습니다.", response.status, path, await response.text());
    }

    return {
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      text: await response.text(),
    };
  } finally {
    timeout.cleanup();
  }
}

function createSearchAdTimeout(upstreamSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const timeoutMs = resolveSearchAdTimeoutMs(process.env);
  const timeout = setTimeout(() => {
    controller.abort(new Error(`네이버 검색광고 API 응답 시간이 ${Math.round(timeoutMs / 1000)}초를 넘었습니다.`));
  }, timeoutMs);
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      abortFromUpstream();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }

  return {
    cleanup: () => {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", abortFromUpstream);
    },
    signal: controller.signal,
  };
}

export function resolveSearchAdTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const raw = Number.parseInt(env.MARKETCREW_SEARCH_AD_TIMEOUT_MS ?? env.NAVER_SEARCH_AD_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(raw)) {
    return DEFAULT_SEARCH_AD_REQUEST_TIMEOUT_MS;
  }
  return Math.min(5 * 60_000, Math.max(5_000, raw));
}
