import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { processOwnerDecision } from "@/lib/application/approval-workflow";
import type { OwnerDecisionType } from "@/lib/domain";
import { createLocalWorkflowRepository, seedSampleWorkflowIfEmpty } from "@/lib/persistence/workflow-store";

type DecisionRouteContext = {
  params: Promise<{ id: string }>;
};

type DecisionRequestBody = {
  decision?: unknown;
  memo?: unknown;
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

export async function POST(request: Request, context: DecisionRouteContext) {
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

  const repository = createLocalWorkflowRepository();
  seedSampleWorkflowIfEmpty(repository);

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
    secondConfirmation: body.secondConfirmation === true,
    externalWriteEnabled: process.env.EXTERNAL_WRITE_ENABLED === "true",
    providerSyncReports: repository.listProviderSyncReports(),
    repository,
    now: new Date().toISOString(),
  });
  clearAgendaRoomViewModelCache();

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

function statusFromDecisionResult(result: ReturnType<typeof processOwnerDecision>): number {
  if (result.preflightCheck?.status === "BLOCKED") {
    return 409;
  }

  if (result.executionResult?.state === "NEEDS_MANUAL_ACTION") {
    return 423;
  }

  return 200;
}
