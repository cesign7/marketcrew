import { describe, expect, it } from "vitest";
import { buildProviderSignalAgendaArtifacts } from "../../src/lib/application/provider-signal-agenda";
import type { ProviderSyncReport } from "../../src/lib/domain";

describe("buildProviderSignalAgendaArtifacts", () => {
  it("커머스/영카트 aggregate signal을 프로, 리피, 마루 안건으로 만든다", () => {
    const reports = buildSyncedProviderReports();
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: reports,
      signals: reports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])),
      generatedAt: "2026-05-22T02:00:00.000Z",
      moaSynthesisReportId: "moa-synthesis-sample-001",
    });

    expect(artifacts.agendaCandidates.map((candidate) => [candidate.character, candidate.title])).toEqual([
      ["pro", "스마트스토어 상위 상품 키워드 확장 안건"],
      ["ripi", "영카트 재구매 고객군 CRM 초안 안건"],
      ["maru", "스마트스토어/자체몰 매출 균형 점검 안건"],
    ]);
    expect(artifacts.approvalRequests).toHaveLength(3);
    expect(artifacts.approvalRequests.every((request) => request.status === "PENDING")).toBe(true);
    expect(artifacts.approvalRequests.every((request) => request.executionPlan.requiresWriteGate === false)).toBe(true);
    expect(artifacts.approvalRequests.map((request) => request.executionPlan.executorKey)).toEqual([
      "internal-product-opportunity-planner",
      "internal-crm-draft-planner",
      "internal-margin-channel-reviewer",
    ]);
    expect(artifacts.performanceCheckpoints).toHaveLength(15);
    expect(artifacts.characterReports.map((report) => report.character)).toEqual(["pro", "ripi", "maru"]);
  });

  it("성공한 aggregate snapshot이 없으면 안건을 만들지 않는다", () => {
    const artifacts = buildProviderSignalAgendaArtifacts({
      providerSyncReports: [
        {
          ...buildSyncedProviderReports()[0],
          status: "FAILED",
          commerceAggregateSnapshot: undefined,
          generatedSignal: undefined,
        },
      ],
      signals: [],
      generatedAt: "2026-05-22T02:00:00.000Z",
    });

    expect(artifacts.agendaCandidates).toEqual([]);
    expect(artifacts.approvalRequests).toEqual([]);
  });
});

function buildSyncedProviderReports(): ProviderSyncReport[] {
  return [
    {
      id: "provider-sync-smartstore-2026-05-22",
      provider: "smartstore",
      label: "네이버 커머스/스마트스토어 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses",
      sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only sync"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      commerceAggregateSnapshot: {
        id: "commerce-aggregate-STICKERSEE-2026-05-22",
        provider: "naver_commerce",
        brandKey: "STICKERSEE",
        windowDays: 30,
        paidOrderCount: 100,
        grossSales: 600120,
        topProductName: "생일축하스티커",
        dataSolutionAvailable: false,
        collectedAt: "2026-05-22T02:00:00.000Z",
        dataScope: "aggregate_only",
      },
      generatedSignal: {
        id: "signal-commerce-aggregate-stickersee-2026-05-22",
        source: "smartstore",
        signalType: "weekly_trend",
        entityType: "product",
        entityId: "STICKERSEE",
        title: "스마트스토어 주문 집계 동기화",
        currentValue: 600120,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["commerce-aggregate-STICKERSEE-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
    {
      id: "provider-sync-shop-2026-05-22",
      provider: "shop",
      label: "자체 쇼핑몰/영카트 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://shop.example.test/marketcrew-bridge.php?action=aggregate",
      sourceUrl: "integrations/youngcart-bridge/README.md",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only sync"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      shopAggregateSnapshot: {
        id: "shop-aggregate-youngcart-2026-05-22",
        provider: "youngcart_bridge",
        brandKey: "COFFEEPRINT",
        windowDays: 30,
        orderCount: 28,
        repeatCustomerCount: 4,
        grossSales: 4081900,
        averageOrderValue: 145782,
        collectedAt: "2026-05-22T02:00:00.000Z",
        dataScope: "aggregate_only",
      },
      generatedSignal: {
        id: "signal-shop-aggregate-coffeeprint-2026-05-22",
        source: "shop",
        signalType: "weekly_trend",
        entityType: "customer_segment",
        entityId: "COFFEEPRINT",
        title: "영카트 주문/재구매 집계 동기화",
        currentValue: 4,
        baselineValue: 28,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["shop-aggregate-youngcart-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
  ];
}
