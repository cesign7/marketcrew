import { loadWorkflowReadRepository } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { isHostedFrontendRuntime } from "@/lib/backend/proxy";
import { readBackendAiOperationsSettings } from "@/lib/backend/workflow-state-client";
import type { AiOperationsSettings } from "@/lib/domain";
import { buildAiPeopleOfficeView, type AiPeopleOfficeView, resolveAiOperationsSettings } from "./ai-operations-settings";

type LoadAiOperationsOptions = {
  env?: NodeJS.ProcessEnv;
};

// Settings/People pages need only AI settings and AgentRun usage, not the full workflow-state payload.
export async function loadAiOperationsSettings(
  options: LoadAiOperationsOptions = {},
): Promise<AiOperationsSettings> {
  const env = options.env ?? process.env;
  const backendPayload = await readBackendAiOperationsSettings(env);
  if (backendPayload?.settings) {
    return resolveAiOperationsSettings({
      stored: backendPayload.settings,
      env,
    });
  }

  if (isHostedFrontendRuntime(env)) {
    throw new Error("Vercel 화면 런타임에서는 Railway 백엔드 AI 설정 응답이 필요합니다.");
  }

  const repository = await loadWorkflowReadRepository({ env });
  return resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0],
    env,
  });
}

export async function loadAiPeopleOfficeView(
  options: LoadAiOperationsOptions = {},
): Promise<AiPeopleOfficeView> {
  const env = options.env ?? process.env;
  const backendPayload = await readBackendAiOperationsSettings(env);
  if (backendPayload?.peopleOfficeView) {
    return backendPayload.peopleOfficeView;
  }
  if (backendPayload?.settings) {
    return buildAiPeopleOfficeView({
      settings: resolveAiOperationsSettings({
        stored: backendPayload.settings,
        env,
      }),
      agentRuns: [],
    });
  }

  if (isHostedFrontendRuntime(env)) {
    throw new Error("Vercel 화면 런타임에서는 Railway 백엔드 AI 인사과 응답이 필요합니다.");
  }

  const repository = await loadWorkflowReadRepository({ env });
  const settings = resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0],
    env,
  });

  return buildAiPeopleOfficeView({
    settings,
    agentRuns: repository.listAgentRuns(),
  });
}
