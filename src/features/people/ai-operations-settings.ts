import type {
  AgentRun,
  AgentRunProvider,
  AiBudgetSettings,
  AiCharacterProfileSettings,
  AiOperationsSettings,
  CharacterKey,
} from "@/lib/domain";
import { OFFICIAL_LLM_PRICING, resolveOfficialLlmPricing } from "@/lib/llm/official-pricing";

export type AiModelUsageRow = {
  id: string;
  providerLabel: string;
  model: string;
  runCountLabel: string;
  inputTokensLabel: string;
  outputTokensLabel: string;
  totalTokensLabel: string;
  estimatedCostLabel: string;
  pricingBasisLabel: string;
};

export type AiCharacterProfileView = AiCharacterProfileSettings & {
  usageSummaryLabel: string;
  estimatedCostLabel: string;
};

export type AiPeopleOfficeView = {
  settings: AiOperationsSettings;
  monthLabel: string;
  modelUsageRows: AiModelUsageRow[];
  characterProfiles: AiCharacterProfileView[];
  totalInputTokensLabel: string;
  totalOutputTokensLabel: string;
  totalCostLabel: string;
  monthlyBudgetLabel: string;
  monthlyRemainingLabel: string;
  budgetStatusLabel: string;
  budgetStatusTone: "ready" | "warning" | "blocked";
  modelOptions: Array<{
    provider: AgentRunProvider;
    model: string;
    label: string;
  }>;
  sourceNote: string;
};

type EnvMap = Record<string, string | undefined>;

const settingsId = "default";

