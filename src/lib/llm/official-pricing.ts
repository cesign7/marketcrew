export type OfficialLlmPricing = {
  provider: "gemini";
  providerLabel: string;
  model: string;
  displayName: string;
  tierLabel: string;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  contextCacheUsdPerMillionTokens?: number;
  sourceLabel: string;
  sourceUrl: string;
  checkedAt: string;
  note: string;
};

export const OFFICIAL_LLM_PRICING: OfficialLlmPricing[] = [
  {
    provider: "gemini",
    providerLabel: "구글 제미나이",
    model: "gemini-3.5-flash",
    displayName: "제미나이 3.5 빠른 모델",
    tierLabel: "표준 유료 구간",
    inputUsdPerMillionTokens: 1.5,
    outputUsdPerMillionTokens: 9,
    contextCacheUsdPerMillionTokens: 0.15,
    sourceLabel: "구글 AI 공식 가격표",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing?hl=en",
    checkedAt: "2026-05-23",
    note: "출력 단가는 추론 토큰을 포함한 기준입니다.",
  },
  {
    provider: "gemini",
    providerLabel: "구글 제미나이",
    model: "gemini-3.1-flash-lite",
    displayName: "제미나이 3.1 경량 모델",
    tierLabel: "표준 유료 구간",
    inputUsdPerMillionTokens: 0.25,
    outputUsdPerMillionTokens: 1.5,
    contextCacheUsdPerMillionTokens: 0.025,
    sourceLabel: "구글 AI 공식 가격표",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing?hl=en",
    checkedAt: "2026-05-23",
    note: "텍스트/이미지/비디오 입력 기준입니다. 오디오 입력은 별도 단가입니다.",
  },
];

export function resolveOfficialLlmPricing(provider: string, model: string): OfficialLlmPricing | undefined {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = model.toLowerCase();

  return OFFICIAL_LLM_PRICING.find(
    (pricing) => pricing.provider === normalizedProvider && pricing.model.toLowerCase() === normalizedModel,
  );
}

export function formatUsdPerMillionTokens(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })}`;
}
