import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { backfillExecutionScopes } from "@/lib/application/execution-scope-backfill";
import { createBackendWorkflowRepository } from "./repository";

export async function handleExecutionScopeBackfill(request: Request, mode: "preview" | "apply") {
  const repository = createBackendWorkflowRepository({ seedSample: true });
  const result = backfillExecutionScopes(repository, {
    dryRun: mode === "preview",
  });

  if (mode === "apply") {
    await clearAgendaRoomViewModelCache();
  }

  return NextResponse.json({
    ok: true,
    mode,
    result,
  });
}
