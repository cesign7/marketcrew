import { resolveAiOperationsSettings } from "@/features/people/ai-operations-settings";
import type {
  AiOperationsSettings,
  KeywordDemandSnapshot,
  LlmPlannerAuditRun,
  LlmPlannerInput,
  LlmPlannerResult,
  ProviderSyncReport,
  SearchTrendSnapshot,
} from "@/lib/domain";
import { containsDeprecatedCrossBrandJudgment } from "@/lib/application/deprecated-approvals";
import { resolveOfficialLlmPricing } from "./official-pricing";
import { buildDeterministicPlannerResult } from "./planner";

type EnvMap = Record<string, string | undefined>;
type FetchLike = typeof fetch;

export type GeminiPlannerContext = {
  providerSyncReports: ProviderSyncReport[];
  keywordDemandSnapshots: KeywordDemandSnapshot[];
  searchTrendSnapshots: SearchTrendSnapshot[];
};

export type GeminiPlannerPilotResult = {
  result: LlmPlannerResult;
  audit: LlmPlannerAuditRun;
  model: string;
  rawText: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimated: boolean;
  };
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
};

type GeminiPlannerJson = {
  title?: unknown;
  summary?: unknown;
  recommendedApprovalIds?: unknown;
  evidenceIds?: unknown;
  judgmentNotes?: unknown;
  missingEvidenceRequests?: unknown;
};

export async function runGeminiPlannerPilot(input: {
  plannerInput: LlmPlannerInput;
  context: GeminiPlannerContext;
  env?: EnvMap;
  fetchImpl?: FetchLike;
  generatedAt?: string;
  aiOperationsSettings?: AiOperationsSettings;
}): Promise<GeminiPlannerPilotResult> {
  const env = input.env ?? process.env;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const model = resolveGeminiModel(env, input.aiOperationsSettings);
  const apiKey = requiredGeminiApiKey(env);
  const prompt = buildGeminiPlannerPrompt(input.plannerInput, input.context);
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: resolveMaxOutputTokens(env, input.aiOperationsSettings),
        responseMimeType: "application/json",
      },
    }),
  });
  const responseBody = (await safeJson(response)) as GeminiGenerateContentResponse;
  if (!response.ok) {
    throw new Error(`GEMINI_HTTP_${response.status}: ${sanitizeGeminiError(responseBody.error?.message ?? response.statusText)}`);
  }

  const rawText = extractGeminiText(responseBody);
  const parsed = parsePlannerJson(rawText);
  const result = buildGeminiPlannerResult({
    parsed,
    plannerInput: input.plannerInput,
    context: input.context,
    generatedAt,
    usageMetadata: responseBody.usageMetadata,
  });
  const usage = resolveUsage(responseBody.usageMetadata, prompt, rawText);
  const audit = buildGeminiPlannerAudit({
    plannerInput: input.plannerInput,
    result,
    context: input.context,
    generatedAt,
    model,
    usage,
    env,
    aiOperationsSettings: input.aiOperationsSettings,
  });

  return {
    result,
    audit,
    model,
    rawText,
    usage,
  };
}

export function buildGeminiPlannerPrompt(input: LlmPlannerInput, context: GeminiPlannerContext): string {
  const promptPayload = {
    task: "대표 결재 전에 실제 수집 요약을 보고 오늘 우선 검토할 안건을 정리한다.",
    safetyRules: [
      "외부 광고, 상품, 주문, 고객 데이터에 쓰기 작업을 제안하지 않는다.",
      "원천 행이나 개인정보는 입력에 없으며, 집계 요약과 근거 ID만 사용한다.",
      "추천 안건 ID는 candidateSummaries 안의 approvalRequestId에서만 고른다.",
      "근거 ID는 입력에 있는 evidenceIds 또는 수집 요약 ID에서만 고른다.",
      "스티커씨와 커피프린트는 서로 다른 브랜드다.",
      "두 브랜드의 매출이나 예산을 비교하거나 하나의 균형 안건으로 묶지 않는다.",
      "커피프린트 스마트스토어는 커피프린트 브랜드 안의 판매채널 확장으로만 다룬다.",
      "부족한 근거가 있으면 missingEvidenceRequests에 한국어로 짧게 적는다.",
    ],
    requiredJsonShape: {
      title: "짧은 제목",
      summary: "대표가 결재 판단에 쓸 2-4문장 한국어 요약",
      recommendedApprovalIds: ["approval id"],
      evidenceIds: ["evidence id"],
      judgmentNotes: ["판단 근거"],
      missingEvidenceRequests: ["추가 확인할 근거"],
    },
    plannerInput: input,
    providerEvidence: summarizeProviderEvidence(context),
  };

  return [
    "너는 마켓크루의 AI 업무실장 모아다.",
    "아래 JSON만 근거로 보고, 응답도 JSON만 반환한다.",
    "화면에 그대로 보일 수 있는 자연스러운 한국어로 쓴다.",
    JSON.stringify(promptPayload, null, 2),
  ].join("\n\n");
}

