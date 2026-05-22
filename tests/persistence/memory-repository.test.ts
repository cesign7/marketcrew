import { describe, expect, it } from "vitest";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";
import { createEmptyWorkflowRepositoryState } from "../../src/lib/persistence/workflow-state";

describe("createMemoryMarketingWorkflowRepository", () => {
  it("초기 workflow state를 화면 렌더용 repository로 복사한다", () => {
    const state = createEmptyWorkflowRepositoryState();
    state.signals = [
      {
        id: "signal-read-model-test",
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

    const repository = createMemoryMarketingWorkflowRepository(state);
    state.signals = [];

    expect(repository.listSignals()).toHaveLength(1);
    expect(repository.listSignals()[0]?.id).toBe("signal-read-model-test");
  });
});
