import { NextResponse } from "next/server";
import { readWorkflowRepositoryState } from "@/lib/application/workflow-state";
import { buildWorkflowStateSummary, getWorkflowStoreLabel } from "@/lib/persistence/workflow-store";
import { createBackendWorkflowRepository } from "./repository";

export function handleWorkflowState() {
  const storePath = getWorkflowStoreLabel();
  const repository = createBackendWorkflowRepository();
  const workflowState = readWorkflowRepositoryState(repository);
  const summary = buildWorkflowStateSummary(repository, storePath);

  return NextResponse.json({
    state: {
      ...workflowState,
      ...summary,
    },
    summary,
  });
}