function buildGeminiPlannerResult(input: {
  parsed: GeminiPlannerJson;
  plannerInput: LlmPlannerInput;
  context: GeminiPlannerContext;
  generatedAt: string;
  usageMetadata: GeminiGenerateContentResponse["usageMetadata"];
}): LlmPlannerResult {
  const fallback = buildDeterministicPlannerResult(input.plannerInput);
  const allowedApprovalIds = new Set(input.plannerInput.candidateSummaries.map((candidate) => candidate.approvalRequestId));
  const recommendedApprovalIds = uniqueStrings(asStringArray(input.parsed.recommendedApprovalIds)).filter((id) =>
    allowedApprovalIds.has(id),
  );
  const selectedApprovalIds = recommendedApprovalIds.length > 0 ? recommendedApprovalIds : fallback.recommendedApprovalIds;
  const allowedEvidenceIds = new Set([
    ...input.plannerInput.candidateSummaries.flatMap((candidate) => candidate.evidenceIds),
    ...input.context.providerSyncReports.map((report) => report.id),
    ...input.context.keywordDemandSnapshots.map((snapshot) => snapshot.id),
    ...input.context.searchTrendSnapshots.map((snapshot) => snapshot.id),
    ...input.context.providerSyncReports.flatMap((report) => [
      report.commerceAggregateSnapshot?.id,
      report.shopAggregateSnapshot?.id,
      ...(report.keywordDemandSnapshots ?? []).map((snapshot) => snapshot.id),
      ...(report.searchTrendSnapshots ?? []).map((snapshot) => snapshot.id),
    ]),
  ].filter((id): id is string => Boolean(id)));
  const selectedEvidenceIds = uniqueStrings(asStringArray(input.parsed.evidenceIds)).filter((id) => allowedEvidenceIds.has(id));
  const fallbackEvidenceIds = uniqueStrings(
    input.plannerInput.candidateSummaries
      .filter((candidate) => selectedApprovalIds.includes(candidate.approvalRequestId))
      .flatMap((candidate) => candidate.evidenceIds),
  );
  const evidenceIds = selectedEvidenceIds.length > 0 ? selectedEvidenceIds : fallbackEvidenceIds;
  const parsedTitle = asText(input.parsed.title);
  const parsedSummary = buildResultSummary(input.parsed, fallback.summary);
  const containsDeprecatedJudgment = containsDeprecatedCrossBrandJudgment(`${parsedTitle ?? ""} ${parsedSummary}`);
  const title = containsDeprecatedJudgment ? "모아 실제 AI 파일럿 요약" : parsedTitle ?? "모아 실제 AI 파일럿 요약";
  const summary = containsDeprecatedJudgment ? fallback.summary : parsedSummary;

  return {
    id: `planner-result-gemini-${compactTimestamp(input.generatedAt)}`,
    mode: "llm_ready",
    title,
    summary,
    recommendedApprovalIds: selectedApprovalIds,
    evidenceIds,
    rawRowsIncluded: false,
    tokenEstimate: input.usageMetadata?.totalTokenCount ?? estimateJsonTokens({ title, summary, selectedApprovalIds, evidenceIds }),
    createdAt: input.generatedAt,
  };
}

