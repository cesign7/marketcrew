import { describe, expect, it } from "vitest";
import { executeApprovalWithMockGateClosed, runAgendaCycle } from "../../src/lib/application/agenda-cycle";
import { MockProviderExecutor } from "../../src/lib/integrations/executors/mock-provider-executor";
import { SampleProviderAdapter } from "../../src/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("runAgendaCycle", () => {
  it("샘플 데이터로 signal부터 오피 결재 요청과 성과 체크포인트까지 생성한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const result = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository,
    });

    expect(result.signals.map((signal) => signal.signalType)).toContain("lunar_event_yoy");
    expect(result.seasonalKeywordAdPlans).toHaveLength(2);
    expect(result.promotedAgendaCandidates.map((candidate) => candidate.dataConfidence)).toEqual([
      "READY_TO_APPROVE",
      "BUDGET_GUARD_MISSING",
    ]);
    expect(result.characterReports.map((report) => report.character)).toEqual(["gro", "day"]);
    expect(result.opiSynthesisReport.summary).toContain("대표 결재 대기 1건");
    expect(result.approvalRequests.map((request) => request.status)).toEqual(["PENDING", "NEEDS_EVIDENCE"]);
    expect(result.performanceCheckpoints).toHaveLength(3);

    expect(repository.listSignals()).toHaveLength(result.signals.length);
    expect(repository.listApprovalRequests()).toHaveLength(result.approvalRequests.length);
    expect(repository.listPerformanceCheckpoints()).toHaveLength(result.performanceCheckpoints.length);
  });

  it("모의 실행기는 외부 반영 잠금이 닫혀 있으면 외부 쓰기를 호출하지 않고 차단 결과를 만든다", () => {
    const result = runAgendaCycle({
      sampleProvider: new SampleProviderAdapter(),
      repository: createMemoryMarketingWorkflowRepository(),
    });
    const approval = result.approvalRequests.find((request) => request.status === "PENDING");
    expect(approval).toBeDefined();

    const execution = executeApprovalWithMockGateClosed(approval!);

    expect(execution.state).toBe("NEEDS_MANUAL_ACTION");
    expect(execution.failedOperations).toEqual([
      {
        operation: "mock-search-ad-keyword-executor",
        reason: "WRITE_GATE_CLOSED",
        retryable: true,
      },
    ]);

    const explicitExecutor = new MockProviderExecutor({ externalWriteEnabled: false });
    explicitExecutor.execute(approval!);
    expect(explicitExecutor.externalWriteCalls).toEqual([]);
  });
});
