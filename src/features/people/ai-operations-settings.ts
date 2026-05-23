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

export type AiExplorationPolicyView = {
  title: string;
  summary: string;
  steps: Array<{
    title: string;
    description: string;
  }>;
  safeguards: string[];
};

export type AiPeopleOfficeView = {
  settings: AiOperationsSettings;
  monthLabel: string;
  modelUsageRows: AiModelUsageRow[];
  characterProfiles: AiCharacterProfileView[];
  explorationPolicy: AiExplorationPolicyView;
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

const explorationPolicyView: AiExplorationPolicyView = {
  title: "자유 탐색과 근거 요청 원칙",
  summary:
    "AI 모델은 정해진 이상신호만 확인하지 않고, 낯선 가설과 필요한 근거를 먼저 제안합니다. 확인된 근거만 결재 안건으로 승격합니다.",
  steps: [
    {
      title: "정형 감지",
      description: "이미 정한 신호로 누락 없이 기본 위험을 잡습니다.",
    },
    {
      title: "자유 탐색",
      description: "상품·키워드·기기·시간대·고객군 조합에서 예상 못 한 기회와 이상신호를 찾습니다.",
    },
    {
      title: "근거 요청",
      description: "확정 판단 전 필요한 원천 필드, 비교 기간, 세그먼트를 데이에게 요청합니다.",
    },
    {
      title: "검증 후 안건화",
      description: "실제 데이터로 확인된 가설만 모아가 대표 결재 안건으로 올립니다.",
    },
  ],
  safeguards: ["없는 데이터를 근거처럼 말하지 않음", "가설과 확인된 사실을 분리", "확인 전 외부 반영 금지"],
};

const explorationProfileGuidance: Record<
  CharacterKey,
  {
    roleModel: string;
    responsibility: string;
    outputContract: string;
    monthlyReviewRule: string;
  }
> = {
  moa: {
    roleModel: "낯선 가설은 바로 결재하지 않고 검증된 근거만 안건으로 승격합니다.",
    responsibility: "하위 캐릭터의 자유 탐색 가설과 근거 요청을 비용, 근거, 실행 위험 기준으로 정리합니다.",
    outputContract: "가설, 확인된 사실, 추가 근거 요청을 분리해 대표가 승인/보류/보강을 바로 판단하게 합니다.",
    monthlyReviewRule: "월말에는 승인된 가설과 반려된 가설을 비교해 다음 달 탐색 범위를 조정합니다.",
  },
  gro: {
    roleModel: "정해진 지표 밖의 키워드·기기·시간대 조합도 자유 탐색합니다.",
    responsibility: "네이버 키워드광고와 검색 수요에서 새 가설을 만들고 필요한 광고 설정 근거를 요청합니다.",
    outputContract: "키워드, 기기, 시간대 가설마다 예상 효과, 예산 상한, 중단 기준, 필요한 근거를 함께 보고합니다.",
    monthlyReviewRule: "월별로 자유 탐색 키워드의 승인률, 광고비 대비 성과, 중단 기준 적중률을 확인합니다.",
  },
  pro: {
    roleModel: "상품·시즌·채널 조합 가설을 만들고 필요한 근거를 요청합니다.",
    responsibility: "스티커씨와 커피프린트 상품 흐름에서 묶음, 노출, 신규 상품, 시즌 용도 가설을 발굴합니다.",
    outputContract: "상품명, 채널, 시즌 가설, 필요한 판매/검색/마진 근거를 분리해 남깁니다.",
    monthlyReviewRule: "월별 상품 가설이 주문, 재구매, 마진, 검색 수요로 확인됐는지 비교합니다.",
  },
  copy: {
    roleModel: "고객 언어와 숨은 구매 이유 가설을 제안하되 승인 전에는 초안으로만 둡니다.",
    responsibility: "광고 문구, 상세페이지, 시즌 메시지에서 새로운 고객 동기와 표현 후보를 찾습니다.",
    outputContract: "문구 초안, 고객 가설, 확인할 클릭/전환 근거, 게시 전 승인 조건을 함께 보고합니다.",
    monthlyReviewRule: "월별 문구 가설의 클릭률, 전환, 반려 사유를 모아 다음 실험 기준을 고칩니다.",
  },
  ripi: {
    roleModel: "재구매 고객군과 이탈 조짐을 자유 탐색하고 개인정보 없이 근거를 요청합니다.",
    responsibility: "구매 주기, 고객군, 쿠폰/메시지 반응에서 예상 못 한 후속 업무 후보를 찾습니다.",
    outputContract: "고객군 가설, 집계 근거, 발송 조건, 개인정보 제외 기준을 분리해 보고합니다.",
    monthlyReviewRule: "월별 재구매 가설이 반복 구매, 이탈 방지, 비용 절감으로 이어졌는지 비교합니다.",
  },
  maru: {
    roleModel: "마진·예산·기회비용의 예상 못 한 위험을 찾고 확인 전 지출 확대를 막습니다.",
    responsibility: "광고비, 할인, 상품 마진, 실행 비용에서 숨은 손익 리스크와 확인할 근거를 찾습니다.",
    outputContract: "승인 가능 예산, 손익 가설, 중단 기준, 확인할 비용 근거를 함께 제시합니다.",
    monthlyReviewRule: "월별 자유 탐색 안건의 비용 대비 성과와 예산 초과 방지 효과를 점검합니다.",
  },
  day: {
    roleModel: "LLM이 제안한 근거 후보를 실제 원천 필드와 집계 기준으로 검증합니다.",
    responsibility: "수집 누락, 전년동기, 음력 명절 비교, 세그먼트, 원천 필드 후보를 확인해 가설 신뢰도를 매깁니다.",
    outputContract: "확인된 근거, 부족한 근거, 추가 수집 요청, 판단 보류 사유를 명확히 남깁니다.",
    monthlyReviewRule: "월별 근거 부족 안건과 잘못된 가설을 줄이는 데이터 보강 우선순위를 냅니다.",
  },
};

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
        roleModel: `대표 비서실장처럼 각 담당자의 안건을 묶고 대표 결재에 맞게 우선순위를 정합니다. ${explorationProfileGuidance.moa.roleModel}`,
        responsibility: explorationProfileGuidance.moa.responsibility,
        outputContract: explorationProfileGuidance.moa.outputContract,
        monthlyReviewRule: explorationProfileGuidance.moa.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "gro",
        name: "그로",
        departmentRole: "퍼포먼스 마케터",
        provider: defaultProvider,
        model: strategicModel,
        roleModel: `광고 성과 담당자처럼 시즌 키워드, 광고 효율, 신규 수요를 먼저 찾습니다. ${explorationProfileGuidance.gro.roleModel}`,
        responsibility: explorationProfileGuidance.gro.responsibility,
        outputContract: explorationProfileGuidance.gro.outputContract,
        monthlyReviewRule: explorationProfileGuidance.gro.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "pro",
        name: "프로",
        departmentRole: "상품 기획자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: `상품 기획자처럼 상품별 판매 흐름과 시즌 구색을 연결합니다. ${explorationProfileGuidance.pro.roleModel}`,
        responsibility: explorationProfileGuidance.pro.responsibility,
        outputContract: explorationProfileGuidance.pro.outputContract,
        monthlyReviewRule: explorationProfileGuidance.pro.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "copy",
        name: "카피",
        departmentRole: "콘텐츠 기획자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: `콘텐츠 전략가처럼 승인된 안건을 고객이 이해하는 문장으로 바꿉니다. ${explorationProfileGuidance.copy.roleModel}`,
        responsibility: explorationProfileGuidance.copy.responsibility,
        outputContract: explorationProfileGuidance.copy.outputContract,
        monthlyReviewRule: explorationProfileGuidance.copy.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "ripi",
        name: "리피",
        departmentRole: "고객 관리 담당자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: `재구매 관리 담당자처럼 구매 이후의 재방문과 반복 구매 신호를 관리합니다. ${explorationProfileGuidance.ripi.roleModel}`,
        responsibility: explorationProfileGuidance.ripi.responsibility,
        outputContract: explorationProfileGuidance.ripi.outputContract,
        monthlyReviewRule: explorationProfileGuidance.ripi.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "maru",
        name: "마루",
        departmentRole: "손익 관리자",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: `손익 관리 담당자처럼 광고비와 마진 위험을 먼저 막습니다. ${explorationProfileGuidance.maru.roleModel}`,
        responsibility: explorationProfileGuidance.maru.responsibility,
        outputContract: explorationProfileGuidance.maru.outputContract,
        monthlyReviewRule: explorationProfileGuidance.maru.monthlyReviewRule,
        updatedAt: now,
      },
      {
        id: "day",
        name: "데이",
        departmentRole: "데이터 분석가",
        provider: defaultProvider,
        model: defaultModel,
        roleModel: `데이터 감사 담당자처럼 원천 필드와 집계 기준을 검증합니다. ${explorationProfileGuidance.day.roleModel}`,
        responsibility: explorationProfileGuidance.day.responsibility,
        outputContract: explorationProfileGuidance.day.outputContract,
        monthlyReviewRule: explorationProfileGuidance.day.monthlyReviewRule,
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

    return enrichCharacterExplorationGuidance({
      id: fallbackProfile.id,
      name: fallbackProfile.name,
      departmentRole: localizePeopleOfficeText(cleanText(rawProfile.departmentRole, fallbackProfile.departmentRole, 80)),
      provider: resolveProvider(cleanText(rawProfile.provider, fallbackProfile.provider, 40)),
      model: cleanText(rawProfile.model, fallbackProfile.model, 80),
      roleModel: localizePeopleOfficeText(cleanText(rawProfile.roleModel, fallbackProfile.roleModel, 280)),
      responsibility: cleanText(rawProfile.responsibility, fallbackProfile.responsibility, 280),
      outputContract: cleanText(rawProfile.outputContract, fallbackProfile.outputContract, 280),
      monthlyReviewRule: cleanText(rawProfile.monthlyReviewRule, fallbackProfile.monthlyReviewRule, 280),
      updatedAt: now,
    });
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
  const baseModelOptions = [
    ...OFFICIAL_LLM_PRICING.map((pricing) => ({
      provider: pricing.provider,
      model: pricing.model,
      label: `${modelDisplayLabel(pricing.model)} · 입력 ${formatUsd(pricing.inputUsdPerMillionTokens)} / 출력 ${formatUsd(pricing.outputUsdPerMillionTokens)}`,
    })),
    {
      provider: "deterministic" as const,
      model: "deterministic-fallback",
      label: "규칙 기반 대체 · 과금 없음",
    },
  ];
  const optionKeys = new Set(baseModelOptions.map((option) => `${option.provider}:${option.model}`));
  const configuredModelOptions = input.settings.characterProfiles
    .filter((profile) => !optionKeys.has(`${profile.provider}:${profile.model}`))
    .map((profile) => ({
      provider: profile.provider,
      model: profile.model,
      label: `${providerLabel(profile.provider)} ${modelDisplayLabel(profile.model)} · 직접 설정`,
    }));

  return {
    settings: input.settings,
    monthLabel: formatMonthLabel(generatedAt),
    modelUsageRows,
    explorationPolicy: explorationPolicyView,
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
    modelOptions: [...baseModelOptions, ...configuredModelOptions],
    sourceNote: "월별 사용량은 저장된 AI 실행 기록의 입력/출력 토큰과 공식 모델 단가 기준 예상금액으로 계산합니다.",
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
      model: modelDisplayLabel(row.model),
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

function enrichCharacterExplorationGuidance(profile: AiCharacterProfileSettings): AiCharacterProfileSettings {
  const guidance = explorationProfileGuidance[profile.id];

  return {
    ...profile,
    roleModel: appendGuidance(profile.roleModel, guidance.roleModel),
    responsibility: appendGuidance(profile.responsibility, guidance.responsibility),
    outputContract: appendGuidance(profile.outputContract, guidance.outputContract),
    monthlyReviewRule: appendGuidance(profile.monthlyReviewRule, guidance.monthlyReviewRule),
  };
}

function appendGuidance(value: string, guidance: string): string {
  if (!guidance || value.includes(guidance)) {
    return value;
  }

  return `${value} ${guidance}`.trim();
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
    gemini: "제미나이",
    openai: "오픈AI",
    local: "로컬",
  };

  return labels[provider] ?? provider;
}

function modelDisplayLabel(model: string): string {
  const labels: Record<string, string> = {
    "gemini-3.5-flash": "제미나이 3.5 빠른 모델",
    "gemini-3.1-flash-lite": "제미나이 3.1 경량 모델",
    "deterministic-fallback": "규칙 기반 대체",
  };

  return labels[model] ?? model;
}

function localizePeopleOfficeText(value: string): string {
  return value
    .replaceAll("Chief of Staff", "대표 비서실장")
    .replaceAll("Performance Marketer", "광고 성과 담당자")
    .replaceAll("Merchandiser", "상품 기획자")
    .replaceAll("Creative Strategist", "콘텐츠 전략가")
    .replaceAll("Lifecycle Marketer", "재구매 관리 담당자")
    .replaceAll("FP&A Controller", "손익 관리 담당자")
    .replaceAll("BI Analyst", "데이터 감사 담당자")
    .replaceAll("CRM 담당자", "고객 관리 담당자");
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
