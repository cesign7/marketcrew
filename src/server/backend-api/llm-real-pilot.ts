import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { buildLlmCostGovernanceView } from "@/features/agenda-room/buildLlmCostGovernanceView";
import { resolveAiOperationsSettings } from "@/features/people/ai-operations-settings";
import { filterActiveApprovalRequests } from "@/lib/application/deprecated-approvals";
import { recordPlannerAgentRun } from "@/lib/application/agent-run-recorder";
import { buildProviderReadinessReports } from "@/lib/integrations/providers/readiness";
import { buildGeminiPlannerPrompt, runGeminiPlannerPilot } from "@/lib/llm/gemini-planner";
import { buildDeterministicPlannerResult, buildPlannerAuditRun, buildPlannerInputFromApprovals } from "@/lib/llm/planner";
import { createBackendWorkflowRepository } from "./repository";

export async function handleLlmRealPilot() {
  const generatedAt = new Date().toISOString();
  const repository = createBackendWorkflowRepository();
  const providerSyncReports = repository.listProviderSyncReports();
  const approvalRequests = filterActiveApprovalRequests(
    repository.listApprovalRequests().filter((approval) => approval.status === "PENDING"),
  );
  if (providerSyncReports.length === 0 || approvalRequests.length === 0) {
    return NextResponse.json(
      {
        status: "BLOCKED",
        message: "실제 수집 근거와 결재 후보를 먼저 만든 뒤 AI 파일럿을 실행할 수 있습니다.",
        nextAction: "먼저 /api/operations/provider-sync를 실행하세요.",
      },
      { status: 409 },
    );
  }

  const aiOperationsSettings = resolveAiOperationsSettings({
    stored: repository.listAiOperationsSettings()[0],
    env: process.env,
    now: generatedAt,
  });
  if (repository.listAiOperationsSettings().length === 0) {
    repository.saveAiOperationsSettings([aiOperationsSettings]);
  }

  const plannerInput = buildPlannerInputFromApprovals(approvalRequests, generatedAt);
  const plannerContext = {
    providerSyncReports,
    keywordDemandSnapshots: repository.listKeywordDemandSnapshots(),
    searchTrendSnapshots: repository.listSearchTrendSnapshots(),
  };
  const deterministicResult = buildDeterministicPlannerResult(plannerInput);
  const providerReadiness = buildProviderReadinessReports(process.env, generatedAt);
  const baselineAudit = buildPlannerAuditRun(plannerInput, deterministicResult, {
    env: process.env,
    providerEvidenceNoteCount:
      providerReadiness.flatMap((provider) => provider.evidenceNotes).length +
      providerSyncReports.flatMap((report) => report.evidenceNotes).length,
  });
  const pilotPromptTokenEstimate = estimatePilotPromptTokens(buildGeminiPlannerPrompt(plannerInput, plannerContext));
  const pilotOutputTokenEstimate = Math.min(aiOperationsSettings.budget.maxOutputTokens, 1200);
  const pilotGateAudit = {
    ...baselineAudit,
    mode: "llm_ready" as const,
    provider: process.env.AI_LLM_PROVIDER ?? "gemini",
    model: process.env.AI_LLM_MODEL_PLANNER ?? process.env.AI_LLM_MODEL_STRATEGIC ?? process.env.AI_LLM_MODEL_DEFAULT ?? baselineAudit.model,
    tokenUsage: {
      ...baselineAudit.tokenUsage,
      inputEstimate: pilotPromptTokenEstimate,
      outputEstimate: pilotOutputTokenEstimate,
      totalEstimate: pilotPromptTokenEstimate + pilotOutputTokenEstimate,
      rawRowsIncluded: false,
    },
  };
  const costGovernance = buildLlmCostGovernanceView({
    env: process.env,
    generatedAt,
    plannerAudit: pilotGateAudit,
    agentRuns: repository.listAgentRuns(),
    providerReadiness,
    aiOperationsSettings,
  });
  if (!costGovernance.liveCallAllowed) {
    return NextResponse.json(
      {
        status: "BLOCKED",
        message: "AI 비용 가드가 아직 실제 호출을 허용하지 않습니다.",
        costGovernance: summarizeCostGovernance(costGovernance),
      },
      { status: 409 },
    );
  }

  try {
    const pilot = await runGeminiPlannerPilot({
      plannerInput,
      context: plannerContext,
      env: process.env,
      generatedAt,
      aiOperationsSettings,
    });
    const agentRun = recordPlannerAgentRun(repository, plannerInput, pilot.result, pilot.audit);
    await clearAgendaRoomViewModelCache();

    return NextResponse.json({
      status: "SUCCEEDED",
      generatedAt,
      inputPolicy: {
        rawRowsIncluded: false,
        privacy: plannerInput.constraints.privacy,
        externalWriteAllowed: plannerInput.constraints.externalWriteAllowed,
        candidateCount: plannerInput.candidateSummaries.length,
      },
      costGovernance: summarizeCostGovernance(costGovernance),
      llmResult: pilot.result,
      audit: {
        id: pilot.audit.id,
        provider: pilot.audit.provider,
        model: pilot.audit.model,
        tokenUsage: pilot.audit.tokenUsage,
        billing: pilot.audit.billing,
        sourceCounts: pilot.audit.sourceCounts,
      },
      agentRun: {
        id: agentRun.id,
        status: agentRun.status,
        mode: agentRun.mode,
        provider: agentRun.provider,
        model: agentRun.model,
        outputSummary: agentRun.outputSummary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "FAILED",
        message: sanitizePilotError(error instanceof Error ? error.message : String(error)),
      },
      { status: 502 },
    );
  }
}

function summarizeCostGovernance(costGovernance: ReturnType<typeof buildLlmCostGovernanceView>) {
  return {
    statusLabel: costGovernance.statusLabel,
    liveCallAllowed: costGovernance.liveCallAllowed,
    providerLabel: costGovernance.providerLabel,
    modelLabel: costGovernance.modelLabel,
    estimatedRunCostLabel: costGovernance.estimatedRunCostLabel,
    runBudgetLabel: costGovernance.runBudgetLabel,
    dailyBudgetLabel: costGovernance.dailyBudgetLabel,
    gateChecks: costGovernance.gateChecks.map((check) => ({
      id: check.id,
      label: check.label,
      statusLabel: check.statusLabel,
      tone: check.tone,
      message: check.message,
    })),
  };
}

function sanitizePilotError(message: string): string {
  return message
    .replace(/[A-Za-z0-9+/=_-]{24,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function estimatePilotPromptTokens(prompt: string): number {
  return Math.ceil(prompt.length / 4);
}
