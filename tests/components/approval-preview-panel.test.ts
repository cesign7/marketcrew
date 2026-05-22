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
