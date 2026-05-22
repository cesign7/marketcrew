import { NextResponse } from "next/server";
import { buildWorkflowStateSummary, getWorkflowStoreLabel } from "@/lib/persistence/workflow-store";
import { createBackendWorkflowRepository } from "./repository";

export function handleWorkflowState() {
  const storePath = getWorkflowStoreLabel();
  const repository = createBackendWorkflowRepository();

  return NextResponse.json({
    state: buildWorkflowStateSummary(repository, storePath),
  });
}
