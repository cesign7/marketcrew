import { NextResponse } from "next/server";
import { buildOutcomeHistory } from "@/features/approvals/buildApprovalDetailViewModel";
import { createBackendWorkflowRepository } from "./repository";

export async function handleApprovalOutcomes(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
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

  return NextResponse.json({
    approvalId: id,
    outcomeReports: buildOutcomeHistory(repository.listOutcomeReports(), id),
  });
}
