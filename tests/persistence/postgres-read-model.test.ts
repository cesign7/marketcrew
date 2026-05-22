import { beforeEach, describe, expect, it, vi } from "vitest";

const { poolConstructorMock, poolQueryMock } = vi.hoisted(() => ({
  poolConstructorMock: vi.fn(),
  poolQueryMock: vi.fn(),
}));

vi.mock("pg", () => ({
  default: {
    Pool: poolConstructorMock,
  },
}));

import {
  clearPostgresReadModelStateCache,
  readPostgresWorkflowRepositoryState,
} from "../../src/lib/persistence/postgres-read-model";

beforeEach(() => {
  poolConstructorMock.mockReset();
  poolQueryMock.mockReset();
  poolConstructorMock.mockImplementation(function PoolMock() {
    return {
      query: poolQueryMock,
    };
  });
  clearPostgresReadModelStateCache();
});

describe("readPostgresWorkflowRepositoryState", () => {
  it("화면 렌더용 state를 직접 읽고 TTL 안에서는 재사용한다", async () => {
    poolQueryMock.mockResolvedValue({
      rows: [
        {
          collection: "signals",
          payload_json: {
            id: "signal-direct-read",
            source: "search_ad",
            signalType: "seasonal_keyword_demand",
            entityType: "keyword",
            entityId: "추석 선물카드",
            title: "추석 선물카드 수요 확인",
            currentValue: 160,
            periodStart: "2026-08-01",
            periodEnd: "2026-09-01",
            evidenceRowIds: [],
            createdAt: "2026-05-22T00:00:00.000Z",
          },
        },
      ],
    });

    const databaseUrl = "postgresql://marketcrew:test@localhost:5432/read_model_1";
    const env = { ...process.env, MARKETCREW_POSTGRES_READ_MODEL_CACHE_TTL_MS: "60000" };
    const firstState = await readPostgresWorkflowRepositoryState(databaseUrl, env);
    const secondState = await readPostgresWorkflowRepositoryState(databaseUrl, env);

    expect(firstState.signals[0]?.id).toBe("signal-direct-read");
    expect(secondState.signals[0]?.id).toBe("signal-direct-read");
    expect(poolConstructorMock).toHaveBeenCalledTimes(1);
    expect(poolQueryMock).toHaveBeenCalledTimes(1);
  });

  it("TTL을 0으로 두면 매번 DB를 다시 읽는다", async () => {
    poolQueryMock.mockResolvedValue({ rows: [] });

    const databaseUrl = "postgresql://marketcrew:test@localhost:5432/read_model_2";
    const env = { ...process.env, MARKETCREW_POSTGRES_READ_MODEL_CACHE_TTL_MS: "0" };
    await readPostgresWorkflowRepositoryState(databaseUrl, env);
    await readPostgresWorkflowRepositoryState(databaseUrl, env);

    expect(poolQueryMock).toHaveBeenCalledTimes(2);
  });
});
