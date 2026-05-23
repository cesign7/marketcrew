import { describe, expect, it } from "vitest";
import { buildDefaultAiOperationsSettings } from "../../src/features/people/ai-operations-settings";
import {
  buildWorkflowResetPreview,
  isValidWorkflowResetConfirmation,
  WORKFLOW_RESET_CONFIRMATION,
  WORKFLOW_RESETTABLE_COLLECTIONS,
} from "../../src/lib/application/workflow-reset-policy";
import { createEmptyWorkflowRepositoryState } from "../../src/lib/application/workflow-state";

describe("workflow reset policy", () => {
  it("운영 전 초기화 대상에서 인사과/AI 예산 설정은 보존한다", () => {
    const state = createEmptyWorkflowRepositoryState();
    state.providerSyncReports = [
      {
        id: "provider-sync-test",
        provider: "search_ad",
        label: "네이버 검색광고",
        status: "SYNCED",
        readOnly: true,
        networkAttempted: true,
        writeAttempted: false,
        endpoint: "/stats",
        sourceUrl: "https://api.searchad.naver.com",
        missingEnvKeys: [],
        evidenceNotes: ["테스트 수집"],
        checkedAt: "2026-05-23T00:00:00.000Z",
      },
    ];
    state.agentRuns = [
      {
        id: "agent-run-test",
        runnerKey: "moa",
        runType: "moa_planner",
        mode: "llm",
        provider: "gemini",
        model: "gemini-2.5-flash",
        status: "SUCCEEDED",
        inputSummary: "테스트 입력",
        outputSummary: "테스트 판단",
        rawRowsIncluded: false,
        tokenUsage: {
          inputTokens: 1,
          outputTokens: 1,
          totalTokens: 2,
          estimated: false,
          estimatedCostKrw: 1,
          basis: "테스트",
        },
        evidenceIds: [],
        startedAt: "2026-05-23T00:00:00.000Z",
        finishedAt: "2026-05-23T00:00:01.000Z",
      },
    ];
    state.aiOperationsSettings = [buildDefaultAiOperationsSettings({ now: "2026-05-23T00:00:00.000Z" })];

    const preview = buildWorkflowResetPreview(state);

    expect(WORKFLOW_RESETTABLE_COLLECTIONS).not.toContain("aiOperationsSettings");
    expect(preview.resettableTotal).toBe(2);
    expect(preview.preservedCollections).toEqual([{ collection: "aiOperationsSettings", count: 1 }]);
    expect(preview.preservedTotal).toBe(1);
  });

  it("정확한 한국어 확인 문구가 있어야 초기화를 허용한다", () => {
    expect(isValidWorkflowResetConfirmation(WORKFLOW_RESET_CONFIRMATION)).toBe(true);
    expect(isValidWorkflowResetConfirmation("초기화")).toBe(false);
    expect(isValidWorkflowResetConfirmation(undefined)).toBe(false);
  });
});
