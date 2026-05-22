import type {
  ApprovalRequest,
  CharacterKey,
  LlmPlannerAuditRun,
  LlmPlannerInput,
  LlmPlannerResult,
  RiskLevel,
} from "@/lib/domain";

export interface LlmPlanner {
  plan(input: LlmPlannerInput): Promise<LlmPlannerResult>;
}

export class DeterministicLlmPlanner implements LlmPlanner {
  async plan(input: LlmPlannerInput): Promise<LlmPlannerResult> {
    return buildDeterministicPlannerResult(input);
  }
}

// Design Ref: §1.2 — AI 모델은 원천 데이터 처리기가 아니라 요약 후보를 정리하는 계획기다.
export function buildPlannerInputFromApprovals(
  approvalRequests: ApprovalRequest[],
  generatedAt: string,
  maxCandidates = 5,
): LlmPlannerInput {
  return {
    id: `planner-input-${generatedAt}`,
    generatedAt,
    source: "signal_summary",
    rawRowsIncluded: false,
    candidateSummaries: approvalRequests.slice(0, maxCandidates).map((request) => ({
      approvalRequestId: request.id,
      title: request.title,
      owner: ownerFromExecutionPlan(request.executionPlan.workType),
      status: request.status,
      confidence: request.dataConfidence,
      riskLevel: request.riskLevel,
      summary: request.evidenceSummary,
      evidenceIds: request.evidenceIds,
    })),
    constraints: {
      privacy: "aggregate_only",
      maxCandidates,
      externalWriteAllowed: false,
    },
  };
}

export function buildDeterministicPlannerResult(input: LlmPlannerInput): LlmPlannerResult {
  const orderedCandidates = [...input.candidateSummaries].sort((left, right) => candidateScore(right) - candidateScore(left));
  const recommended = orderedCandidates.slice(0, input.constraints.maxCandidates);
  const readyCount = recommended.filter((candidate) => candidate.confidence === "READY_TO_APPROVE").length;
  const blockedCount = recommended.length - readyCount;
  const evidenceIds = Array.from(new Set(recommended.flatMap((candidate) => candidate.evidenceIds)));

  return {
    id: `planner-result-${input.generatedAt}`,
    mode: "deterministic_fallback",
    title: "오피 규칙 기반 계획 요약",
    summary: [
      `후보 ${input.candidateSummaries.length}건 중 승인 가능 ${readyCount}건, 보강 필요 ${blockedCount}건을 우선순위로 정리했습니다.`,
      "AI 모델 설정이 준비되기 전까지도 같은 입력 계약으로 대표 결재 문서를 만들 수 있습니다.",
      "원천 행은 제외하고 집계 요약과 근거 ID만 사용합니다.",
    ].join(" "),
    recommendedApprovalIds: recommended.map((candidate) => candidate.approvalRequestId),
    evidenceIds,
    rawRowsIncluded: false,
    tokenEstimate: estimateJsonTokens(input),
    createdAt: input.generatedAt,
  };
}

export function buildPlannerAuditRun(
  input: LlmPlannerInput,
  result: LlmPlannerResult,
  options: {
    env?: Record<string, string | undefined>;
    providerEvidenceNoteCount?: number;
  } = {},
): LlmPlannerAuditRun {
  const provider = configuredProvider(result, options.env ?? {});
  const model = configuredModel(result, options.env ?? {});
  const inputEstimate = result.tokenEstimate;
  const outputEstimate = estimateJsonTokens(result);

  return {
    id: `planner-audit-${result.id}`,
    runnerKey: "opi_planner",
    plannerInputId: input.id,
    plannerResultId: result.id,
    mode: result.mode,
    provider,
    model,
    tokenUsage: {
      inputEstimate,
      outputEstimate,
      totalEstimate: inputEstimate + outputEstimate,
      rawRowsIncluded: input.rawRowsIncluded || result.rawRowsIncluded,
    },
    billing: {
      state: result.mode === "deterministic_fallback" ? "NOT_BILLED_FALLBACK" : "ESTIMATED_ONLY",
      estimatedCostKrw: result.mode === "deterministic_fallback" ? 0 : estimateCostKrw(inputEstimate + outputEstimate),
      basis:
        result.mode === "deterministic_fallback"
          ? "규칙 기반 대체라 실제 AI 모델 과금 없음"
          : "모델별 실제 청구 전 UI 표시용 추정치",
    },
    sourceCounts: {
      candidateSummaries: input.candidateSummaries.length,
      selectedApprovals: result.recommendedApprovalIds.length,
      evidenceIds: result.evidenceIds.length,
      providerEvidenceNotes: options.providerEvidenceNoteCount ?? 0,
    },
    evidenceIds: result.evidenceIds,
    createdAt: result.createdAt,
  };
}

function candidateScore(candidate: LlmPlannerInput["candidateSummaries"][number]): number {
  const confidenceScore = candidate.confidence === "READY_TO_APPROVE" ? 100 : 20;
  const statusScore = candidate.status === "PENDING" ? 30 : 0;
  const riskPenalty: Record<RiskLevel, number> = {
    LOW: 0,
    MEDIUM: 5,
    HIGH: 20,
    CRITICAL: 45,
  };

  return confidenceScore + statusScore - riskPenalty[candidate.riskLevel];
}

function estimateJsonTokens(value: unknown): number {
  const characterCount = JSON.stringify(value).length;
  return Math.ceil(characterCount / 4);
}

function configuredProvider(result: LlmPlannerResult, env: Record<string, string | undefined>): string {
  if (result.mode === "deterministic_fallback") {
    return "deterministic";
  }

  return env.AI_LLM_PROVIDER ?? "not_configured";
}

function configuredModel(result: LlmPlannerResult, env: Record<string, string | undefined>): string {
  if (result.mode === "deterministic_fallback") {
    return "deterministic-fallback";
  }

  return env.AI_LLM_MODEL_PLANNER ?? env.AI_LLM_MODEL_STRATEGIC ?? env.AI_LLM_MODEL_DEFAULT ?? env.AI_LLM_MODEL ?? "not_configured";
}

function estimateCostKrw(totalTokens: number): number {
  return Math.round((totalTokens / 1000) * 2);
}

function ownerFromExecutionPlan(workType: ApprovalRequest["executionPlan"]["workType"]): CharacterKey | "unknown" {
  if (workType === "SEARCH_AD_KEYWORD" || workType === "SEARCH_AD_BID_BUDGET") {
    return "gro";
  }

  if (workType === "PRODUCT_DRAFT") {
    return "pro";
  }

  if (workType === "CREATIVE_DRAFT") {
    return "copy";
  }

  if (workType === "CRM_DRAFT") {
    return "ripi";
  }

  return "unknown";
}
