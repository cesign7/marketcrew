import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentRun, AgentRunWorkflowLink } from "../../src/lib/domain";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";
import type { MarketingWorkflowRepository } from "../../src/lib/persistence/repositories";
import { buildWorkflowStateSummary } from "../../src/lib/persistence/workflow-store";

let temporaryDirectory: string | undefined;

afterEach(() => {
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("AgentRun repository contract", () => {
  it("memory repository는 run과 workflow link를 저장하고 결재 기준으로 조회한다", () => {
    assertAgentRunPersistence(createMemoryMarketingWorkflowRepository());
  });

  it("file repository는 run과 workflow link를 저장하고 reload 후에도 조회한다", () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-agent-run-"));
    const storePath = join(temporaryDirectory, "workflow-store.json");
    const repository = createFileMarketingWorkflowRepository(storePath);

    assertAgentRunPersistence(repository);

    const reloadedRepository = createFileMarketingWorkflowRepository(storePath);
    expect(reloadedRepository.listAgentRuns()).toHaveLength(1);
    expect(reloadedRepository.listAgentRunWorkflowLinks()).toHaveLength(1);
    expect(
      reloadedRepository.listAgentRunsForWorkflowObject({
        objectType: "approval_request",
        objectId: "approval-agenda-season-plan-buddha-gift-card",
      }),
    ).toHaveLength(1);
  });

  it("workflow summary는 AgentRun count와 최근 run id를 포함한다", () => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-agent-run-summary-"));
    const storePath = join(temporaryDirectory, "workflow-store.json");
    const repository = createFileMarketingWorkflowRepository(storePath);
    assertAgentRunPersistence(repository);

    const summary = buildWorkflowStateSummary(repository, storePath);

    expect(summary.counts.agentRuns).toBe(1);
    expect(summary.counts.agentRunWorkflowLinks).toBe(1);
    expect(summary.recent.agentRunIds).toEqual(["agent-run-opi-planner-1"]);
  });
});

function assertAgentRunPersistence(repository: MarketingWorkflowRepository): void {
  const run = buildAgentRun();
  const link = buildAgentRunLink(run.id);

  repository.saveAgentRuns([run]);
  repository.saveAgentRunWorkflowLinks([link]);

  expect(repository.listAgentRuns()).toEqual([run]);
  expect(repository.listAgentRunWorkflowLinks()).toEqual([link]);
  expect(
    repository.listAgentRunsForWorkflowObject({
      objectType: "approval_request",
      objectId: "approval-agenda-season-plan-buddha-gift-card",
    }),
  ).toEqual([run]);
  expect(
    repository.listAgentRunsForWorkflowObject({
      objectType: "outcome_report",
      objectId: "outcome-missing",
    }),
  ).toEqual([]);
}

function buildAgentRun(): AgentRun {
  return {
    id: "agent-run-opi-planner-1",
    runnerKey: "opi_planner",
    runType: "opi_planner",
    mode: "deterministic_fallback",
    provider: "deterministic",
    model: "deterministic-fallback",
    status: "SUCCEEDED",
    inputSummary: "결재 후보 2건과 provider evidence 4건을 요약 입력으로 사용했습니다.",
    outputSummary: "부처님오신날 선물카드 시즌 키워드 안건을 우선 추천했습니다.",
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 240,
      outputTokens: 120,
      totalTokens: 360,
      estimated: true,
      estimatedCostKrw: 0,
      basis: "deterministic fallback",
    },
    evidenceIds: ["kw-demand-buddha-gift-card", "signal-buddha-gift-card-yoy"],
    startedAt: "2026-05-22T04:20:00.000Z",
    finishedAt: "2026-05-22T04:20:01.000Z",
  };
}

function buildAgentRunLink(agentRunId: string): AgentRunWorkflowLink {
  return {
    id: "agent-run-link-opi-approval-1",
    agentRunId,
    objectType: "approval_request",
    objectId: "approval-agenda-season-plan-buddha-gift-card",
    relation: "generated",
    createdAt: "2026-05-22T04:20:01.000Z",
  };
}
