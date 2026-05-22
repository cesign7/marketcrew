import { NextResponse } from "next/server";
import { buildOutcomeHistory } from "@/features/approvals/buildApprovalDetailViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { createLocalWorkflowRepository, seedSampleWorkflowIfEmpty } from "@/lib/persistence/workflow-store";

type OutcomeRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: OutcomeRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
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

  return NextResponse.json({
    approvalId: id,
    outcomeReports: buildOutcomeHistory(repository.listOutcomeReports(), id),
  });
}
