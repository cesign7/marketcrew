import { describe, expect, it } from "vitest";
import { buildFollowUpQueueViewModel } from "../../src/features/follow-ups/buildFollowUpQueueViewModel";
import { runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { processOwnerDecision } from "../../src/lib/application/approval-workflow";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("buildFollowUpQueueViewModel", () => {
  it("대표 결정 이후 열린 후속 업무를 캐릭터별 큐와 owner learning 신호로 묶는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const cycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const readyApproval = cycle.approvalRequests.find((approval) => approval.status === "PENDING")!;
    const blockedApproval = cycle.approvalRequests.find((approval) => approval.status === "NEEDS_EVIDENCE")!;

    processOwnerDecision({
      approvalRequest: readyApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "즉시 반영은 하되 외부 반영은 확인",
      now: "2026-05-22T04:00:00.000Z",
      externalWriteEnabled: false,
      repository,
    });
    processOwnerDecision({
      approvalRequest: blockedApproval,
      decision: "APPROVE_AND_APPLY",
      memo: "근거를 더 보고 싶음",
      now: "2026-05-22T04:05:00.000Z",
      externalWriteEnabled: false,
      repository,
    });

    const viewModel = buildFollowUpQueueViewModel({
      repository,
      now: "2026-05-22T04:10:00.000Z",
    });

    expect(viewModel.summary.openTasks).toBe(2);
    expect(viewModel.summary.sourceApprovals).toBe(2);
    expect(viewModel.summary.learningSignals).toBe(6);
    expect(viewModel.characterQueues.find((queue) => queue.character === "moa")?.openCount).toBe(1);
    expect(viewModel.characterQueues.find((queue) => queue.character === "day")?.openCount).toBe(1);

    const moaTask = viewModel.characterQueues.find((queue) => queue.character === "moa")?.tasks[0];
    expect(moaTask?.blockerLabels).toContain("외부 반영 잠금 닫힘");
    expect(moaTask?.learningNote).toContain("외부 반영 잠금");
    expect(moaTask?.latestDecisionMemo).toBe("즉시 반영은 하되 외부 반영은 확인");

    const dayTask = viewModel.characterQueues.find((queue) => queue.character === "day")?.tasks[0];
    expect(dayTask?.nextActionLabel).toBe("근거 보강 후 재상신");
    expect(dayTask?.sourceApprovalStatusLabel).toBe("근거 보강");

    expect(viewModel.ownerLearningSignals.map((signal) => signal.id)).toEqual([
      "owner-decision-memory",
      "draft-first-pattern",
      "write-gate-pattern",
      "top-blocker",
      "open-follow-up-load",
      "outcome-review-load",
    ]);
    expect(viewModel.ownerLearningSignals.find((signal) => signal.id === "write-gate-pattern")?.tone).toBe("blocked");
  });

  it("완료된 후속 업무는 열린 업무에서 제외하고 학습 근거로 남긴다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const cycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const readyApproval = cycle.approvalRequests.find((approval) => approval.status === "PENDING")!;

    const result = processOwnerDecision({
      approvalRequest: readyApproval,
      decision: "APPROVE_DRAFT_ONLY",
      memo: "초안만 승인",
      now: "2026-05-22T04:00:00.000Z",
      externalWriteEnabled: false,
      repository,
    });
    repository.saveFollowUpInternalTasks([{ ...result.followUpTasks[0]!, status: "DONE" }]);

    const viewModel = buildFollowUpQueueViewModel({
      repository,
      now: "2026-05-22T04:10:00.000Z",
    });

    expect(viewModel.summary.openTasks).toBe(0);
    expect(viewModel.summary.doneTasks).toBe(1);
    expect(viewModel.characterQueues.find((queue) => queue.character === "moa")?.tasks[0]?.learningNote).toContain("완료된");
    expect(viewModel.ownerLearningSignals.find((signal) => signal.id === "draft-first-pattern")?.value).toBe("1건");
  });

  it("기존 운영 DB에 남은 opi 담당 후속 업무는 모아 큐로 안전하게 읽는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const cycle = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });
    const readyApproval = cycle.approvalRequests.find((approval) => approval.status === "PENDING")!;

    const result = processOwnerDecision({
      approvalRequest: readyApproval,
      decision: "APPROVE_DRAFT_ONLY",
      memo: "초안만 승인",
      now: "2026-05-22T04:00:00.000Z",
      externalWriteEnabled: false,
      repository,
    });
    repository.saveFollowUpInternalTasks([
      {
        ...result.followUpTasks[0]!,
        assignedCharacter: "opi" as never,
      },
    ]);

    const viewModel = buildFollowUpQueueViewModel({
      repository,
      now: "2026-05-22T04:10:00.000Z",
    });

    const moaTask = viewModel.characterQueues.find((queue) => queue.character === "moa")?.tasks[0];
    expect(moaTask?.assignedCharacter).toBe("moa");
    expect(moaTask?.assignedCharacterName).toBe("모아");
    expect(moaTask?.nextActionLabel).toBe("대표 보고용 재상신 정리");
  });
});
