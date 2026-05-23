import type { ApprovalRequest, OwnerDecision } from "../domain";
import { buildDefaultExecutionScopeSelection, buildExecutionScopeProposalForApproval } from "./execution-scope-proposal";
import type { MarketingWorkflowRepository } from "./workflow-repository";

export type ExecutionScopeBackfillApprovalItem = { id: string; title: string; scopeTitle: string };

export type ExecutionScopeBackfillDecisionItem = { id: string; approvalRequestId: string; scopeTitle: string };

export type ExecutionScopeBackfillResult = {
  applied: boolean;
  checkedAt: string;
  approvalRequests: {
    scanned: number;
    updated: number;
    alreadyReady: number;
    skipped: number;
    updatedItems: ExecutionScopeBackfillApprovalItem[];
    readyItems: ExecutionScopeBackfillApprovalItem[];
    skippedItems: Array<{ id: string; title: string; reason: string }>;
  };
  ownerDecisions: {
    scanned: number;
    updated: number;
    alreadyReady: number;
    skipped: number;
    updatedItems: ExecutionScopeBackfillDecisionItem[];
    readyItems: ExecutionScopeBackfillDecisionItem[];
    skippedItems: Array<{ id: string; approvalRequestId: string; reason: string }>;
  };
};

type BackfillInput = {
  dryRun?: boolean;
  now?: string;
};

export function backfillExecutionScopes(
  repository: MarketingWorkflowRepository,
  input: BackfillInput = {},
): ExecutionScopeBackfillResult {
  const now = input.now ?? new Date().toISOString();
  const dryRun = input.dryRun === true;
  const approvalRequests = repository.listApprovalRequests();
  const approvalBackfill = buildApprovalRequestBackfill(approvalRequests);
  const approvalById = new Map(
    [...approvalRequests, ...approvalBackfill.updatedRequests].map((approval) => [approval.id, approval]),
  );
  const ownerDecisions = repository.listOwnerDecisions();
  const ownerDecisionBackfill = buildOwnerDecisionBackfill(ownerDecisions, approvalById);

  if (!dryRun) {
    if (approvalBackfill.updatedRequests.length > 0) {
      repository.saveApprovalRequests(approvalBackfill.updatedRequests);
    }
    if (ownerDecisionBackfill.updatedDecisions.length > 0) {
      repository.saveOwnerDecisions(ownerDecisionBackfill.updatedDecisions);
    }
  }

  return {
    applied: !dryRun,
    checkedAt: now,
    approvalRequests: {
      scanned: approvalRequests.length,
      updated: approvalBackfill.updatedRequests.length,
      alreadyReady: approvalBackfill.alreadyReady,
      skipped: approvalBackfill.skippedItems.length,
      updatedItems: approvalBackfill.updatedRequests.map((approval) => ({
        id: approval.id,
        title: approval.title,
        scopeTitle: approval.executionPlan.executionScopeProposal?.title ?? "실행 범위 없음",
      })),
      readyItems: approvalBackfill.readyItems,
      skippedItems: approvalBackfill.skippedItems,
    },
    ownerDecisions: {
      scanned: ownerDecisions.length,
      updated: ownerDecisionBackfill.updatedDecisions.length,
      alreadyReady: ownerDecisionBackfill.alreadyReady,
      skipped: ownerDecisionBackfill.skippedItems.length,
      updatedItems: ownerDecisionBackfill.updatedDecisions.map((decision) => ({
        id: decision.id,
        approvalRequestId: decision.approvalRequestId,
        scopeTitle: decision.executionScopeSelection?.proposalTitle ?? "실행 범위 없음",
      })),
      readyItems: ownerDecisionBackfill.readyItems,
      skippedItems: ownerDecisionBackfill.skippedItems,
    },
  };
}

function buildApprovalRequestBackfill(approvalRequests: ApprovalRequest[]): {
  alreadyReady: number;
  readyItems: ExecutionScopeBackfillApprovalItem[];
  skippedItems: Array<{ id: string; title: string; reason: string }>;
  updatedRequests: ApprovalRequest[];
} {
  let alreadyReady = 0;
  const readyItems: ExecutionScopeBackfillApprovalItem[] = [];
  const skippedItems: Array<{ id: string; title: string; reason: string }> = [];
  const updatedRequests: ApprovalRequest[] = [];

  for (const approval of approvalRequests) {
    if (approval.executionPlan.executionScopeProposal) {
      alreadyReady += 1;
      readyItems.push({
        id: approval.id,
        title: approval.title,
        scopeTitle: approval.executionPlan.executionScopeProposal.title,
      });
      continue;
    }

    const proposal = buildExecutionScopeProposalForApproval(approval);
    if (!proposal) {
      skippedItems.push({
        id: approval.id,
        title: approval.title,
        reason: "실행 범위 제안을 만들 수 없어 제외",
      });
      continue;
    }

    updatedRequests.push({
      ...approval,
      executionPlan: {
        ...approval.executionPlan,
        executionScopeProposal: proposal,
      },
    });
  }

  return {
    alreadyReady,
    readyItems,
    skippedItems,
    updatedRequests,
  };
}

function buildOwnerDecisionBackfill(
  ownerDecisions: OwnerDecision[],
  approvalById: Map<string, ApprovalRequest>,
): {
  alreadyReady: number;
  readyItems: ExecutionScopeBackfillDecisionItem[];
  skippedItems: Array<{ id: string; approvalRequestId: string; reason: string }>;
  updatedDecisions: OwnerDecision[];
} {
  let alreadyReady = 0;
  const readyItems: ExecutionScopeBackfillDecisionItem[] = [];
  const skippedItems: Array<{ id: string; approvalRequestId: string; reason: string }> = [];
  const updatedDecisions: OwnerDecision[] = [];

  for (const decision of ownerDecisions) {
    if (decision.executionScopeSelection) {
      alreadyReady += 1;
      readyItems.push({
        id: decision.id,
        approvalRequestId: decision.approvalRequestId,
        scopeTitle: decision.executionScopeSelection.proposalTitle,
      });
      continue;
    }

    const proposal = approvalById.get(decision.approvalRequestId)?.executionPlan.executionScopeProposal;
    if (!proposal) {
      skippedItems.push({
        id: decision.id,
        approvalRequestId: decision.approvalRequestId,
        reason: "연결된 결재안에 실행 범위 제안 없음",
      });
      continue;
    }

    const executionScopeSelection = buildDefaultExecutionScopeSelection(proposal);
    updatedDecisions.push({
      ...decision,
      executionScopeSelection,
      memo: appendBackfillMemo(decision.memo, executionScopeSelection.proposalTitle),
    });
  }

  return {
    alreadyReady,
    readyItems,
    skippedItems,
    updatedDecisions,
  };
}

function appendBackfillMemo(memo: string, proposalTitle: string): string {
  const trimmedMemo = memo.trim();
  const backfillNotice = `소급 적용: 기존 결정 당시 실행 범위 선택값이 없어 '${proposalTitle}' AI 추천 기본값으로 표시합니다.`;

  if (trimmedMemo.includes("소급 적용: 기존 결정 당시 실행 범위 선택값")) {
    return trimmedMemo;
  }

  return trimmedMemo ? `${trimmedMemo}\n\n${backfillNotice}` : backfillNotice;
}
