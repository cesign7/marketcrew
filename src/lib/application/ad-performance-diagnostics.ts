import type { CharacterKey, DataConfidence, SearchAdPerformanceSnapshot, ShoppingSearchAdPerformanceSnapshot } from "../domain";

export type AdPerformanceDiagnosisKind =
  | "CLICKS_NO_ORDER"
  | "LOW_CVR"
  | "HIGH_CPA"
  | "DEVICE_GAP"
  | "TIME_SLOT_GAP"
  | "TRACKING_UNVERIFIED"
  | "SHOPPING_SEARCH_NO_ORDER"
  | "SHOPPING_SEARCH_LOW_DIRECT_CVR";

export type AdPerformanceDiagnosis = {
  id: string;
  kind: AdPerformanceDiagnosisKind;
  character: CharacterKey;
  brandKey: string;
  keyword: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  dataConfidence: DataConfidence;
  summary: string;
  recommendedAction: string;
  evidenceIds: string[];
  createdAt: string;
};

export type AdPerformanceThresholds = {
  minClicks: number;
  minCost: number;
  lowCvr: number;
  highCpaMultiplier: number;
  minSegmentClicks: number;
  segmentGapRatio: number;
};

const DEFAULT_THRESHOLDS: AdPerformanceThresholds = {
  minClicks: 30,
  minCost: 10000,
  lowCvr: 0.01,
  highCpaMultiplier: 1.5,
  minSegmentClicks: 30,
  segmentGapRatio: 0.6,
};

export function buildAdPerformanceDiagnoses(input: {
  snapshots: SearchAdPerformanceSnapshot[];
  shoppingSnapshots?: ShoppingSearchAdPerformanceSnapshot[];
  generatedAt: string;
  thresholds?: Partial<AdPerformanceThresholds>;
}): AdPerformanceDiagnosis[] {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(input.thresholds ?? {}) };
  const diagnoses: AdPerformanceDiagnosis[] = [];

  for (const snapshot of input.snapshots) {
    if (snapshot.clicks < thresholds.minClicks && snapshot.cost < thresholds.minCost) {
      continue;
    }

    if (!snapshot.trackingVerified) {
      diagnoses.push(buildTrackingUnverifiedDiagnosis(snapshot, input.generatedAt));
      continue;
    }

    if ((snapshot.clicks >= thresholds.minClicks || snapshot.cost >= thresholds.minCost) && snapshot.conversions === 0) {
      diagnoses.push(buildClicksNoOrderDiagnosis(snapshot, input.generatedAt));
      continue;
    }

    const cvr = conversionRate(snapshot);
    if (snapshot.clicks >= thresholds.minClicks && cvr < thresholds.lowCvr) {
      diagnoses.push(buildLowCvrDiagnosis(snapshot, input.generatedAt, cvr));
    }

    const cpa = costPerAcquisition(snapshot);
    if (snapshot.targetCpa && cpa && cpa > snapshot.targetCpa * thresholds.highCpaMultiplier) {
      diagnoses.push(buildHighCpaDiagnosis(snapshot, input.generatedAt, cpa));
    }
  }

  diagnoses.push(...buildSegmentGapDiagnoses(input.snapshots, input.generatedAt, thresholds, "device"));
  diagnoses.push(...buildSegmentGapDiagnoses(input.snapshots, input.generatedAt, thresholds, "timeSlot"));
  diagnoses.push(...buildShoppingSearchDiagnoses(input.shoppingSnapshots ?? [], input.generatedAt, thresholds));

  return dedupeDiagnoses(diagnoses);
}

function buildTrackingUnverifiedDiagnosis(snapshot: SearchAdPerformanceSnapshot, createdAt: string): AdPerformanceDiagnosis {
  return {
    id: `ad-diagnosis-tracking-${snapshot.id}`,
    kind: "TRACKING_UNVERIFIED",
    character: "day",
    brandKey: snapshot.brandKey,
    keyword: snapshot.keyword,
    severity: "MEDIUM",
    dataConfidence: "AD_TRACKING_UNVERIFIED",
    summary: `${snapshot.keyword} 키워드는 클릭 ${snapshot.clicks.toLocaleString("ko-KR")}회와 비용 ${snapshot.cost.toLocaleString(
      "ko-KR",
    )}원이 있지만 전환 추적 확인이 필요합니다.`,
    recommendedAction: "데이가 전환 추적, 주문 연결, 기기/시간대 집계 누락 여부를 먼저 확인합니다.",
    evidenceIds: [snapshot.id],
    createdAt,
  };
}

