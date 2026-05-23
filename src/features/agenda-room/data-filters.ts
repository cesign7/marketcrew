import type {
  AiEvidenceBriefView,
  ProviderDataContractView,
  ProviderEvidenceExpansionPlanView,
  ProviderReadinessView,
  ProviderSyncEvidenceView,
} from "./types";

export type DataBusinessFilter = "all" | "stickersee" | "coffeeprint";
export type DataPeriodFilter = "today" | "7d" | "30d" | "last-year" | "holiday";

export function normalizeDataBusiness(value: string | undefined): DataBusinessFilter {
  if (value === "stickersee" || value === "coffeeprint") {
    return value;
  }

  return "all";
}

export function normalizeDataPeriod(value: string | undefined): DataPeriodFilter {
  if (value === "7d" || value === "30d" || value === "last-year" || value === "holiday") {
    return value;
  }

  return "today";
}

export function dataPeriodLabel(period: DataPeriodFilter): string {
  const labels: Record<DataPeriodFilter, string> = {
    today: "오늘",
    "7d": "최근 7일",
    "30d": "최근 30일",
    "last-year": "전년동기",
    holiday: "명절 기준",
  };

  return labels[period];
}

export function dataPeriodPolicyLabel(period: DataPeriodFilter): string {
  const labels: Record<DataPeriodFilter, string> = {
    today: "오늘 기준은 최신 수집 결과와 당일 집계 스냅샷을 우선합니다.",
    "7d": "7일 기준은 일별 스냅샷을 묶어 단기 변화를 봅니다.",
    "30d": "30일 기준은 현재 어댑터의 기본 운영 집계 범위입니다.",
    "last-year": "전년동기는 API 재조회보다 자체 저장 스냅샷을 우선하고, 부족하면 백필 필요로 표시합니다.",
    holiday: "명절 기준은 설날·추석 등 음력 이벤트를 연도별 양력 날짜로 변환해 같은 D-기간끼리 비교합니다.",
  };

  return labels[period];
}

export function filterProviderReadiness(
  providers: ProviderReadinessView[],
  selectedBusiness: DataBusinessFilter,
): ProviderReadinessView[] {
  if (selectedBusiness === "all") {
    return providers;
  }

  return providers.filter((provider) => {
    if (selectedBusiness === "stickersee") {
      return provider.id === "smartstore";
    }
    return provider.id === "shop";
  });
}

export function filterProviderSyncEvidence(
  reports: ProviderSyncEvidenceView[],
  selectedBusiness: DataBusinessFilter,
): ProviderSyncEvidenceView[] {
  if (selectedBusiness === "all") {
    return reports;
  }

  return reports.filter((report) => {
    if (selectedBusiness === "stickersee") {
      return report.channelKey === "smartstore-stickersee";
    }
    return report.channelKey === "shop-coffeeprint";
  });
}

export function filterProviderDataContracts(
  contracts: ProviderDataContractView[],
  selectedBusiness: DataBusinessFilter,
): ProviderDataContractView[] {
  if (selectedBusiness === "all") {
    return contracts;
  }

  return contracts.filter((contract) => {
    if (selectedBusiness === "stickersee") {
      return contract.providerKey === "smartstore";
    }
    return contract.providerKey === "shop";
  });
}

export function filterProviderEvidenceExpansionPlans(
  plans: ProviderEvidenceExpansionPlanView[],
  selectedBusiness: DataBusinessFilter,
): ProviderEvidenceExpansionPlanView[] {
  if (selectedBusiness === "all") {
    return plans;
  }

  return plans.filter((plan) => {
    const hasSharedMarketingEvidence = plan.providerKeys.some(
      (providerKey) => providerKey === "search_ad" || providerKey === "datalab",
    );

    if (selectedBusiness === "stickersee") {
      return hasSharedMarketingEvidence || plan.providerKeys.some((providerKey) => providerKey === "smartstore");
    }

    return hasSharedMarketingEvidence || plan.providerKeys.some((providerKey) => providerKey === "shop");
  });
}

export function filterAiEvidenceBriefs(
  briefs: AiEvidenceBriefView[],
  selectedBusiness: DataBusinessFilter,
): AiEvidenceBriefView[] {
  if (selectedBusiness === "all") {
    return briefs;
  }

  return briefs.filter((brief) => {
    if (selectedBusiness === "stickersee") {
      return brief.providerKey === "smartstore" || brief.providerKey === "search_ad";
    }

    return brief.providerKey === "shop";
  });
}