function buildGeminiPlannerAudit(input: {
  plannerInput: LlmPlannerInput;
  result: LlmPlannerResult;
  context: GeminiPlannerContext;
  generatedAt: string;
  model: string;
  usage: GeminiPlannerPilotResult["usage"];
  env: EnvMap;
  aiOperationsSettings?: AiOperationsSettings;
}): LlmPlannerAuditRun {
  const cost = estimateCostKrw({
    env: input.env,
    model: input.model,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    aiOperationsSettings: input.aiOperationsSettings,
  });

  return {
    id: `planner-audit-${input.result.id}`,
    runnerKey: "moa_planner",
    plannerInputId: input.plannerInput.id,
    plannerResultId: input.result.id,
    mode: "llm_ready",
    provider: "gemini",
    model: input.model,
    tokenUsage: {
      inputEstimate: input.usage.inputTokens,
      outputEstimate: input.usage.outputTokens,
      totalEstimate: input.usage.totalTokens,
      rawRowsIncluded: false,
    },
    billing: {
      state: "ESTIMATED_ONLY",
      estimatedCostKrw: cost.estimatedCostKrw,
      basis: cost.basis,
    },
    sourceCounts: {
      candidateSummaries: input.plannerInput.candidateSummaries.length,
      selectedApprovals: input.result.recommendedApprovalIds.length,
      evidenceIds: input.result.evidenceIds.length,
      providerEvidenceNotes: input.context.providerSyncReports.flatMap((report) => report.evidenceNotes).length,
    },
    evidenceIds: input.result.evidenceIds,
    createdAt: input.generatedAt,
  };
}

function summarizeProviderEvidence(context: GeminiPlannerContext) {
  return {
    providerSyncReports: context.providerSyncReports.map((report) => ({
      id: report.id,
      provider: report.provider,
      label: report.label,
      status: report.status,
      checkedAt: report.checkedAt,
      readOnly: report.readOnly,
      writeAttempted: report.writeAttempted,
      evidenceNotes: report.evidenceNotes,
      keywordDemandSnapshotCount: report.keywordDemandSnapshots?.length ?? 0,
      searchTrendSnapshotCount: report.searchTrendSnapshots?.length ?? 0,
      commerceAggregateSnapshot: report.commerceAggregateSnapshot
        ? {
            id: report.commerceAggregateSnapshot.id,
            brandKey: report.commerceAggregateSnapshot.brandKey,
            windowDays: report.commerceAggregateSnapshot.windowDays,
            paidOrderCount: report.commerceAggregateSnapshot.paidOrderCount,
            grossSales: report.commerceAggregateSnapshot.grossSales,
            topProductName: report.commerceAggregateSnapshot.topProductName,
            hasTopProductImage: Boolean(report.commerceAggregateSnapshot.topProductImageUrl),
          }
        : undefined,
      shopAggregateSnapshot: report.shopAggregateSnapshot
        ? {
            id: report.shopAggregateSnapshot.id,
            brandKey: report.shopAggregateSnapshot.brandKey,
            windowDays: report.shopAggregateSnapshot.windowDays,
            orderCount: report.shopAggregateSnapshot.orderCount,
            repeatCustomerCount: report.shopAggregateSnapshot.repeatCustomerCount,
            grossSales: report.shopAggregateSnapshot.grossSales,
            averageOrderValue: report.shopAggregateSnapshot.averageOrderValue,
          }
        : undefined,
    })),
    topKeywordDemandSnapshots: context.keywordDemandSnapshots
      .slice()
      .sort((left, right) => keywordSearchTotal(right) - keywordSearchTotal(left))
      .slice(0, 12)
      .map((snapshot) => ({
        id: snapshot.id,
        keyword: snapshot.keyword,
        provider: snapshot.provider,
        monthlyPcSearches: snapshot.monthlyPcSearches,
        monthlyMobileSearches: snapshot.monthlyMobileSearches,
        competitionIndex: snapshot.competitionIndex,
        averagePcCtr: snapshot.averagePcCtr,
        averageMobileCtr: snapshot.averageMobileCtr,
        collectedAt: snapshot.collectedAt,
      })),
    searchTrendSnapshots: context.searchTrendSnapshots.map((snapshot) => ({
      id: snapshot.id,
      keywordGroupName: snapshot.keywordGroupName,
      provider: snapshot.provider,
      timeUnit: snapshot.timeUnit,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      latestRatio: snapshot.ratios.at(-1)?.ratio,
      peakRatio: Math.max(...snapshot.ratios.map((item) => item.ratio)),
      note: snapshot.note,
    })),
  };
}

