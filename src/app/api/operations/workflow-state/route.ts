import { NextResponse } from "next/server";
import { buildWorkflowStateSummary, createLocalWorkflowRepository, getWorkflowStoreLabel } from "@/lib/persistence/workflow-store";

export function GET() {
  const storePath = getWorkflowStoreLabel();
  const repository = createLocalWorkflowRepository();

  return NextResponse.json({
    state: buildWorkflowStateSummary(repository, storePath),
  });
}
