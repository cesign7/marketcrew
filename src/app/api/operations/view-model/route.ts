import { NextResponse } from "next/server";
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { createLocalWorkflowRepository } from "@/lib/persistence/workflow-store";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const viewModel = buildAgendaRoomViewModel({
    repository: createLocalWorkflowRepository(),
  });

  return NextResponse.json({
    generatedAt: viewModel.generatedAt,
    viewModel,
  });
}
