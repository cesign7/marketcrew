import type { AgendaRoomViewModel } from "@/features/agenda-room/types";
import { normalizeWorkflowRepositoryState, type WorkflowRepositoryState } from "@/lib/application/workflow-state";

const DEFAULT_BACKEND_API_TIMEOUT_MS = 5_000;
const DEFAULT_BACKEND_API_CACHE_TTL_SECONDS = 60;
const BACKEND_READ_CACHE_TAG = "marketcrew-backend-read";
const FRONTEND_BACKEND_READ_PATHS = [
  "/operations",
  "/approvals",
  "/follow-ups",
  "/characters",
  "/data",
  "/growth",
  "/settings",
];

type BackendWorkflowStateResponse = {
  state?: Partial<WorkflowRepositoryState>;
};

type BackendAgendaRoomViewModelResponse = {
  viewModel?: AgendaRoomViewModel;
};

export async function readBackendAgendaRoomViewModel(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AgendaRoomViewModel | undefined> {
  const payload = await fetchBackendJson<BackendAgendaRoomViewModelResponse>("/api/operations/view-model", env);
  return payload?.viewModel;
}

export async function readBackendWorkflowRepositoryState(
  env: NodeJS.ProcessEnv = process.env,
): Promise<WorkflowRepositoryState | undefined> {
  const payload = await fetchBackendJson<BackendWorkflowStateResponse>("/api/operations/workflow-state", env, {
    cacheMode: "no-store",
  });
  if (!payload || typeof payload !== "object" || !payload.state) {
    return undefined;
  }

  return normalizeWorkflowRepositoryState(payload.state);
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

export async function clearBackendReadThroughCache(): Promise<void> {
  try {
    const { revalidatePath, revalidateTag } = await import("next/cache");
    revalidateTag(BACKEND_READ_CACHE_TAG, { expire: 0 });
    for (const path of FRONTEND_BACKEND_READ_PATHS) {
      revalidatePath(path);
    }
  } catch {
    // Next.js 요청 컨텍스트가 없는 테스트/로컬 호출에서는 메모리 캐시만 지우면 충분하다.
  }
}

type FetchBackendJsonOptions = {
  cacheMode?: "read-through-cache" | "no-store";
};

async function fetchBackendJson<TPayload>(
  path: string,
  env: NodeJS.ProcessEnv,
  options: FetchBackendJsonOptions = {},
): Promise<TPayload | undefined> {
  const baseUrl = getBackendApiUrl(env);
  if (!baseUrl) {
    return undefined;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getBackendApiTimeoutMs(env));

  try {
    const response = await fetch(new URL(path, baseUrl), {
      cache: options.cacheMode === "no-store" ? "no-store" : "force-cache",
      headers: buildBackendApiHeaders(env),
      ...(options.cacheMode === "no-store"
        ? {}
        : {
            next: {
              revalidate: getBackendApiCacheTtlSeconds(env),
              tags: [BACKEND_READ_CACHE_TAG],
            },
          }),
      signal: abortController.signal,
    } as RequestInit & { next: { revalidate: number; tags: string[] } });
    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as TPayload;
  } catch {
    return undefined;
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

function getBackendApiCacheTtlSeconds(env: NodeJS.ProcessEnv): number {
  const parsed = Number.parseInt(env.MARKETCREW_BACKEND_API_CACHE_TTL_SECONDS ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : DEFAULT_BACKEND_API_CACHE_TTL_SECONDS;
}