function buildClicksNoOrderDiagnosis(snapshot: SearchAdPerformanceSnapshot, createdAt: string): AdPerformanceDiagnosis {
  return {
    id: `ad-diagnosis-no-order-${snapshot.id}`,
    kind: "CLICKS_NO_ORDER",
    character: "gro",
    brandKey: snapshot.brandKey,
    keyword: snapshot.keyword,
    severity: "HIGH",
    dataConfidence: "READY_TO_APPROVE",
    summary: `${snapshot.keyword} 키워드는 최근 ${snapshot.windowDays}일 클릭 ${snapshot.clicks.toLocaleString(
      "ko-KR",
    )}회, 비용 ${snapshot.cost.toLocaleString("ko-KR")}원인데 주문이 없습니다.`,
    recommendedAction: "그로가 일시중지, 입찰 하향, 제외 키워드 후보, 랜딩 점검 중 하나로 조정안을 올립니다.",
    evidenceIds: [snapshot.id],
    createdAt,
  };
}

function buildLowCvrDiagnosis(snapshot: SearchAdPerformanceSnapshot, createdAt: string, cvr: number): AdPerformanceDiagnosis {
  return {
    id: `ad-diagnosis-low-cvr-${snapshot.id}`,
    kind: "LOW_CVR",
    character: "gro",
    brandKey: snapshot.brandKey,
    keyword: snapshot.keyword,
    severity: "MEDIUM",
    dataConfidence: "READY_TO_APPROVE",
    summary: `${snapshot.keyword} 키워드는 전환율 ${formatPercent(cvr)}로 기준보다 낮습니다.`,
    recommendedAction: "그로가 입찰 하향 또는 랜딩/문구 점검 요청을 상신합니다.",
    evidenceIds: [snapshot.id],
    createdAt,
  };
}

function buildHighCpaDiagnosis(snapshot: SearchAdPerformanceSnapshot, createdAt: string, cpa: number): AdPerformanceDiagnosis {
  return {
    id: `ad-diagnosis-high-cpa-${snapshot.id}`,
    kind: "HIGH_CPA",
    character: "gro",
    brandKey: snapshot.brandKey,
    keyword: snapshot.keyword,
    severity: "HIGH",
    dataConfidence: "READY_TO_APPROVE",
    summary: `${snapshot.keyword} 키워드는 CPA ${Math.round(cpa).toLocaleString("ko-KR")}원으로 목표 CPA ${(
      snapshot.targetCpa ?? 0
    ).toLocaleString("ko-KR")}원을 초과했습니다.`,
    recommendedAction: "그로가 입찰가 하향, 예산 축소, 전환 좋은 키워드로 예산 이동안을 올립니다.",
    evidenceIds: [snapshot.id],
    createdAt,
  };
}

function buildSegmentGapDiagnoses(
  snapshots: SearchAdPerformanceSnapshot[],
  createdAt: string,
  thresholds: AdPerformanceThresholds,
  segmentKey: "device" | "timeSlot",
): AdPerformanceDiagnosis[] {
  const eligibleSnapshots = snapshots.filter(
    (snapshot) => snapshot.trackingVerified && snapshot.clicks >= thresholds.minSegmentClicks && segmentValue(snapshot, segmentKey),
  );
  const grouped = groupBy(eligibleSnapshots, (snapshot) => `${snapshot.brandKey}:${snapshot.campaignName}:${snapshot.adGroupName}:${snapshot.keyword}`);
  const diagnoses: AdPerformanceDiagnosis[] = [];

  for (const group of grouped.values()) {
    const segmentValues = new Set(group.map((snapshot) => segmentValue(snapshot, segmentKey)));
    if (segmentValues.size < 2) {
      continue;
    }

    const sorted = group.slice().sort((left, right) => conversionRate(right) - conversionRate(left));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestCvr = conversionRate(best);
    const worstCvr = conversionRate(worst);
    if (bestCvr <= 0 || worstCvr / bestCvr > thresholds.segmentGapRatio) {
      continue;
    }

    diagnoses.push({
      id: `ad-diagnosis-${segmentKey}-gap-${worst.id}`,
      kind: segmentKey === "device" ? "DEVICE_GAP" : "TIME_SLOT_GAP",
      character: "gro",
      brandKey: worst.brandKey,
      keyword: worst.keyword,
      severity: "MEDIUM",
      dataConfidence: "READY_TO_APPROVE",
      summary: `${worst.keyword} 키워드는 ${segmentLabel(segmentKey, worst)} 전환율 ${formatPercent(
        worstCvr,
      )}가 ${segmentLabel(segmentKey, best)} ${formatPercent(bestCvr)}보다 낮습니다.`,
      recommendedAction:
        segmentKey === "device"
          ? "그로가 PC/모바일 가중치 조정 또는 분리 집행안을 올립니다."
          : "그로가 저성과 시간대 제외 또는 예산 집중 시간대 조정안을 올립니다.",
      evidenceIds: [best.id, worst.id],
      createdAt,
    });
  }

  return diagnoses;
}

