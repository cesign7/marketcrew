import { NextResponse } from "next/server";

const DEFAULT_BACKEND_PROXY_TIMEOUT_MS = 5_000;

type BackendProxyOptions = {
  failClosed?: boolean;
  timeoutMs?: number;
};

export async function proxyRequestToBackend(
  request: Request,
  pathOverride?: string,
  options: BackendProxyOptions = {},
): Promise<NextResponse | undefined> {
  if (isBackendRuntime()) {
    return undefined;
  }

  const baseUrl = getBackendApiUrl();
  if (!baseUrl) {
    if (options.failClosed && isHostedFrontendRuntime()) {
      return backendUnavailableResponse("Railway 백엔드 API 주소가 설정되지 않았습니다.");
    }

    return undefined;
  }

  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(pathOverride ?? `${sourceUrl.pathname}${sourceUrl.search}`, baseUrl);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getBackendProxyTimeoutMs(process.env, options.timeoutMs));

  try {
    const response = await fetch(targetUrl, {
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      headers: buildBackendProxyHeaders(request),
      method: request.method,
      redirect: "manual",
      signal: abortController.signal,
    });

    return new NextResponse(await response.arrayBuffer(), {
      headers: pickResponseHeaders(response.headers),
      status: response.status,
      statusText: response.statusText,
    });
  } catch {
    if (options.failClosed) {
      return backendUnavailableResponse("Railway 백엔드 API 응답을 받지 못했습니다.");
    }

    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export function isBackendRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MARKETCREW_BACKEND_MODE === "1" || env.RAILWAY_SERVICE_NAME === "marketcrew-api";
}

export function isHostedFrontendRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL === "1" && !isBackendRuntime(env);
}

function getBackendApiUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const rawUrl = env.MARKETCREW_BACKEND_API_URL ?? env.MARKETCREW_API_BASE_URL;
  if (!rawUrl) {
    return undefined;
  }

  return rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`;
}

function buildBackendProxyHeaders(request: Request): HeadersInit {
  const headers: Record<string, string> = {
    accept: request.headers.get("accept") ?? "application/json",
  };
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["content-type"] = contentType;
  }

  const token = process.env.MARKETCREW_BACKEND_API_TOKEN ?? process.env.MARKETCREW_API_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

function pickResponseHeaders(headers: Headers): HeadersInit {
  const picked = new Headers();
  for (const key of ["content-type", "cache-control"]) {
    const value = headers.get(key);
    if (value) {
      picked.set(key, value);
    }
  }

  return picked;
}

function getBackendProxyTimeoutMs(env: NodeJS.ProcessEnv = process.env, overrideMs?: number): number {
  if (typeof overrideMs === "number" && Number.isFinite(overrideMs)) {
    return Math.max(250, overrideMs);
  }

  const parsed = Number.parseInt(env.MARKETCREW_BACKEND_PROXY_TIMEOUT_MS ?? env.MARKETCREW_BACKEND_API_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(250, parsed) : DEFAULT_BACKEND_PROXY_TIMEOUT_MS;
}

function backendUnavailableResponse(message: string) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    { status: 503 },
  );
}
