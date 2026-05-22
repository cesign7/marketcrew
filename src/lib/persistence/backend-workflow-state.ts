import { normalizeWorkflowRepositoryState, type WorkflowRepositoryState } from "./workflow-state";

const DEFAULT_BACKEND_API_TIMEOUT_MS = 1_500;

type BackendWorkflowStateResponse = {
  state?: Partial<WorkflowRepositoryState>;
};

export async function readBackendWorkflowRepositoryState(
  env: NodeJS.ProcessEnv = process.env,
): Promise<WorkflowRepositoryState | undefined> {
  const baseUrl = getBackendApiUrl(env);
  if (!baseUrl) {
    return undefined;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getBackendApiTimeoutMs(env));

  try {
    const response = await fetch(new URL("/api/workflow-state", baseUrl), {
      cache: "no-store",
      headers: buildBackendApiHeaders(env),
      signal: abortController.signal,
    });
    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as BackendWorkflowStateResponse;
    if (!payload || typeof payload !== "object" || !payload.state) {
      return undefined;
    }

    return normalizeWorkflowRepositoryState(payload.state);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function clearBackendWorkflowStateCache(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const baseUrl = getBackendApiUrl(env);
  if (!baseUrl) {
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getBackendApiTimeoutMs(env));

  try {
    await fetch(new URL("/api/cache/clear", baseUrl), {
      cache: "no-store",
      headers: buildBackendApiHeaders(env),
      method: "POST",
      signal: abortController.signal,
    });
  } catch {
    // 로컬 캐시 초기화가 더 중요하므로 원격 캐시 초기화 실패는 다음 TTL 갱신에 맡긴다.
  } finally {
    clearTimeout(timeout);
  }
}

function getBackendApiUrl(env: NodeJS.ProcessEnv): string | undefined {
  const rawUrl = env.MARKETCREW_BACKEND_API_URL ?? env.MARKETCREW_API_BASE_URL;
  if (!rawUrl) {
    return undefined;
  }

  return rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`;
}

function buildBackendApiHeaders(env: NodeJS.ProcessEnv): HeadersInit {
  const token = env.MARKETCREW_BACKEND_API_TOKEN ?? env.MARKETCREW_API_TOKEN;
  return token
    ? {
        authorization: `Bearer ${token}`,
      }
    : {};
}

function getBackendApiTimeoutMs(env: NodeJS.ProcessEnv): number {
  const parsed = Number.parseInt(env.MARKETCREW_BACKEND_API_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(250, parsed) : DEFAULT_BACKEND_API_TIMEOUT_MS;
}
