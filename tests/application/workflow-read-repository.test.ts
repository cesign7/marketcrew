import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalAgendaRoomViewModelCache,
  loadAgendaRoomViewModel,
  loadWorkflowReadRepository,
} from "../../src/features/agenda-room/loadAgendaRoomViewModel";

afterEach(() => {
  clearLocalAgendaRoomViewModelCache();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("loadWorkflowReadRepository", () => {
  it("Vercel 화면 런타임에서는 DB URL이 있어도 Railway 백엔드 상태 없이는 직접 읽지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadWorkflowReadRepository({
        env: testEnv({
          VERCEL: "1",
          MARKETCREW_REPOSITORY_MODE: "db",
          MARKETCREW_DATABASE_URL: "postgresql://marketcrew:secret@localhost:5432/marketcrew",
        }),
      }),
    ).rejects.toThrow("Vercel 화면 런타임에서는 Railway 백엔드 workflow state가 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Vercel 화면 런타임에서는 Railway 백엔드 workflow state를 읽기 저장소로 사용한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        state: {
          signals: [
            {
              id: "signal-from-backend-state",
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

    const repository = await loadWorkflowReadRepository({
      env: testEnv({
        VERCEL: "1",
        MARKETCREW_BACKEND_API_URL: "https://api.marketcrew.app",
        MARKETCREW_BACKEND_API_TOKEN: "secret-token",
        MARKETCREW_REPOSITORY_MODE: "db",
        MARKETCREW_DATABASE_URL: "postgresql://marketcrew:secret@localhost:5432/marketcrew",
      }),
    });

    expect(repository.listSignals()[0]?.id).toBe("signal-from-backend-state");
    expect(fetchMock).toHaveBeenCalledWith(new URL("https://api.marketcrew.app/api/operations/workflow-state"), {
      cache: "no-store",
      headers: {
        authorization: "Bearer secret-token",
      },
      signal: expect.any(AbortSignal),
    });
  });
});

describe("loadAgendaRoomViewModel", () => {
  it("Vercel 화면 런타임에서 view model API가 비어도 workflow state API로 복구한다", async () => {
    clearLocalAgendaRoomViewModelCache();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MARKETCREW_BACKEND_API_URL", "https://api.marketcrew.app");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "secret-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          state: {
            providerSyncReports: [
              {
                id: "provider-sync-search-ad-test",
                provider: "search_ad",
                label: "네이버 키워드광고 read-only sync",
                status: "SYNCED",
                readOnly: true,
                networkAttempted: true,
                writeAttempted: false,
                endpoint: "https://api.searchad.naver.com/keywordstool",
                sourceUrl: "http://naver.github.io/searchad-apidoc/",
                missingEnvKeys: [],
                evidenceNotes: ["workflow state fallback"],
                checkedAt: "2026-05-22T00:00:00.000Z",
              },
            ],
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const viewModel = await loadAgendaRoomViewModel();

    expect(viewModel.providerSyncEvidence[0]?.id).toBe("provider-sync-search-ad-test");
    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls).toContain("https://api.marketcrew.app/api/operations/view-model");
    expect(calledUrls).toContain("https://api.marketcrew.app/api/operations/workflow-state");
  });
});

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  } as NodeJS.ProcessEnv;
}
