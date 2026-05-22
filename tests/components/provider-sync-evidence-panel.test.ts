import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderSyncEvidencePanel } from "../../src/components/agenda-room/ProviderSyncEvidencePanel";
import { getProviderHistoryPolicy } from "../../src/lib/domain";
import type { ProviderSyncEvidenceView } from "../../src/features/agenda-room/types";

describe("ProviderSyncEvidencePanel", () => {
  it("데이터 연동 화면에서는 API 조회 한계와 저장 기준을 함께 보여준다", () => {
    const html = renderToString(
      createElement(ProviderSyncEvidencePanel, {
        reports: [buildSmartstoreEvidence()],
        showHistoryPolicy: true,
      }),
    );

    expect(html).toContain("변경 주문 24시간 창");
    expect(html).toContain("상품주문번호 묶음 단위");
    expect(html).toContain("AI에는 상품별 매출/주문 요약");
  });
});

function buildSmartstoreEvidence(): ProviderSyncEvidenceView {
  return {
    id: "provider-sync-smartstore-test",
    label: "스마트스토어 읽기 전용 수집",
    providerKey: "smartstore",
    providerGroup: "commerce",
    channelKey: "smartstore-stickersee",
    channelLabel: "스마트스토어(스티커씨)",
    brandLabel: "스티커씨",
    providerLabel: "스마트스토어(스티커씨)",
    statusLabel: "동기화 완료",
    tone: "ready",
    checkedAt: "2026-05-22 11:00",
    endpointLabel: "https://api.commerce.naver.com/order",
    httpStatusLabel: "응답 200",
    readOnlyLabel: "읽기 전용",
    networkLabel: "실제 조회",
    writeLabel: "쓰기 시도 없음",
    evidenceCountLabel: "근거 3개",
    snapshotLabels: ["스티커씨 주문 100건"],
    missingEnvKeys: [],
    notes: ["집계만 저장"],
    sourceUrl: "https://github.com/commerce-api-naver/commerce-api/discussions/1875",
    historyPolicy: getProviderHistoryPolicy("smartstore"),
  };
}
