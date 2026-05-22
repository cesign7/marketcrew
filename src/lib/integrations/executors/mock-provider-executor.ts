import type { ApprovalRequest, ExecutionResult } from "../../domain";

export type MockProviderExecutorOptions = {
  externalWriteEnabled?: boolean;
};

export class MockProviderExecutor {
  readonly externalWriteCalls: string[] = [];

  constructor(private readonly options: MockProviderExecutorOptions = {}) {}

  execute(approvalRequest: ApprovalRequest): ExecutionResult {
    const { executionPlan } = approvalRequest;

    if (executionPlan.requiresWriteGate && !this.options.externalWriteEnabled) {
      return {
        id: `exec-${approvalRequest.id}`,
        approvalRequestId: approvalRequest.id,
        state: "NEEDS_MANUAL_ACTION",
        appliedOperations: [],
        failedOperations: [
          {
            operation: executionPlan.executorKey,
            reason: "WRITE_GATE_CLOSED",
            retryable: true,
          },
        ],
        createdAt: approvalRequest.createdAt,
      };
    }

    this.externalWriteCalls.push(executionPlan.executorKey);

    return {
      id: `exec-${approvalRequest.id}`,
      approvalRequestId: approvalRequest.id,
      state: "APPLIED",
      appliedOperations: [executionPlan.executorKey],
      failedOperations: [],
      createdAt: approvalRequest.createdAt,
    };
  }
}
