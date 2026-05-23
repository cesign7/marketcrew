import { NextResponse } from "next/server";
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";
import { createBackendWorkflowRepository } from "./repository";

export function handleLlmDryRunQueue() {
  const viewModel = buildAgendaRoomViewModel({
    repository: createBackendWorkflowRepository(),
  });

  return NextResponse.json({
    generatedAt: viewModel.generatedAt,
    llmDryRunQueue: viewModel.llmDryRunQueue,
    plannerAudit: viewModel.plannerPreview.audit,
    agentRunSummary: viewModel.agentRunSummary,
  });
}
