import type { AgentRun, LlmPlannerAuditRun, ProviderReadinessReport } from "@/lib/domain";
import { formatUsdPerMillionTokens, resolveOfficialLlmPricing } from "@/lib/llm/official-pricing";
import type { LlmCostGovernanceView } from "./types";

type EnvMap = Record<string, string | undefined>;
type GateTone = LlmCostGovernanceView["gateChecks"][number]["tone"];
type OfficialPricingRow = LlmCostGovernanceView["officialPricingRows"][number];

export type BuildLlmCostGovernanceViewInput = {
  env?: EnvMap;
  generatedAt: string;
  plannerAudit: LlmPlannerAuditRun;
  agentRuns: AgentRun[];
  providerReadiness: ProviderReadinessReport[];
};

// Design Ref: real-llm-provider-cost-governance — actual model calls stay blocked until provider, token, and KRW budget gates pass.
export function buildLlmCostGovernanceView(input: BuildLlmCostGovernanceViewInput): LlmCostGovernanceView {
  const env = input.env ?? process.env;
  const llmReadiness = input.providerReadiness.find((report) => report.provider === "llm");
  const providerKey = normalizeText(env.AI_LLM_PROVIDER) ?? input.plannerAudit.provider;
  const modelKey = resolveModelKey(env, input.plannerAudit);
  const credentialMissingKeys = missingCredentialKeys(env);
  const credentialReady = llmReadiness?.canRead ?? (hasValue(providerKey) && credentialMissingKeys.length === 0);
  const inputTokens = input.plannerAudit.tokenUsage.inputEstimate;
  const outputTokens = input.plannerAudit.tokenUsage.outputEstimate;
  const totalTokens = input.plannerAudit.tokenUsage.totalEstimate;
  const inputRate = parsePositiveNumber(env.AI_LLM_COST_PER_1K_INPUT_KRW);
  const outputRate = parsePositiveNumber(env.AI_LLM_COST_PER_1K_OUTPUT_KRW);
  const hasRatePolicy = inputRate !== undefined && outputRate !== undefined;
  const estimatedRunCostKrw = hasRatePolicy
    ? Math.ceil((inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate)
    : 0;
  const dailyBudgetKrw = parsePositiveNumber(env.AI_LLM_DAILY_BUDGET_KRW);
  const runBudgetKrw = parsePositiveNumber(env.AI_LLM_RUN_BUDGET_KRW);
  const inputTokenCap = parsePositiveInteger(env.AI_LLM_MAX_INPUT_TOKENS);
  const outputTokenCap = parsePositiveInteger(env.AI_LLM_MAX_OUTPUT_TOKENS);
  const totalTokenCap = parsePositiveInteger(env.AI_LLM_MAX_TOTAL_TOKENS);
  const todaySpentKrw = calculateSpentToday(input.agentRuns, input.generatedAt);
  const projectedDailyCostKrw = todaySpentKrw + estimatedRunCostKrw;
  const checks = [
    buildGateCheck({
      id: "provider-credential",
      label: "연동 키",
      blocked: !credentialReady,
      message: credentialReady
        ? "AI 모델 연동 정보와 키가 설정되어 있습니다."
        : `${credentialMissingKeys.join(", ") || "AI_LLM_PROVIDER"} 설정 전까지 규칙 기반 대체만 사용합니다.`,
    }),
    buildGateCheck({
      id: "rate-policy",
      label: "단가 정책",
      blocked: !hasRatePolicy,
      message: hasRatePolicy
        ? "입력/출력 1천 토큰 단가가 환경 설정에 고정되어 있습니다."
        : "AI_LLM_COST_PER_1K_INPUT_KRW와 AI_LLM_COST_PER_1K_OUTPUT_KRW가 필요합니다.",
    }),
    buildGateCheck({
      id: "run-budget",
      label: "1회 예산",
      blocked: runBudgetKrw === undefined || estimatedRunCostKrw > runBudgetKrw,
      message:
        runBudgetKrw === undefined
          ? "AI_LLM_RUN_BUDGET_KRW 설정 전까지 실제 호출을 열지 않습니다."
          : `이번 호출 예상 ${formatKrw(estimatedRunCostKrw)} / 한도 ${formatKrw(runBudgetKrw)}`,
    }),
    buildGateCheck({
      id: "daily-budget",
      label: "일 예산",
      blocked: dailyBudgetKrw === undefined || projectedDailyCostKrw > dailyBudgetKrw,
      message:
        dailyBudgetKrw === undefined
          ? "AI_LLM_DAILY_BUDGET_KRW 설정 전까지 실제 호출을 열지 않습니다."
          : `오늘 누적+예상 ${formatKrw(projectedDailyCostKrw)} / 한도 ${formatKrw(dailyBudgetKrw)}`,
    }),
    buildGateCheck({
      id: "input-token-cap",
      label: "입력 토큰",
      blocked: inputTokenCap !== undefined && inputTokens > inputTokenCap,
      warning: inputTokenCap === undefined,
      message:
        inputTokenCap === undefined
          ? "AI_LLM_MAX_INPUT_TOKENS가 없어 입력 토큰 상한은 아직 주의 상태입니다."
          : `입력 ${formatCount(inputTokens)} / 한도 ${formatCount(inputTokenCap)}토큰`,
    }),
    buildGateCheck({
      id: "output-token-cap",
      label: "출력 토큰",
      blocked: outputTokenCap !== undefined && outputTokens > outputTokenCap,
      warning: outputTokenCap === undefined,
      message:
        outputTokenCap === undefined
          ? "AI_LLM_MAX_OUTPUT_TOKENS가 없어 출력 토큰 상한은 아직 주의 상태입니다."
          : `출력 ${formatCount(outputTokens)} / 한도 ${formatCount(outputTokenCap)}토큰`,
    }),
    buildGateCheck({
      id: "total-token-cap",
      label: "총 토큰",
      blocked: totalTokenCap !== undefined && totalTokens > totalTokenCap,
      warning: totalTokenCap === undefined,
      message:
        totalTokenCap === undefined
          ? "AI_LLM_MAX_TOTAL_TOKENS가 없어 총 토큰 상한은 아직 주의 상태입니다."
          : `총 ${formatCount(totalTokens)} / 한도 ${formatCount(totalTokenCap)}토큰`,
    }),
    buildGateCheck({
      id: "raw-row-privacy",
      label: "원천 행 제외",
      blocked: input.plannerAudit.tokenUsage.rawRowsIncluded,
      message: input.plannerAudit.tokenUsage.rawRowsIncluded
        ? "원천 행이 포함된 모아 입력은 실제 AI 호출 대상이 아닙니다."
        : "집계 요약과 근거 ID만 모아 입력에 포함됩니다.",
    }),
    buildGateCheck({
      id: "external-write",
      label: "외부 반영",
      blocked: env.MARKETCREW_EXTERNAL_WRITE_ENABLED === "true",
      message:
        env.MARKETCREW_EXTERNAL_WRITE_ENABLED === "true"
          ? "외부 반영 잠금이 열려 있어 AI 비용 검증과 별도 재검토가 필요합니다."
          : "AI 모델은 외부 채널에 직접 쓰지 않고 대표 결재 초안만 만듭니다.",
    }),
  ];
  const hasBlockedGate = checks.some((check) => check.tone === "blocked");
  const hasWarningGate = checks.some((check) => check.tone === "warning");
  const liveCallAllowed = !hasBlockedGate;
  const remainingBudgetKrw = dailyBudgetKrw === undefined ? undefined : Math.max(dailyBudgetKrw - projectedDailyCostKrw, 0);
  const officialPricingRows = buildOfficialPricingRows(env, providerKey, modelKey);

  return {
    statusLabel: liveCallAllowed ? (hasWarningGate ? "주의 후 가능" : "실제 호출 차단 해제") : "실제 호출 차단",
    tone: liveCallAllowed ? (hasWarningGate ? "warning" : "ready") : "blocked",
    liveCallAllowed,
    providerLabel: `연동 ${providerDisplayName(providerKey)}`,
    modelLabel: `모델 ${modelKey}`,
    credentialLabel: credentialReady ? "키 설정됨" : `누락 ${credentialMissingKeys.join(", ") || "AI_LLM_PROVIDER"}`,
    modeLabel:
      input.plannerAudit.mode === "deterministic_fallback"
        ? "현재 규칙 기반 대체"
        : "현재 AI 호출 예상",
    estimatedRunCostLabel: hasRatePolicy ? `이번 예상 ${formatKrw(estimatedRunCostKrw)}` : "이번 예상 단가 미설정",
    dailySpentLabel: `오늘 누적 ${formatKrw(todaySpentKrw)}`,
    dailyBudgetLabel: dailyBudgetKrw === undefined ? "일 예산 미설정" : `일 예산 ${formatKrw(dailyBudgetKrw)}`,
    dailyRemainingLabel:
      remainingBudgetKrw === undefined ? "잔여 예산 계산 대기" : `호출 후 잔여 ${formatKrw(remainingBudgetKrw)}`,
    runBudgetLabel: runBudgetKrw === undefined ? "1회 예산 미설정" : `1회 한도 ${formatKrw(runBudgetKrw)}`,
    rateBasisLabel: hasRatePolicy
      ? `환경 단가: 입력 ${formatKrw(inputRate)} / 출력 ${formatKrw(outputRate)} / 1천 토큰`
      : "공식 USD 가격표는 참고로 표시하고, 실제 원화 계산은 환경 단가가 있을 때만 수행합니다.",
    officialPricingSourceLabel: resolvePricingSourceLabel(officialPricingRows),
    pricingFormulaLabel:
      "공식 USD 단가에 적용 환율을 반영해 AI_LLM_COST_PER_1K_INPUT_KRW와 AI_LLM_COST_PER_1K_OUTPUT_KRW를 정하면 실제 호출 비용 가드가 계산됩니다.",
    officialPricingRows,
    plannedTokenLabels: [
      `입력 ${formatCount(inputTokens)}토큰`,
      `출력 ${formatCount(outputTokens)}토큰`,
      `총 ${formatCount(totalTokens)}토큰`,
      input.plannerAudit.tokenUsage.rawRowsIncluded ? "원천 행 포함" : "원천 행 제외",
    ],
    decisionSummary: liveCallAllowed
      ? "예산과 토큰 조건을 통과한 요청만 실제 AI 호출 후보가 됩니다. 외부 채널 반영은 계속 별도 결재 대상입니다."
      : "비용 정책 또는 토큰 조건이 닫혀 있어 모아는 규칙 기반 대체로만 종합합니다.",
    gateChecks: checks,
  };
}

function buildOfficialPricingRows(env: EnvMap, providerKey: string, activeModelKey: string): OfficialPricingRow[] {
  const configuredModels = collectConfiguredModels(env, activeModelKey);

  return configuredModels.map(({ modelKey, roles }) => {
    const pricing = resolveOfficialLlmPricing(providerKey, modelKey);
    const isActive = modelKey === activeModelKey;
    const roleLabel = `${roles.join(" / ")}${isActive ? " · 현재 호출 후보" : ""}`;

    if (!pricing) {
      return {
        modelKey,
        modelLabel: modelKey,
        roleLabel,
        tierLabel: "공식 단가 미확인",
        inputPriceLabel: "입력 단가 미확인",
        outputPriceLabel: "출력 단가 미확인",
        cachePriceLabel: "캐시 단가 미확인",
        sourceLabel: "공식 가격표 확인 필요",
        sourceUrl: "",
        tone: "missing",
        note: "공식 가격표에 없는 모델명은 실제 호출 전에 모델명과 단가를 다시 확인해야 합니다.",
      };
    }

    return {
      modelKey,
      modelLabel: pricing.displayName,
      roleLabel,
      tierLabel: `${pricing.providerLabel} ${pricing.tierLabel}`,
      inputPriceLabel: `입력 ${formatUsdPerMillionTokens(pricing.inputUsdPerMillionTokens)} / 100만 토큰`,
      outputPriceLabel: `출력 ${formatUsdPerMillionTokens(pricing.outputUsdPerMillionTokens)} / 100만 토큰`,
      cachePriceLabel:
        pricing.contextCacheUsdPerMillionTokens === undefined
          ? "캐시 단가 없음"
          : `캐시 ${formatUsdPerMillionTokens(pricing.contextCacheUsdPerMillionTokens)} / 100만 토큰`,
      sourceLabel: `${pricing.sourceLabel} · ${pricing.checkedAt} 확인`,
      sourceUrl: pricing.sourceUrl,
      tone: isActive ? "active" : "reference",
      note: pricing.note,
    };
  });
}

function collectConfiguredModels(env: EnvMap, activeModelKey: string): Array<{ modelKey: string; roles: string[] }> {
  const rolesByModel = new Map<string, string[]>();
  const roleInputs = [
    { label: "기획", value: env.AI_LLM_MODEL_PLANNER },
    { label: "전략", value: env.AI_LLM_MODEL_STRATEGIC },
    { label: "검토", value: env.AI_LLM_MODEL_REVIEWER },
    { label: "기본", value: env.AI_LLM_MODEL_DEFAULT },
  ];

  for (const input of roleInputs) {
    const modelKey = normalizeText(input.value);
    if (!modelKey) {
      continue;
    }
    rolesByModel.set(modelKey, [...(rolesByModel.get(modelKey) ?? []), input.label]);
  }

  if (!rolesByModel.has(activeModelKey)) {
    rolesByModel.set(activeModelKey, ["현재"]);
  }

  return Array.from(rolesByModel, ([modelKey, roles]) => ({ modelKey, roles }));
}

function resolvePricingSourceLabel(rows: OfficialPricingRow[]): string {
  const sources = Array.from(new Set(rows.filter((row) => row.sourceUrl).map((row) => row.sourceLabel)));

  return sources.length === 0 ? "공식 가격표 확인 필요" : sources.join(" / ");
}

function buildGateCheck(input: {
  id: string;
  label: string;
  blocked: boolean;
  warning?: boolean;
  message: string;
}): LlmCostGovernanceView["gateChecks"][number] {
  const tone: GateTone = input.blocked ? "blocked" : input.warning ? "warning" : "ready";
  const statusLabel = tone === "blocked" ? "차단" : tone === "warning" ? "주의" : "통과";

  return {
    id: input.id,
    label: input.label,
    statusLabel,
    tone,
    message: input.message,
  };
}

function resolveModelKey(env: EnvMap, audit: LlmPlannerAuditRun): string {
  return (
    normalizeText(env.AI_LLM_MODEL_PLANNER) ??
    normalizeText(env.AI_LLM_MODEL_STRATEGIC) ??
    normalizeText(env.AI_LLM_MODEL_DEFAULT) ??
    audit.model
  );
}

function missingCredentialKeys(env: EnvMap): string[] {
  const provider = normalizeText(env.AI_LLM_PROVIDER);
  if (!provider) {
    return ["AI_LLM_PROVIDER"];
  }
  if (provider === "gemini" && !hasValue(env.GEMINI_API_KEY)) {
    return ["GEMINI_API_KEY"];
  }
  if (provider === "openai" && !hasValue(env.OPENAI_API_KEY)) {
    return ["OPENAI_API_KEY"];
  }

  return [];
}

function providerDisplayName(provider: string): string {
  const labels: Record<string, string> = {
    deterministic: "규칙 기반",
    gemini: "Gemini",
    openai: "OpenAI",
  };

  return labels[provider] ?? provider;
}

function calculateSpentToday(agentRuns: AgentRun[], generatedAt: string): number {
  const today = formatDateKey(generatedAt);

  return agentRuns
    .filter((run) => formatDateKey(run.finishedAt ?? run.startedAt) === today)
    .reduce((sum, run) => sum + run.tokenUsage.estimatedCostKrw, 0);
}

function formatDateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  if (!hasValue(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  const parsed = parsePositiveNumber(value);
  return parsed === undefined ? undefined : Math.floor(parsed);
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasValue(value: string | undefined): boolean {
  return normalizeText(value) !== undefined;
}

function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatCount(value: number): string {
  return value.toLocaleString("ko-KR");
}
