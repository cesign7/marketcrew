import type { ApprovalRequest, ExecutionScopeProposal, ExecutionScopeSelection, SeasonalKeywordAdPlan } from "../domain";

type SearchAdScopePlanInput = {
  bidCap?: number;
  dailyBudgetCap?: number;
  keywordSet?: {
    negativeCandidates?: Array<{ keyword: string }>;
  };
};

export function buildSearchAdKeywordExecutionScopeProposal(
  eventName: string,
  plan: Pick<SeasonalKeywordAdPlan, "bidCap" | "dailyBudgetCap" | "keywordSet"> | SearchAdScopePlanInput,
): ExecutionScopeProposal {
  const budgetLabel = plan.dailyBudgetCap
    ? `일예산 ${plan.dailyBudgetCap.toLocaleString("ko-KR")}원`
    : "일예산은 대표가 직접 입력";
  const bidLabel = plan.bidCap ? `입찰 상한 ${plan.bidCap.toLocaleString("ko-KR")}원` : "입찰 상한은 대표가 직접 입력";
  const negativeKeywordLabel =
    plan.keywordSet?.negativeCandidates && plan.keywordSet.negativeCandidates.length > 0
      ? plan.keywordSet.negativeCandidates.map((candidate) => candidate.keyword).join(", ")
      : "제외 키워드 후보 없음";

  return {
    title: `${eventName} 키워드 테스트 실행 범위`,
    summary:
      "AI가 네이버 키워드광고 초안 기준으로 광고 유형, 적용 위치, 기기, 시간대, 예산, 제외 키워드를 먼저 제안합니다. 대표는 그대로 확정하거나 결재 전 수정값을 남길 수 있습니다.",
    fields: [
      {
        id: "ad-product",
        label: "광고 유형",
        recommendedValue: "네이버 키워드광고",
        options: ["네이버 키워드광고", "쇼핑검색광고 검토", "상품/CRM 내부 초안만"],
        reason: "선물카드 시즌 수요는 검색 의도가 직접적이므로 우선 키워드광고 소액 테스트로 검증합니다.",
        required: true,
      },
      {
        id: "apply-target",
        label: "적용 위치",
        recommendedValue: "신규 테스트 광고그룹",
        options: ["신규 테스트 광고그룹", "기존 시즌 광고그룹에 키워드 추가", "외부 반영 없이 내부 초안만 확정"],
        reason: "기존 운영 광고와 섞지 않고 이벤트 성과를 별도 측정하기 위한 범위입니다.",
        required: true,
      },
      {
        id: "device",
        label: "기기/매체",
        recommendedValue: "모바일 우선 + PC 소액 병행",
        options: ["모바일 우선 + PC 소액 병행", "모바일만", "PC만", "PC/모바일 동일 테스트"],
        reason: "검색광고 광고그룹에는 PC/모바일 가중치와 비즈채널 구분이 있어 실제 반영 전 선택이 필요합니다.",
        required: true,
      },
      {
        id: "time-window",
        label: "시간대",
        recommendedValue: "전체 시간 소액 테스트",
        options: ["전체 시간 소액 테스트", "오전/오후 분리 확인", "저녁 시간대 우선", "영업시간만 집행"],
        reason: "현재 시간대별 전환 근거가 충분하지 않아 첫 집행은 넓게 보되 성과 확인 때 분리합니다.",
        required: true,
      },
      {
        id: "budget-bid",
        label: "예산/입찰",
        recommendedValue: `${budgetLabel} · ${bidLabel}`,
        options: [
          `${budgetLabel} · ${bidLabel}`,
          "일예산 10,000원 · 입찰 상한 500원",
          "일예산 50,000원 · 입찰 상한 1,200원",
          "예산 보류 후 재상신",
        ],
        reason: "소액 테스트 범위 안에서 예산 상한과 입찰 상한을 동시에 잠가 과지출을 막습니다.",
        required: true,
      },
      {
        id: "negative-keywords",
        label: "제외 키워드",
        recommendedValue: negativeKeywordLabel,
        options: [negativeKeywordLabel, "제외 키워드 없이 테스트", "제외 키워드 추가 검토 후 반영"],
        reason: "무료 이미지, 단순 정보성 검색처럼 구매 의도가 약한 유입을 먼저 줄이기 위한 후보입니다.",
        required: false,
      },
    ],
    guardrails: [
      "외부 쓰기 게이트가 열려야 실제 광고 계정에 반영",
      "대표가 수정한 실행 범위는 결정 기록에 남김",
      "성과 체크포인트에서 기기/시간대별 후속 판단",
    ],
  };
}

export function buildExecutionScopeProposalForApproval(approval: ApprovalRequest): ExecutionScopeProposal | undefined {
  if (approval.executionPlan.executionScopeProposal) {
    return approval.executionPlan.executionScopeProposal;
  }

  if (["SEARCH_AD_KEYWORD", "SEARCH_AD_BID_BUDGET"].includes(approval.executionPlan.workType)) {
    return buildSearchAdKeywordExecutionScopeProposal(inferEventName(approval), {
      bidCap: readNumberField(approval.executionPlan.afterState, "bidCap"),
      dailyBudgetCap: readNumberField(approval.executionPlan.afterState, "dailyBudgetCap"),
      keywordSet: {
        negativeCandidates: readNegativeKeywordCandidates(approval.executionPlan.afterState),
      },
    });
  }

  return buildInternalExecutionScopeProposal(approval);
}