function resolveGeminiModel(env: EnvMap, aiOperationsSettings?: AiOperationsSettings): string {
  return (
    normalizeModel(env.AI_LLM_MODEL_PLANNER) ??
    normalizeModel(env.AI_LLM_MODEL_STRATEGIC) ??
    normalizeModel(aiOperationsSettings?.characterProfiles.find((profile) => profile.id === "moa")?.model) ??
    normalizeModel(env.AI_LLM_MODEL_DEFAULT) ??
    "gemini-3.5-flash"
  );
}

function resolveMaxOutputTokens(env: EnvMap, aiOperationsSettings?: AiOperationsSettings): number {
  return parsePositiveInteger(env.AI_LLM_MAX_OUTPUT_TOKENS) ?? aiOperationsSettings?.budget.maxOutputTokens ?? 1200;
}

function requiredGeminiApiKey(env: EnvMap): string {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 설정이 필요합니다.");
  }

  return apiKey;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function extractGeminiText(response: GeminiGenerateContentResponse): string {
  const text = (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter((part): part is string => Boolean(part))
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return text;
}

function parsePlannerJson(rawText: string): GeminiPlannerJson {
  const normalized = rawText
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(normalized) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("GEMINI_PLANNER_RESPONSE_NOT_OBJECT");
  }

  return parsed as GeminiPlannerJson;
}

function resolveUsage(
  usageMetadata: GeminiGenerateContentResponse["usageMetadata"],
  prompt: string,
  rawText: string,
): GeminiPlannerPilotResult["usage"] {
  const inputTokens = usageMetadata?.promptTokenCount ?? estimateTextTokens(prompt);
  const outputTokens = usageMetadata?.candidatesTokenCount ?? estimateTextTokens(rawText);
  const totalTokens = usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimated: !usageMetadata?.totalTokenCount,
  };
}

function estimateCostKrw(input: {
  env: EnvMap;
  model: string;
  inputTokens: number;
  outputTokens: number;
  aiOperationsSettings?: AiOperationsSettings;
}): { estimatedCostKrw: number; basis: string } {
  const settings = input.aiOperationsSettings ?? resolveAiOperationsSettings({ env: input.env });
  const pricing = resolveOfficialLlmPricing("gemini", input.model);
  if (!pricing) {
    return {
      estimatedCostKrw: 0,
      basis: "공식 단가를 찾지 못해 실제 호출 비용은 0원으로 보수 기록했습니다.",
    };
  }

  const costUsd =
    (input.inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (input.outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  return {
    estimatedCostKrw: Math.ceil(costUsd * settings.budget.krwPerUsd),
    basis: "Gemini usageMetadata와 저장된 환율 기준 실제 호출 비용 추정",
  };
}

function buildResultSummary(parsed: GeminiPlannerJson, fallbackSummary: string): string {
  const summary = asText(parsed.summary) ?? fallbackSummary;
  const notes = asStringArray(parsed.judgmentNotes);
  const missing = asStringArray(parsed.missingEvidenceRequests);
  const sections = [summary];
  if (notes.length > 0) {
    sections.push(`판단 근거: ${notes.slice(0, 3).join(" / ")}`);
  }
  if (missing.length > 0) {
    sections.push(`추가 확인: ${missing.slice(0, 3).join(" / ")}`);
  }

  return sections.join(" ");
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function keywordSearchTotal(snapshot: KeywordDemandSnapshot): number {
  return (snapshot.monthlyPcSearches ?? 0) + (snapshot.monthlyMobileSearches ?? 0);
}

function normalizeModel(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim().replace(/^models\//, "");
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function estimateTextTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

function estimateJsonTokens(value: unknown): number {
  return estimateTextTokens(JSON.stringify(value));
}

function compactTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]/g, "");
}

function sanitizeGeminiError(message: string): string {
  return message.slice(0, 180).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
}
