import { NextResponse } from "next/server";
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";
import { createBackendWorkflowRepository } from "./repository";

export function handleLlmCostGovernance() {
  const viewModel = buildAgendaRoomViewModel({
    repository: createBackendWorkflowRepository(),
  });

  return NextResponse.json({
    generatedAt: viewModel.generatedAt,
    llmCostGovernance: viewModel.llmCostGovernance,
    plannerAudit: viewModel.plannerPreview.audit,
    agentRunSummary: viewModel.agentRunSummary,
  });
}
