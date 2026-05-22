import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearBackendWorkflowStateCache,
  readBackendAgendaRoomViewModel,
  readBackendWorkflowRepositoryState,
} from "../../src/lib/persistence/backend-workflow-state";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readBackendWorkflowRepositoryState", () => {
  it("백엔드 API URL이 없으면 기존 DB 직접 읽기 경로로 넘긴다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const state = await readBackendWorkflowRepositoryState(testEnv());

    expect(state).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Railway API workflow state를 읽고 토큰을 서버 요청 헤더에 담는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: {
          repositoryMode: "db",
          counts: {
            signals: 1,
          },
          signals: [
            {
              id: "signal-from-railway-api",
              source: "search_ad",
              signalType: "seasonal_keyword_demand",
              entityType: "keyword",
              entityId: "설날 선물카드",
              title: "설날 선물카드 수요 확인",
              currentValue: 90,
              periodStart: "2026-01-01",
              periodEnd: "2026-02-01",
              evidenceRowIds: [],
              createdAt: "2026-05-22T00:00:00.000Z",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = await readBackendWorkflowRepositoryState(testEnv({
      MARKETCREW_BACKEND_API_URL: "https://api.marketcrew.app",
      MARKETCREW_BACKEND_API_TOKEN: "secret-token",
    }));

    expect(state?.signals[0]?.id).toBe("signal-from-railway-api");
    expect(state?.approvalRequests).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.marketcrew.app/api/operations/workflow-state"),
      expect.objectContaining({
        cache: "no-store",
        headers: {
          authorization: "Bearer secret-token",
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("백엔드 API가 실패하면 fallback을 위해 undefined를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });
    vi.stubGlobal("fetch", fetchMock);

    const state = await readBackendWorkflowRepositoryState(testEnv({
      MARKETCREW_BACKEND_API_URL: "https://api.marketcrew.app",
    }));

    expect(state).toBeUndefined();
  });
});

describe("readBackendAgendaRoomViewModel", () => {
  it("Railway API view model을 직접 읽어 화면 빌드 비용을 Vercel에서 줄인다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        viewModel: {
          generatedAt: "2026-05-22T00:00:00.000Z",
          kanbanBuckets: [],
          approvalPreviewCards: [],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const viewModel = await readBackendAgendaRoomViewModel(testEnv({
      MARKETCREW_BACKEND_API_URL: "https://api.marketcrew.app",
      MARKETCREW_BACKEND_API_TOKEN: "secret-token",
    }));

    expect(viewModel?.generatedAt).toBe("2026-05-22T00:00:00.000Z");
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.marketcrew.app/api/operations/view-model"),
      expect.objectContaining({
        cache: "force-cache",
        headers: {
          authorization: "Bearer secret-token",
        },
        next: {
          revalidate: 60,
          tags: ["marketcrew-backend-read"],
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe("clearBackendWorkflowStateCache", () => {
  it("Railway API 캐시 초기화를 POST로 요청한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await clearBackendWorkflowStateCache(testEnv({
      MARKETCREW_BACKEND_API_URL: "https://api.marketcrew.app/",
      MARKETCREW_BACKEND_API_TOKEN: "secret-token",
    }));

    expect(fetchMock).toHaveBeenCalledWith(new URL("https://api.marketcrew.app/api/cache/clear"), {
      cache: "no-store",
      headers: {
        authorization: "Bearer secret-token",
      },
      method: "POST",
      signal: expect.any(AbortSignal),
    });
  });
});

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  } as NodeJS.ProcessEnv;
}
