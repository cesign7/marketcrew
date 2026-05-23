import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalPreviewPanel } from "../../src/components/agenda-room/ApprovalPreviewPanel";
import type { ApprovalPreviewView } from "../../src/features/agenda-room/types";

describe("ApprovalPreviewPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("같은 연동 근거 문구가 반복돼도 React key 경고를 내지 않는다", () => {
    const duplicateProviderLabel = "스마트스토어(스티커씨) · 동기화 완료 · 스티커씨 주문 100건, 스티커씨 매출 600,120원";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderToString(
      createElement(ApprovalPreviewPanel, {
        previews: [
          buildPreview({
            id: "approval-duplicate-provider-a",
            title: "중복 근거 안건 A",
            providerEvidenceLabels: [duplicateProviderLabel, duplicateProviderLabel],
          }),
          buildPreview({
            id: "approval-duplicate-provider-b",
            title: "중복 근거 안건 B",
            providerEvidenceLabels: [duplicateProviderLabel],
          }),
        ],
      }),
    );

    const keyWarnings = [...consoleError.mock.calls, ...consoleWarn.mock.calls]
      .map((args) => args.join(" "))
      .filter((message) => message.includes("same key") || message.includes("unique key"));
    expect(keyWarnings).toEqual([]);
  });

  it("AI가 제안한 실행 범위를 카드 안에 표시한다", () => {
    const html = renderToString(
      createElement(ApprovalPreviewPanel, {
        previews: [
          buildPreview({
            id: "approval-scope",
            title: "실행 범위 안건",
            providerEvidenceLabels: ["연동 근거"],
          }),
        ],
      }),
    );

    expect(html).toContain("AI 제안 실행 범위");
    expect(html).toContain("네이버 키워드광고");
    expect(html).toContain("모바일 우선 + PC 소액 병행");
  });
});

function buildPreview({
  id,
  title,
  providerEvidenceLabels,
}: {
  id: string;
  title: string;
  providerEvidenceLabels: string[];
}): ApprovalPreviewView {
  return {
    id,
    title,
    statusLabel: "대표 승인 대기",
    confidenceLabel: "신뢰 높음",
    riskLabel: "위험 낮음",
    evidenceSummary: "연동 수집 근거를 확인했습니다.",
    diffSummary: "키워드 2개를 추가합니다.",
    beforeItems: ["키워드 없음", "키워드 없음"],
    afterItems: ["일예산 30,000원", "일예산 30,000원"],
    rollbackPlan: "승인 전 상태로 되돌립니다.",
    measurementLabels: ["7일 후 매출", "30일 후 전환율"],
    executorLabel: "그로",
    writeGateLabel: "외부 반영 잠금",
    primaryActionLabel: "확인 후 내부 반영",
    secondaryActions: ["보류", "보류"],
    executionScopeProposal: {
      title: "부처님오신날 키워드 테스트 실행 범위",
      summary: "대표가 그대로 확정하거나 수정할 수 있습니다.",
      fields: [
        {
          id: "ad-product",
          label: "광고 유형",
          recommendedValue: "네이버 키워드광고",
          options: ["네이버 키워드광고"],
          reason: "검색 의도가 직접적입니다.",
          required: true,
        },
        {
          id: "device",
          label: "기기/매체",
          recommendedValue: "모바일 우선 + PC 소액 병행",
          options: ["모바일 우선 + PC 소액 병행", "모바일만"],
          reason: "기기별 성과를 나눠 봅니다.",
          required: true,
        },
      ],
      guardrailLabels: ["외부 반영 잠금 확인"],
    },
    provenance: {
      summaryLabel: "근거 2개 · 실행 이력 1개 · 연동 수집 2개",
      evidenceLabels: ["매출 근거", "매출 근거"],
      agentRunLabels: ["모아 계획 · 완료 · 120토큰"],
      providerEvidenceLabels,
      checkpointLabels: ["7일 후 확인"],
      safetyLabels: ["원천 행 제외", "원천 행 제외"],
    },
  };
}