export function buildDefaultAiOperationsSettings(input: {
  env?: EnvMap;
  now?: string;
} = {}): AiOperationsSettings {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date().toISOString();
  const defaultProvider = resolveProvider(env.AI_LLM_PROVIDER);
  const strategicModel = env.AI_LLM_MODEL_STRATEGIC ?? env.AI_LLM_MODEL_PLANNER ?? env.AI_LLM_MODEL_DEFAULT ?? "gemini-3.5-flash";
  const defaultModel = env.AI_LLM_MODEL_DEFAULT ?? env.AI_LLM_MODEL_REVIEWER ?? "gemini-3.1-flash-lite";

  return {
    id: settingsId,
    budget: {
      monthlyBudgetKrw: parsePositiveInteger(env.AI_LLM_MONTHLY_BUDGET_KRW) ?? 100_000,
      dailyBudgetKrw: parsePositiveInteger(env.AI_LLM_DAILY_BUDGET_KRW) ?? 10_000,
      runBudgetKrw: parsePositiveInteger(env.AI_LLM_RUN_BUDGET_KRW) ?? 1_500,
      maxInputTokens: parsePositiveInteger(env.AI_LLM_MAX_INPUT_TOKENS) ?? 30_000,
      maxOutputTokens: parsePositiveInteger(env.AI_LLM_MAX_OUTPUT_TOKENS) ?? 8_000,
      maxTotalTokens: parsePositiveInteger(env.AI_LLM_MAX_TOTAL_TOKENS) ?? 38_000,
      krwPerUsd: parsePositiveInteger(env.AI_LLM_KRW_PER_USD) ?? 1_400,
      memo: "월 예산을 먼저 닫고, 결재 직전 최신 근거가 필요할 때만 실제 호출을 엽니다.",
      updatedAt: now,
    },
    characterProfiles: [
      {
        id: "moa",
        name: "모아",
        departmentRole: "AI 업무실장",
        provider: defaultProvider,
        model: strategicModel,
        roleModel: "Chief of Staff처럼 각 담당자의 안건을 묶고 대표 결재에 맞게 우선순위를 정합니다.",
        responsibility: "하위 캐릭터가 올린 안건을 비용, 근거, 실행 위험 기준으로 정리합니다.",
        outputContract: "대표가 바로 승인/보류/보강을 판단할 수 있는 3줄 결론과 근거 ID를 남깁니다.",
        monthlyReviewRule: "월말에는 모델별 사용량과 승인 성과를 묶어 다음 달 호출 한도를 제안합니다.",
        updatedAt: now,
      },
      {
        id: "gro",
        name: "그로",
        departmentRole: "퍼포먼스 마케터",
        provider: defaultProvider,
        model: strategicModel,
        roleModel: "Performance Marketer처럼 시즌 키워드, 광고 효율, 신규 수요를 먼저 찾습니다.",
        responsibility: "네이버 키워드광고와 검색 수요를 보고 테스트 안건을 상신합니다.",
        outputContract: "키워드, 예상 효과, 예산 상한, 중단 기준을 함께 보고합니다.",
        monthlyReviewRule: "월별 광고비 대비 매출 기여와 키워드 발굴 적중률을 봅니다.",
        updatedAt: now,
      },
      {
        id: "pro",
        name: "프로",
        departmentRole: "상품 기획자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: "Merchandiser처럼 상품별 판매 흐름과 시즌 구색을 연결합니다.",
        responsibility: "스티커씨와 커피프린트 상품 데이터를 보고 묶음, 노출, 신규 상품 후보를 올립니다.",
        outputContract: "상품명, 채널, 제안 이유, 필요한 근거를 분리해 남깁니다.",
        monthlyReviewRule: "월별 상품 제안이 실제 주문/재구매로 이어졌는지 확인합니다.",
        updatedAt: now,
      },
      {
        id: "copy",
        name: "카피",
        departmentRole: "콘텐츠 기획자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: "Creative Strategist처럼 승인된 안건을 고객이 이해하는 문장으로 바꿉니다.",
        responsibility: "광고 문구, 상세페이지 메시지, 시즌 선물 제안을 작성합니다.",
        outputContract: "대표 승인 전에는 초안만 만들고 외부 채널에는 쓰지 않습니다.",
        monthlyReviewRule: "월별 문구 테스트의 클릭률, 전환, 반려 사유를 모아 개선합니다.",
        updatedAt: now,
      },
      {
        id: "ripi",
        name: "리피",
        departmentRole: "CRM 담당자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: "Lifecycle Marketer처럼 구매 이후의 재방문과 반복 구매 신호를 관리합니다.",
        responsibility: "고객군, 재구매 타이밍, 쿠폰/메시지 후보를 후속 업무로 올립니다.",
        outputContract: "개인정보 원문 없이 집계 근거와 실행 조건만 보고합니다.",
        monthlyReviewRule: "월별 재구매 후보와 실제 후속 성과를 비교합니다.",
        updatedAt: now,
      },
      {
        id: "maru",
        name: "마루",
        departmentRole: "손익 관리자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: "FP&A Controller처럼 광고비와 마진 위험을 먼저 막습니다.",
        responsibility: "예산 초과, 손익 악화, 성과 측정 누락을 결재 전에 검토합니다.",
        outputContract: "승인 가능 예산, 중단 기준, 성과 확인일을 함께 제시합니다.",
        monthlyReviewRule: "월별 AI 비용과 마케팅 비용이 승인 성과에 맞는지 점검합니다.",
        updatedAt: now,
      },
      {
        id: "day",
        name: "데이",
        departmentRole: "데이터 분석가",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: "BI Analyst처럼 원천 필드와 집계 기준을 검증합니다.",
        responsibility: "수집 누락, 전년동기, 음력 명절 비교, 근거 품질을 확인합니다.",
        outputContract: "분석에 쓴 기간, 채널, 원천 필드, 저장 필드를 명확히 남깁니다.",
        monthlyReviewRule: "월별 수집 실패와 근거 부족 안건을 줄이는 개선안을 냅니다.",
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function resolveAiOperationsSettings(input: {
  stored?: AiOperationsSettings;
  env?: EnvMap;
  now?: string;
} = {}): AiOperationsSettings {
  const fallback = buildDefaultAiOperationsSettings(input);
  if (!input.stored) {
    return fallback;
  }

  return sanitizeAiOperationsSettings(input.stored, fallback, input.now ?? fallback.updatedAt);
}

export function sanitizeAiOperationsSettings(
  value: unknown,
  fallback: AiOperationsSettings,
  now = new Date().toISOString(),
): AiOperationsSettings {
  const raw = isRecord(value) ? value : {};
  const rawBudget = isRecord(raw.budget) ? raw.budget : {};
  const budget: AiBudgetSettings = {
    monthlyBudgetKrw: positiveInteger(rawBudget.monthlyBudgetKrw, fallback.budget.monthlyBudgetKrw),
    dailyBudgetKrw: positiveInteger(rawBudget.dailyBudgetKrw, fallback.budget.dailyBudgetKrw),
    runBudgetKrw: positiveInteger(rawBudget.runBudgetKrw, fallback.budget.runBudgetKrw),
    maxInputTokens: positiveInteger(rawBudget.maxInputTokens, fallback.budget.maxInputTokens),
    maxOutputTokens: positiveInteger(rawBudget.maxOutputTokens, fallback.budget.maxOutputTokens),
    maxTotalTokens: positiveInteger(rawBudget.maxTotalTokens, fallback.budget.maxTotalTokens),
    krwPerUsd: positiveInteger(rawBudget.krwPerUsd, fallback.budget.krwPerUsd),
    memo: cleanText(rawBudget.memo, fallback.budget.memo, 240),
    updatedAt: now,
  };
  const rawProfiles = Array.isArray(raw.characterProfiles) ? raw.characterProfiles : [];
  const profileById = new Map(rawProfiles.filter(isRecord).map((profile) => [profile.id, profile]));

  const characterProfiles = fallback.characterProfiles.map((fallbackProfile) => {
    const rawProfile = profileById.get(fallbackProfile.id);
    if (!rawProfile) {
      return {
        ...fallbackProfile,
        updatedAt: now,
      };
    }

    return {
      id: fallbackProfile.id,
      name: fallbackProfile.name,
      departmentRole: cleanText(rawProfile.departmentRole, fallbackProfile.departmentRole, 80),
      provider: resolveProvider(cleanText(rawProfile.provider, fallbackProfile.provider, 40)),
      model: cleanText(rawProfile.model, fallbackProfile.model, 80),
      roleModel: cleanText(rawProfile.roleModel, fallbackProfile.roleModel, 220),
      responsibility: cleanText(rawProfile.responsibility, fallbackProfile.responsibility, 220),
      outputContract: cleanText(rawProfile.outputContract, fallbackProfile.outputContract, 220),
      monthlyReviewRule: cleanText(rawProfile.monthlyReviewRule, fallbackProfile.monthlyReviewRule, 220),
      updatedAt: now,
    };
  });

  return {
    id: settingsId,
    budget,
    characterProfiles,
    updatedAt: now,
  };
}

export function buildAiPeopleOfficeView(input: {
  settings: AiOperationsSettings;
  agentRuns: AgentRun[];
  generatedAt?: string;
}): AiPeopleOfficeView {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const monthKey = formatMonthKey(generatedAt);
  const monthRuns = input.agentRuns.filter((run) => formatMonthKey(run.finishedAt ?? run.startedAt) === monthKey);
  const billableRuns = monthRuns.filter((run) => run.tokenUsage.totalTokens > 0 || run.tokenUsage.estimatedCostKrw > 0);
  const totals = billableRuns.reduce(
    (sum, run) => {
      const costKrw = estimateRunCostKrw(run, input.settings.budget.krwPerUsd);
      return {
        inputTokens: sum.inputTokens + run.tokenUsage.inputTokens,
        outputTokens: sum.outputTokens + run.tokenUsage.outputTokens,
        costKrw: sum.costKrw + costKrw,
      };
    },
    { inputTokens: 0, outputTokens: 0, costKrw: 0 },
  );
  const modelUsageRows = buildModelUsageRows(billableRuns, input.settings.budget.krwPerUsd);
  const usageByCharacter = groupUsageByCharacter(billableRuns, input.settings.budget.krwPerUsd);
  const monthlyRemainingKrw = input.settings.budget.monthlyBudgetKrw - totals.costKrw;
  const budgetRatio = input.settings.budget.monthlyBudgetKrw > 0 ? totals.costKrw / input.settings.budget.monthlyBudgetKrw : 1;

  return {
    settings: input.settings,
    monthLabel: formatMonthLabel(generatedAt),
    modelUsageRows,
    characterProfiles: input.settings.characterProfiles.map((profile) => {
      const usage = usageByCharacter.get(profile.id) ?? { inputTokens: 0, outputTokens: 0, costKrw: 0 };
      return {
        ...profile,
        usageSummaryLabel: `입력 ${formatCount(usage.inputTokens)} / 출력 ${formatCount(usage.outputTokens)}토큰`,
        estimatedCostLabel: formatKrw(usage.costKrw),
      };
    }),
    totalInputTokensLabel: `${formatCount(totals.inputTokens)}토큰`,
    totalOutputTokensLabel: `${formatCount(totals.outputTokens)}토큰`,
    totalCostLabel: formatKrw(totals.costKrw),
    monthlyBudgetLabel: formatKrw(input.settings.budget.monthlyBudgetKrw),
    monthlyRemainingLabel:
      monthlyRemainingKrw >= 0 ? `잔여 ${formatKrw(monthlyRemainingKrw)}` : `초과 ${formatKrw(Math.abs(monthlyRemainingKrw))}`,
    budgetStatusLabel: budgetRatio >= 1 ? "월 예산 초과" : budgetRatio >= 0.8 ? "주의 구간" : "예산 안정",
    budgetStatusTone: budgetRatio >= 1 ? "blocked" : budgetRatio >= 0.8 ? "warning" : "ready",
    modelOptions: [
      ...OFFICIAL_LLM_PRICING.map((pricing) => ({
        provider: pricing.provider,
        model: pricing.model,
        label: `${pricing.displayName} · 입력 ${formatUsd(pricing.inputUsdPerMillionTokens)} / 출력 ${formatUsd(pricing.outputUsdPerMillionTokens)}`,
      })),
      {
        provider: "deterministic",
        model: "deterministic-fallback",
        label: "규칙 기반 대체 · 과금 없음",
      },
    ],
    sourceNote: "월별 사용량은 저장된 AgentRun의 입력/출력 토큰과 공식 모델 단가 기준 예상금액으로 계산합니다.",
  };
}

function buildModelUsageRows(agentRuns: AgentRun[], krwPerUsd: number): AiModelUsageRow[] {
  const rowsByModel = new Map<
    string,
    {
      provider: AgentRunProvider;
      model: string;
      runCount: number;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostKrw: number;
      pricingBasis: string;
    }
  >();

  for (const run of agentRuns) {
    const key = `${run.provider}:${run.model}`;
    const existing = rowsByModel.get(key) ?? {
      provider: run.provider,
      model: run.model,
      runCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostKrw: 0,
      pricingBasis: pricingBasisLabel(run, krwPerUsd),
    };

    existing.runCount += 1;
    existing.inputTokens += run.tokenUsage.inputTokens;
    existing.outputTokens += run.tokenUsage.outputTokens;
    existing.totalTokens += run.tokenUsage.totalTokens;
    existing.estimatedCostKrw += estimateRunCostKrw(run, krwPerUsd);
    rowsByModel.set(key, existing);
  }

  const rows = Array.from(rowsByModel.values());
  if (rows.length === 0) {
    return [
      {
        id: "empty",
        providerLabel: "기록 없음",
        model: "이번 달 실제 AI 호출 기록이 아직 없습니다.",
        runCountLabel: "0건",
        inputTokensLabel: "0토큰",
        outputTokensLabel: "0토큰",
        totalTokensLabel: "0토큰",
        estimatedCostLabel: "0원",
        pricingBasisLabel: "결재 전에는 규칙 기반 대체와 샘플 근거만 사용 중입니다.",
      },
    ];
  }

  return rows
    .sort((left, right) => right.estimatedCostKrw - left.estimatedCostKrw || right.totalTokens - left.totalTokens)
    .map((row) => ({
      id: `${row.provider}-${row.model}`,
      providerLabel: providerLabel(row.provider),
      model: row.model,
      runCountLabel: `${formatCount(row.runCount)}건`,
      inputTokensLabel: `${formatCount(row.inputTokens)}토큰`,
      outputTokensLabel: `${formatCount(row.outputTokens)}토큰`,
      totalTokensLabel: `${formatCount(row.totalTokens)}토큰`,
      estimatedCostLabel: formatKrw(row.estimatedCostKrw),
      pricingBasisLabel: row.pricingBasis,
    }));
}

function groupUsageByCharacter(agentRuns: AgentRun[], krwPerUsd: number) {
  const usageByCharacter = new Map<CharacterKey, { inputTokens: number; outputTokens: number; costKrw: number }>();
  for (const run of agentRuns) {
    const character = characterFromRunner(run.runnerKey);
    const existing = usageByCharacter.get(character) ?? { inputTokens: 0, outputTokens: 0, costKrw: 0 };
    existing.inputTokens += run.tokenUsage.inputTokens;
    existing.outputTokens += run.tokenUsage.outputTokens;
    existing.costKrw += estimateRunCostKrw(run, krwPerUsd);
    usageByCharacter.set(character, existing);
  }

  return usageByCharacter;
}

function estimateRunCostKrw(run: AgentRun, krwPerUsd: number): number {
  const pricing = resolveOfficialLlmPricing(run.provider, run.model);
  if (!pricing) {
    return run.tokenUsage.estimatedCostKrw;
  }

  const usd =
    (run.tokenUsage.inputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (run.tokenUsage.outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

  return Math.ceil(usd * krwPerUsd);
}

function pricingBasisLabel(run: AgentRun, krwPerUsd: number): string {
  const pricing = resolveOfficialLlmPricing(run.provider, run.model);
  if (!pricing) {
    return run.tokenUsage.basis || "저장된 실행 기록의 추정 비용 기준";
  }

  return `${pricing.sourceLabel} · ${pricing.checkedAt} 확인 · 적용 환율 ${formatCount(krwPerUsd)}원`;
}

function characterFromRunner(runnerKey: string): CharacterKey {
  const normalized = runnerKey.toLowerCase();
  if (normalized.includes("gro") || normalized.includes("growth")) {
    return "gro";
  }
  if (normalized.includes("pro") || normalized.includes("product")) {
    return "pro";
  }
  if (normalized.includes("copy") || normalized.includes("creative")) {
    return "copy";
  }
  if (normalized.includes("ripi") || normalized.includes("crm")) {
    return "ripi";
  }
  if (normalized.includes("maru") || normalized.includes("finance")) {
    return "maru";
  }
  if (normalized.includes("day") || normalized.includes("data") || normalized.includes("sync")) {
    return "day";
  }

  return "moa";
}

function resolveProvider(value: unknown): AgentRunProvider {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "openai") {
    return "openai";
  }
  if (normalized === "deterministic") {
    return "deterministic";
  }
  if (normalized === "local") {
    return "local";
  }

  return "gemini";
}

function providerLabel(provider: AgentRunProvider): string {
  const labels: Partial<Record<AgentRunProvider, string>> = {
    deterministic: "규칙 기반",
    gemini: "Gemini",
    openai: "OpenAI",
    local: "로컬",
  };

  return labels[provider] ?? provider;
}

function formatMonthKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(value));
}

function formatMonthLabel(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
  }).format(new Date(value));
}

function formatKrw(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maxLength) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
