import { NextResponse } from "next/server";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import { buildWorkflowStateSummary, createLocalWorkflowRepository, getWorkflowStoreLabel } from "@/lib/persistence/workflow-store";

export async function GET(request: Request) {
  const proxied = await proxyRequestToBackend(request, "/api/operations/workflow-state", { failClosed: true });
  if (proxied) {
    return proxied;
  }

  const storePath = getWorkflowStoreLabel();
  const repository = createLocalWorkflowRepository();

  return NextResponse.json({
    state: buildWorkflowStateSummary(repository, storePath),
  });
}
