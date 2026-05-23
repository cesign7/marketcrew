import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { processOwnerDecision } from "@/lib/application/approval-workflow";
import type { ExecutionScopeSelection, OwnerDecisionType } from "@/lib/domain";
import { createBackendWorkflowRepository } from "./repository";

type DecisionRequestBody = {
  decision?: unknown;
  memo?: unknown;
  executionScopeSelection?: unknown;
  secondConfirmation?: unknown;
};

const ownerDecisionTypes: OwnerDecisionType[] = [
  "APPROVE_AND_APPLY",
  "APPROVE_DRAFT_ONLY",
  "REQUEST_REVISION",
  "REQUEST_MORE_EVIDENCE",
  "HOLD",
  "REJECT",
];

export async function handleApprovalDecision(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseBody(request);
  if (!isOwnerDecisionType(body.decision)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "대표 결정 값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const repository = createBackendWorkflowRepository({ seedSample: true });
  const approvalRequest = repository.listApprovalRequests().find((approval) => approval.id === id);
  if (!approvalRequest) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "결재 요청을 찾을 수 없습니다.",
        },
      },
      { status: 404 },
    );
  }

  const result = processOwnerDecision({
    approvalRequest,
    decision: body.decision,
    memo: typeof body.memo === "string" ? body.memo : "",
    executionScopeSelection: parseExecutionScopeSelection(body.executionScopeSelection),
    secondConfirmation: body.secondConfirmation === true,
    externalWriteEnabled: process.env.EXTERNAL_WRITE_ENABLED === "true",
    providerSyncReports: repository.listProviderSyncReports(),
    repository,
    now: new Date().toISOString(),
  });
  await clearAgendaRoomViewModelCache();

  return NextResponse.json(
    {
      result,
    },
    { status: statusFromDecisionResult(result) },
  );
}

async function parseBody(request: Request): Promise<DecisionRequestBody> {
  try {
    return (await request.json()) as DecisionRequestBody;
  } catch {
    return {};
  }
}

function isOwnerDecisionType(value: unknown): value is OwnerDecisionType {
  return typeof value === "string" && ownerDecisionTypes.includes(value as OwnerDecisionType);
}

function parseExecutionScopeSelection(value: unknown): ExecutionScopeSelection | undefined {
  if (!isRecord(value) || typeof value.proposalTitle !== "string" || !Array.isArray(value.selections)) {
    return undefined;
  }

  const selections = value.selections.filter(isScopeSelectionRow).map((selection) => ({
    fieldId: selection.fieldId,
    label: selection.label,
    value: selection.value,
  }));

  if (selections.length === 0) {
    return undefined;
  }

  return {
    proposalTitle: value.proposalTitle,
    selections,
  };
}

function isScopeSelectionRow(value: unknown): value is ExecutionScopeSelection["selections"][number] {
  return (
    isRecord(value) &&
    typeof value.fieldId === "string" &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function statusFromDecisionResult(result: ReturnType<typeof processOwnerDecision>): number {
  if (result.preflightCheck?.status === "BLOCKED") {
    return 409;
  }

  if (result.executionResult?.state === "NEEDS_MANUAL_ACTION") {
    return 423;
  }

  return 200;
}
