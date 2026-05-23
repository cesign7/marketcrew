import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyWorkflowRepositoryState } from "../../src/lib/persistence/workflow-state";

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: execFileSyncMock,
}));

import {
  clearPostgresWorkflowStateCache,
  createPostgresMarketingWorkflowRepository,
  resetPostgresWorkflowCollections,
} from "../../src/lib/persistence/postgres-repository";

const databaseUrl = "postgresql://marketcrew:secret@localhost:5432/marketcrew";

beforeEach(() => {
  vi.unstubAllEnvs();
  execFileSyncMock.mockReset();
  clearPostgresWorkflowStateCache();
});

describe("PostgresMarketingWorkflowRepository cache", () => {
  it("짧은 화면 이동에서는 DB bridge read-state를 공유 캐시로 재사용한다", () => {
    const state = createEmptyWorkflowRepositoryState();
    state.signals = [
      {
        id: "signal-cache-test",
        source: "search_ad",
        signalType: "seasonal_keyword_demand",
        entityType: "keyword",
        entityId: "부처님오신날 선물카드",
        title: "부처님오신날 선물카드 수요 확인",
        currentValue: 120,
        periodStart: "2026-05-01",
        periodEnd: "2026-05-22",
        evidenceRowIds: [],
        createdAt: "2026-05-22T00:00:00.000Z",
      },
    ];
    execFileSyncMock.mockReturnValue(`${JSON.stringify(state)}\n`);

    const firstRepository = createPostgresMarketingWorkflowRepository(databaseUrl);
    const secondRepository = createPostgresMarketingWorkflowRepository(databaseUrl);

    expect(firstRepository.listSignals()).toHaveLength(1);
    expect(secondRepository.listApprovalRequests()).toEqual([]);
    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
  });

  it("캐시 TTL을 0으로 두면 매 repository가 read-state를 다시 읽는다", () => {
    vi.stubEnv("MARKETCREW_POSTGRES_STATE_CACHE_TTL_MS", "0");
    execFileSyncMock.mockReturnValue(`${JSON.stringify(createEmptyWorkflowRepositoryState())}\n`);

    createPostgresMarketingWorkflowRepository(databaseUrl).listSignals();
    createPostgresMarketingWorkflowRepository(databaseUrl).listSignals();

    expect(execFileSyncMock).toHaveBeenCalledTimes(2);
  });

  it("지정한 collection만 reset-collections bridge로 초기화한다", () => {
    execFileSyncMock.mockReturnValue(
      `${JSON.stringify({
        status: "RESET",
        collections: ["signals", "agentRuns"],
        deletedCounts: { signals: 2, agentRuns: 3 },
        totalDeleted: 5,
      })}\n`,
    );

    const result = resetPostgresWorkflowCollections({
      databaseUrl,
      collections: ["signals", "agentRuns"],
      dryRun: false,
    });

    expect(result.totalDeleted).toBe(5);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(["reset-collections"]),
      expect.objectContaining({
        input: JSON.stringify({
          collections: ["signals", "agentRuns"],
          dryRun: false,
        }),
      }),
    );
  });
});