export function buildDefaultExecutionScopeSelection(proposal: ExecutionScopeProposal): ExecutionScopeSelection {
  return {
    proposalTitle: proposal.title,
    selections: proposal.fields.map((field) => ({
      fieldId: field.id,
      label: field.label,
      value: field.recommendedValue,
    })),
  };
}

function inferEventName(approval: ApprovalRequest): string {
  const eventName = approval.title.match(/^(.+?)\s+/)?.[1];
  return eventName && eventName.length > 0 ? eventName : "검색광고";
}

function buildInternalExecutionScopeProposal(approval: ApprovalRequest): ExecutionScopeProposal {
  const channelLabel = readStringField(approval.executionPlan.beforeState, "provider") ?? inferChannelLabel(approval);
  const nextAction = readStringField(approval.executionPlan.afterState, "nextAction") ?? "내부 초안 정리";
  const ownerLabel = workTypeLabel(approval.executionPlan.workType);
  const measurementLabel = approval.executionPlan.measurementPlan.checkpoints
    .slice(0, 3)
    .map((checkpoint) => checkpoint.label)
    .join(" / ");

  return {
    title: `${approval.title} 실행 범위`,
    summary:
      "AI가 내부 업무 초안 기준으로 적용 채널, 실행 방식, 담당 범위, 외부 반영 경계, 성과 확인 범위를 먼저 제안합니다. 대표는 그대로 확정하거나 결재 전 수정값을 남길 수 있습니다.",
    fields: [
      {
        id: "work-target",
        label: "적용 채널",
        recommendedValue: channelLabel,
        options: Array.from(new Set([channelLabel, "전체 채널", "스마트스토어(스티커씨)", "쇼핑몰(커피프린트)"])),
        reason: "기존 수집 근거가 어느 채널에서 나온 안건인지 먼저 고정합니다.",
        required: true,
      },
      {
        id: "apply-mode",
        label: "적용 방식",
        recommendedValue: "내부 초안 확정",
        options: ["내부 초안 확정", "추가 근거 요청 후 재상신", "수정안 작성 후 재상신"],
        reason: "현재 단계는 외부 계정에 쓰지 않고 내부 업무 방향을 확정하는 범위입니다.",
        required: true,
      },
      {
        id: "owner-scope",
        label: "담당 범위",
        recommendedValue: ownerLabel,
        options: Array.from(new Set([ownerLabel, "모아 재검토", "데이 근거 점검", "담당 캐릭터 후속 업무"])),
        reason: "대표 결정 뒤 어느 성격의 업무로 내려갈지 정합니다.",
        required: true,
      },
      {
        id: "work-detail",
        label: "작업 내용",
        recommendedValue: nextAction,
        options: Array.from(new Set([nextAction, "상품/키워드 후보 재정리", "고객군/재구매 초안 정리", "근거 보강 후 보류"])),
        reason: "AI가 제안한 다음 작업을 대표가 그대로 둘지 좁힐지 선택합니다.",
        required: true,
      },
      {
        id: "write-boundary",
        label: "외부 반영",
        recommendedValue: "외부 반영 없음",
        options: ["외부 반영 없음", "대표 재결재 후 외부 반영 검토"],
        reason: "스마트스토어, 쇼핑몰, 광고 계정에는 별도 write gate 전까지 쓰지 않습니다.",
        required: true,
      },
      {
        id: "measurement",
        label: "성과 확인",
        recommendedValue: measurementLabel ? `${measurementLabel} 체크포인트` : "성과 확인 일정 없음",
        options: Array.from(new Set([measurementLabel ? `${measurementLabel} 체크포인트` : "성과 확인 일정 없음", "D+7만 확인", "D+30까지 확인"])),
        reason: "초안 확정 뒤에도 성과 확인 일정은 남겨 후속 판단에 연결합니다.",
        required: false,
      },
    ],
    guardrails: [
      "기존 저장 안건에는 소급 적용 내역을 남김",
      "외부 반영은 별도 결재와 write gate 전까지 없음",
      "대표 수정값은 결정 기록에 저장",
    ],
  };
}

function workTypeLabel(workType: ApprovalRequest["executionPlan"]["workType"]): string {
  const labels: Record<ApprovalRequest["executionPlan"]["workType"], string> = {
    INTERNAL_TASK: "내부 업무",
    SEARCH_AD_KEYWORD: "검색광고 키워드",
    SEARCH_AD_BID_BUDGET: "검색광고 예산/입찰",
    CREATIVE_DRAFT: "문안 초안",
    PRODUCT_DRAFT: "상품/키워드 초안",
    CRM_DRAFT: "고객 관리 초안",
  };

  return labels[workType];
}

function inferChannelLabel(approval: ApprovalRequest): string {
  if (approval.title.includes("스마트스토어")) {
    return "스마트스토어(스티커씨)";
  }
  if (approval.title.includes("자체몰") || approval.title.includes("영카트") || approval.title.includes("커피프린트")) {
    return "쇼핑몰(커피프린트)";
  }

  return "전체 채널";
}

function readStringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawValue = value[key];
  return typeof rawValue === "string" && rawValue.length > 0 ? rawValue : undefined;
}

function readNumberField(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const rawValue = value[key];
  return typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : undefined;
}

function readNegativeKeywordCandidates(value: unknown): Array<{ keyword: string }> {
  if (!isRecord(value) || !Array.isArray(value.negativeCandidates)) {
    return [];
  }

  return value.negativeCandidates
    .filter((candidate): candidate is { keyword: string } => isRecord(candidate) && typeof candidate.keyword === "string")
    .map((candidate) => ({ keyword: candidate.keyword }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