function buildShoppingSearchDiagnoses(
  snapshots: ShoppingSearchAdPerformanceSnapshot[],
  createdAt: string,
  thresholds: AdPerformanceThresholds,
): AdPerformanceDiagnosis[] {
  const diagnoses: AdPerformanceDiagnosis[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.clicks < thresholds.minClicks && snapshot.cost < thresholds.minCost) {
      continue;
    }

    if (snapshot.directConversionRate <= 0) {
      diagnoses.push({
        id: `ad-diagnosis-shopping-no-order-${snapshot.id}`,
        kind: "SHOPPING_SEARCH_NO_ORDER",
        character: "gro",
        brandKey: snapshot.brandKey,
        keyword: snapshot.searchKeyword,
        severity: "HIGH",
        dataConfidence: "READY_TO_APPROVE",
        summary: `${snapshot.searchKeyword} 쇼핑검색어는 최근 30일 클릭 ${snapshot.clicks.toLocaleString(
          "ko-KR",
        )}회, 비용 ${snapshot.cost.toLocaleString("ko-KR")}원인데 직접 전환율이 0%입니다.`,
        recommendedAction: "그로가 상품 노출 제외, 입찰 하향, 상품명/썸네일/랜딩 점검안을 올립니다.",
        evidenceIds: [snapshot.id],
        createdAt,
      });
      continue;
    }

    if (snapshot.clicks >= thresholds.minClicks && snapshot.directConversionRate < thresholds.lowCvr) {
      diagnoses.push({
        id: `ad-diagnosis-shopping-low-cvr-${snapshot.id}`,
        kind: "SHOPPING_SEARCH_LOW_DIRECT_CVR",
        character: "gro",
        brandKey: snapshot.brandKey,
        keyword: snapshot.searchKeyword,
        severity: "MEDIUM",
        dataConfidence: "READY_TO_APPROVE",
        summary: `${snapshot.searchKeyword} 쇼핑검색어는 직접 전환율 ${formatPercent(
          snapshot.directConversionRate,
        )}로 기준보다 낮습니다.`,
        recommendedAction: "그로가 입찰 하향, 상품 노출 조건 조정, 전환 좋은 검색어 집중안을 올립니다.",
        evidenceIds: [snapshot.id],
        createdAt,
      });
    }
  }

  return diagnoses;
}

function dedupeDiagnoses(diagnoses: AdPerformanceDiagnosis[]): AdPerformanceDiagnosis[] {
  const seen = new Set<string>();
  const deduped: AdPerformanceDiagnosis[] = [];
  for (const diagnosis of diagnoses) {
    const key = `${diagnosis.kind}:${diagnosis.evidenceIds.join("|")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(diagnosis);
  }

  return deduped;
}

function segmentValue(snapshot: SearchAdPerformanceSnapshot, key: "device" | "timeSlot"): string | undefined {
  return key === "device" ? snapshot.device : snapshot.timeSlot;
}

function segmentLabel(key: "device" | "timeSlot", snapshot: SearchAdPerformanceSnapshot): string {
  return key === "device" ? deviceLabel(snapshot.device) : snapshot.timeSlot ?? "시간대 미지정";
}

function deviceLabel(device: SearchAdPerformanceSnapshot["device"]): string {
  const labels: Record<SearchAdPerformanceSnapshot["device"], string> = {
    PC: "PC",
    MOBILE: "모바일",
    ALL: "전체",
  };

  return labels[device];
}

function conversionRate(snapshot: SearchAdPerformanceSnapshot): number {
  return snapshot.clicks > 0 ? snapshot.conversions / snapshot.clicks : 0;
}

function costPerAcquisition(snapshot: SearchAdPerformanceSnapshot): number | undefined {
  return snapshot.conversions > 0 ? snapshot.cost / snapshot.conversions : undefined;
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function groupBy<TItem>(items: TItem[], keyFn: (item: TItem) => string): Map<string, TItem[]> {
  const groups = new Map<string, TItem[]>();
  for (const item of items) {
    const key = keyFn(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}
