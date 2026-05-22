import { NextResponse } from "next/server";
import {
  buildAiPeopleOfficeView,
  buildDefaultAiOperationsSettings,
  resolveAiOperationsSettings,
  sanitizeAiOperationsSettings,
} from "@/features/people/ai-operations-settings";
import { createBackendWorkflowRepository } from "./repository";

export function handleGetAiOperationsSettings() {
  const repository = createBackendWorkflowRepository();
  const settings = resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0],
  });
  const peopleOfficeView = buildAiPeopleOfficeView({
    settings,
    agentRuns: repository.listAgentRuns(),
  });

  return NextResponse.json({
    settings,
    peopleOfficeView,
  });
}

export async function handlePutAiOperationsSettings(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "설정 저장 요청을 읽을 수 없습니다.",
        },
      },
      { status: 400 },
    );
  }

  const repository = createBackendWorkflowRepository();
  const fallback = resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0] ?? buildDefaultAiOperationsSettings(),
  });
  const settings = sanitizeAiOperationsSettings(
    isRecord(payload) && "settings" in payload ? payload.settings : payload,
    fallback,
  );

  repository.saveAiOperationsSettings([settings]);
  const peopleOfficeView = buildAiPeopleOfficeView({
    settings,
    agentRuns: repository.listAgentRuns(),
  });

  return NextResponse.json({
    settings,
    peopleOfficeView,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
