import { describe, expect, it } from "vitest";
import { buildAgendaRoomViewModel } from "../../src/features/agenda-room/buildAgendaRoomViewModel";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("llm dry-run queue", () => {
  it("비용 가드가 닫혀 있으면 실제 호출 없이 모의 실행 큐를 차단 상태로 보여준다", () => {
    const viewModel = buildAgendaRoomViewModel({ env: {} });

    expect(viewModel.llmDryRunQueue.title).toBe("AI 실행 큐");
    expect(viewModel.llmDryRunQueue.guardrailLabel).toContain("실제 호출 전");
    expect(viewModel.llmDryRunQueue.items).toHaveLength(1);

    const item = viewModel.llmDryRunQueue.items[0]!;
    expect(item.runnerName).toBe("모아");
    expect(item.statusLabel).toBe("비용 가드 차단");
    expect(item.callGateOpen).toBe(false);
    expect(item.rawRowsIncluded).toBe(false);
    expect(item.executionModeLabel).toBe("모의 실행만 기록");
    expect(item.inputPolicyLabel).toContain("원천 행 제외");
    expect(item.tokenLabel).toContain("토큰");
    expect(item.evidenceLabel).toContain("근거");
    expect(item.blockedGateLabels).toEqual(expect.arrayContaining([expect.stringContaining("단가 정책")]));
  });

  it("비용 조건을 통과해도 큐 단계에서는 실제 호출 대신 실행 후보만 분리한다", () => {
    const viewModel = buildAgendaRoomViewModel({
      env: {
        AI_LLM_PROVIDER: "gemini",
        GEMINI_API_KEY: "test-key",
        AI_LLM_MODEL_PLANNER: "gemini-3.1-flash-lite",
        AI_LLM_COST_PER_1K_INPUT_KRW: "1",
        AI_LLM_COST_PER_1K_OUTPUT_KRW: "2",
        AI_LLM_RUN_BUDGET_KRW: "10000",
        AI_LLM_DAILY_BUDGET_KRW: "30000",
        AI_LLM_MONTHLY_BUDGET_KRW: "500000",
        AI_LLM_MAX_INPUT_TOKENS: "50000",
        AI_LLM_MAX_OUTPUT_TOKENS: "50000",
        AI_LLM_MAX_TOTAL_TOKENS: "100000",
        MARKETCREW_EXTERNAL_WRITE_ENABLED: "false",
      },
    });

    const item = viewModel.llmDryRunQueue.items[0]!;
    expect(item.statusLabel).toBe("모의 실행 가능");
    expect(item.callGateOpen).toBe(true);
    expect(item.executionModeLabel).toBe("모의 실행만 기록");
    expect(item.actualCallLabel).toBe("실제 호출 대기");
    expect(item.blockedGateLabels).toEqual([]);
  });

  it("모의 실행 큐는 원천 행 없이 AgentRun 감사 기록으로 남긴다", () => {
    const repository = createMemoryMarketingWorkflowRepository();

    buildAgendaRoomViewModel({ repository, env: {} });

    const dryRun = repository.listAgentRuns().find((run) => run.runType === "llm_dry_run");
    expect(dryRun).toBeDefined();
    expect(dryRun?.mode).toBe("deterministic_fallback");
    expect(dryRun?.provider).toBe("local");
    expect(dryRun?.rawRowsIncluded).toBe(false);
    expect(dryRun?.inputSummary).toContain("근거");
    expect(dryRun?.outputSummary).toContain("비용 가드");

    expect(
      repository
        .listAgentRunWorkflowLinks()
        .some((link) => link.agentRunId === dryRun?.id && link.objectType === "approval_request"),
    ).toBe(true);
  });
});
