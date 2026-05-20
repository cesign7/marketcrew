import type { Prisma } from "@/app/generated/prisma/client";
import {
  buildAgentRunInputHash,
  normalizeAgentRunJson,
  summarizeTokenUsage,
} from "@/lib/domain/agent-run-audit";
import { getAgentProfile } from "@/lib/domain/agent-profiles";
import { prisma } from "@/lib/db/prisma";
import { getKeywordDiagnosticsOverview } from "@/lib/db/keyword-diagnostics";
import {
  getAiAgentConfig,
  requestOpenAiAgentReport,
} from "@/lib/integrations/openai/agent-report";

const shadowAgentKey = "GENERAL_MANAGER";
const shadowPromptVersion = "llm-shadow-general-manager-v1";

export async function runLlmAgentShadowReport(now = new Date()) {
  const config = getAiAgentConfig();
  const profile = getAgentProfile(shadowAgentKey);

  if (!config.enabled) {
    const agentRun = await prisma.agentRun.create({
      data: {
        agentKey: shadowAgentKey,
        runType: "LLM_SHADOW",
        trigger: "manual",
        provider: config.provider,
        model: config.model,
        promptVersion: shadowPromptVersion,
        status: "SUCCEEDED",
        inputHash: buildAgentRunInputHash({
          mode: config.mode,
          provider: config.provider,
          model: config.model,
          skippedReason: config.reason,
        }),
        inputJson: toInputJson({
          mode: config.mode,
          provider: config.provider,
          model: config.model,
          skippedReason: config.reason,
        }),
        validationJson: toInputJson({
          skipped: true,
          reason: config.reason,
        }),
        finishedAt: now,
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: shadowAgentKey,
        reportType: "LLM_SHADOW_SKIPPED",
        summary: `LLM 연결 대기: ${config.reason} .env에 OPENAI_API_KEY와 AI_AGENT_MODE=llm-shadow를 설정하면 실제 모델 점검을 실행할 수 있습니다.`,
        detailJson: toInputJson({
          characterName: profile.characterName,
          roleName: profile.roleName,
          status: "NEEDS_ATTENTION",
          mood: "focused",
          provider: config.provider,
          model: config.model,
          mode: config.mode,
          skippedReason: config.reason,
          agentRunId: agentRun.id,
        }),
      },
    });

    return {
      status: "SKIPPED" as const,
      reason: config.reason,
    };
  }

  const workBrief = await buildLlmAgentWorkBrief(now);
  const inputJson = {
    mode: config.mode,
    provider: config.provider,
    model: config.model,
    promptVersion: shadowPromptVersion,
    characterName: profile.characterName,
    roleName: profile.roleName,
    workBrief,
  };
  const agentRun = await prisma.agentRun.create({
    data: {
      agentKey: shadowAgentKey,
      runType: "LLM_SHADOW",
      trigger: "manual",
      provider: config.provider,
      model: config.model,
      promptVersion: shadowPromptVersion,
      inputHash: buildAgentRunInputHash(inputJson),
      inputJson: toInputJson(inputJson),
    },
  });

  try {
    const response = await requestOpenAiAgentReport({
      config,
      model: config.model,
      characterName: profile.characterName,
      roleName: profile.roleName,
      workBrief,
    });

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "SUCCEEDED",
        outputJson: toInputJson(response.raw),
        parsedJson: toInputJson(response.report),
        validationJson: toInputJson({
          accepted: true,
          mode: config.mode,
          reportOnly: true,
        }),
        tokenUsageJson: toInputJson(summarizeTokenUsage(response.raw)),
        finishedAt: new Date(),
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: shadowAgentKey,
        reportType: "LLM_SHADOW",
        summary: response.report.summary,
        detailJson: toInputJson({
          characterName: profile.characterName,
          roleName: profile.roleName,
          status: response.report.status,
          mood: response.report.mood,
          provider: config.provider,
          model: config.model,
          mode: config.mode,
          confidence: response.report.confidence,
          proposedNextSteps: response.report.proposedNextSteps,
          response: summarizeOpenAiResponse(response.raw),
          agentRunId: agentRun.id,
        }),
      },
    });

    return {
      status: "SUCCEEDED" as const,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error.";

    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        validationJson: toInputJson({
          accepted: false,
          errorMessage: message,
        }),
        finishedAt: new Date(),
      },
    });

    await prisma.agentReport.create({
      data: {
        agentKey: shadowAgentKey,
        reportType: "LLM_SHADOW_FAILED",
        summary: `LLM 점검 실패: ${message}`,
        detailJson: toInputJson({
          characterName: profile.characterName,
          roleName: profile.roleName,
          status: "NEEDS_ATTENTION",
          mood: "worried",
          provider: config.provider,
          model: config.model,
          mode: config.mode,
          errorMessage: message,
          agentRunId: agentRun.id,
        }),
      },
    });

    return {
      status: "FAILED" as const,
      errorMessage: message,
    };
  }
}

async function buildLlmAgentWorkBrief(now: Date) {
  const [diagnostics, proposals, activeRules] = await Promise.all([
    getKeywordDiagnosticsOverview(now),
    prisma.actionProposal.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.keywordRule.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ brandKey: "asc" }, { keyword: "asc" }],
      take: 8,
    }),
  ]);
  const proposalLines = proposals.map(
    (proposal) =>
      `- [${proposal.status}/${proposal.riskLevel}] ${proposal.title}: ${proposal.reason}`,
  );
  const ruleLines = activeRules.map(
    (rule) =>
      `- [${rule.brandKey}] ${rule.keyword} ${rule.ruleType}/${rule.targetPositionType}`,
  );

  return [
    `Now: ${now.toISOString()}`,
    `Diagnostics: ${diagnostics.quality.title} - ${diagnostics.quality.detail}`,
    `Keyword snapshots: ${diagnostics.keywordSnapshotCount.toLocaleString()}`,
    `Performance rows: ${diagnostics.performanceRowCount.toLocaleString()}`,
    "Recent approval proposals:",
    proposalLines.length > 0 ? proposalLines.join("\n") : "- none",
    "Active internal keyword rules:",
    ruleLines.length > 0 ? ruleLines.join("\n") : "- none",
    "Task: summarize the next safest operating move for the owner. Keep all changes approval-first. Do not execute or imply external Naver Search Ad writes.",
  ].join("\n");
}

function summarizeOpenAiResponse(value: unknown) {
  const json = objectFromJson(value);

  return {
    id: stringFromJson(json.id),
    model: stringFromJson(json.model),
    usage: objectFromJson(json.usage),
  };
}

function objectFromJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function stringFromJson(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(normalizeAgentRunJson(value ?? {})),
  ) as Prisma.InputJsonValue;
}
