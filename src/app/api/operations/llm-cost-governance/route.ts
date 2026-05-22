import { NextResponse } from "next/server";
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";
import { createLocalWorkflowRepository } from "@/lib/persistence/workflow-store";

export function GET() {
  const viewModel = buildAgendaRoomViewModel({
    repository: createLocalWorkflowRepository(),
  });

  return NextResponse.json({
    generatedAt: viewModel.generatedAt,
    llmCostGovernance: viewModel.llmCostGovernance,
    plannerAudit: viewModel.plannerPreview.audit,
    agentRunSummary: viewModel.agentRunSummary,
  });
}
